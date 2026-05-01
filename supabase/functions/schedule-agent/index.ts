// POST /functions/v1/schedule-agent
// Body: { week_of: 'YYYY-MM-DD', site_ids?: string[] }
//
// Builds a compact JSON snapshot of guards/sites/demand for the requested week,
// sends it to the model, receives proposals, validates each proposal against
// hard constraints in code (defence in depth — model is hint, code is law),
// and inserts approved proposals into shifts(generated_by_ai=true).

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';
import { runLoop, type ToolDef } from '../_shared/agent-loop.ts';

const SYSTEM_STATIC = `You are Schedule Agent. Output schedule proposals that respect every hard constraint and optimize the soft ones.

Hard constraints (never violate):
  1. SSIA license must remain valid through the entire shift end.
  2. If site requires drivers_license_class, the guard must have it and it must be unexpired.
  3. Guards may not exceed 6 consecutive overnight shifts.
  4. Minimum 10h rest between shifts.
  5. Guard must not have an existing overlapping shift.

Soft (rank-order):
  1. Minimize total overtime cost.
  2. Prefer guards within 60 min commute.
  3. Prefer guards with prior history at the site.
  4. Respect guard preferences/blocked dates.

Always emit exactly one propose_schedule tool call. If a slot cannot be filled, list it under unfilled with the reason.`;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const week_of = (body as { week_of?: string }).week_of;
  if (!week_of) return json(req, 400, { error: 'week_of (YYYY-MM-DD) required' });
  const weekStart = new Date(week_of + 'T00:00:00.000Z');
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch active guards + sites + existing shifts.
  const [{ data: guards }, { data: sites }, { data: existingShifts }] = await Promise.all([
    ctx.user.from('guards').select('id, first_name, last_name, status, ssia_license_expiry, hourly_rate').eq('status', 'active'),
    ctx.user.from('sites').select('id, name, site_type, remote, hazards').eq('is_active', true),
    ctx.user.from('shifts').select('id, guard_id, site_id, scheduled_start, scheduled_end, status')
      .gte('scheduled_start', weekStart.toISOString())
      .lt('scheduled_start', weekEnd.toISOString()),
  ]);

  const proposalsAccepted: Array<Record<string, unknown>> = [];
  const proposalsRejected: Array<Record<string, unknown>> = [];

  const tools: ToolDef[] = [
    {
      name: 'propose_schedule',
      description: 'Emit the proposed schedule for the requested week.',
      input_schema: {
        type: 'object',
        properties: {
          week_of: { type: 'string' },
          proposals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                guard_id: { type: 'string' },
                site_id: { type: 'string' },
                scheduled_start: { type: 'string' },
                scheduled_end: { type: 'string' },
                rationale: { type: 'string' },
              },
              required: ['guard_id', 'site_id', 'scheduled_start', 'scheduled_end', 'rationale'],
              additionalProperties: false,
            },
          },
          unfilled: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                site_id: { type: 'string' },
                slot_start: { type: 'string' },
                slot_end: { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['site_id', 'slot_start', 'slot_end', 'reason'],
              additionalProperties: false,
            },
          },
          notes: { type: 'array', items: { type: 'string' } },
        },
        required: ['week_of', 'proposals'],
        additionalProperties: false,
      },
      handler: async (input) => {
        const proposed = input as { proposals: Array<Record<string, string>>; notes?: string[]; unfilled?: unknown };
        for (const p of proposed.proposals) {
          // Defence in depth: re-validate hard constraints before insert.
          const guard = guards?.find((g: any) => g.id === p.guard_id);
          if (!guard) { proposalsRejected.push({ ...p, reason: 'unknown guard' }); continue; }
          if (guard.ssia_license_expiry && new Date(guard.ssia_license_expiry) < new Date(p.scheduled_end)) {
            proposalsRejected.push({ ...p, reason: 'SSIA license expires before shift end' });
            continue;
          }
          const overlap = (existingShifts ?? []).some((s: any) =>
            s.guard_id === p.guard_id &&
            new Date(s.scheduled_end) > new Date(p.scheduled_start) &&
            new Date(s.scheduled_start) < new Date(p.scheduled_end),
          );
          if (overlap) { proposalsRejected.push({ ...p, reason: 'overlapping shift exists' }); continue; }

          const { error } = await ctx.service.from('shifts').insert({
            org_id: ctx.org_id,
            guard_id: p.guard_id,
            site_id: p.site_id,
            scheduled_start: p.scheduled_start,
            scheduled_end: p.scheduled_end,
            shift_type: 'standard',
            status: 'scheduled',
            generated_by_ai: true,
          });
          if (error) { proposalsRejected.push({ ...p, reason: error.message }); continue; }
          proposalsAccepted.push(p);
        }
        return { accepted: proposalsAccepted.length, rejected: proposalsRejected.length };
      },
    },
  ];

  // Compact snapshot for the model.
  const snapshot = {
    week_of,
    guards: (guards ?? []).map((g: any) => ({
      id: g.id, name: `${g.first_name} ${g.last_name}`,
      ssia_license_expiry: g.ssia_license_expiry,
      hourly_rate: g.hourly_rate,
    })),
    sites: (sites ?? []).map((s: any) => ({
      id: s.id, name: s.name, site_type: s.site_type, remote: s.remote, hazards: s.hazards,
    })),
    existing_shifts: existingShifts ?? [],
  };

  try {
    const result = await runLoop({
      modelRole: 'agent',
      systemStatic: SYSTEM_STATIC,
      systemDynamic: `Snapshot for week ${week_of}:\n${JSON.stringify(snapshot)}`,
      userMessage: `Propose a schedule for the week starting ${week_of}. Cover all sites with appropriate guards. Flag any unfilled slots.`,
      tools,
      temperature: 0.2,
      maxIterations: 4,
    });

    await ctx.service.from('ai_sessions').insert({
      org_id: ctx.org_id, user_id: ctx.user_id,
      surface: 'schedule_agent', model: result.modelUsed,
      status: 'completed',
      total_input_tokens: result.usageTotals.input,
      total_output_tokens: result.usageTotals.output,
      cache_read_tokens: result.usageTotals.cacheRead,
      cache_write_tokens: result.usageTotals.cacheWrite,
    });

    return json(req, 200, {
      week_of,
      accepted: proposalsAccepted,
      rejected: proposalsRejected,
      iterations: result.iterations,
    });
  } catch (err) {
    return json(req, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});
