// POST /functions/v1/forensic-search
// Body: { query: string }
// NL → search plan → executes a Postgres query (under RLS) → returns rows.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';
import { runLoop, type ToolDef } from '../_shared/agent-loop.ts';

const SYSTEM_STATIC = `You are Forensic Search. Translate the user's investigative question into a structured search plan over the StiggOS schema.

Tables you may query:
  • incidents         — has description_embedding for semantic match
  • shifts, tour_runs, tour_scans — time-and-place
  • lone_worker_checkins
  • camera_alerts
  • transport_runs / transport_custody_events
  • post_orders        — has body_embedding for semantic match

Always emit exactly one run_search tool call. If the query is ambiguous, set 'needs_clarification'.`;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const query = (body as { query?: string }).query;
  if (!query) return json(req, 400, { error: 'query required' });

  let plan: any = null;
  let resultRows: any[] = [];

  const tools: ToolDef[] = [
    {
      name: 'run_search',
      description: 'Run the planned forensic search.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          interpreted_filters: {
            type: 'object',
            properties: {
              tables: { type: 'array', items: { type: 'string' } },
              time_window: {
                type: 'object',
                properties: {
                  from_iso: { type: 'string' },
                  to_iso: { type: 'string' },
                  human: { type: 'string' },
                },
                required: ['human'],
                additionalProperties: false,
              },
              site_ids: { type: 'array', items: { type: 'string' } },
              guard_ids: { type: 'array', items: { type: 'string' } },
              severity_min: { type: 'string', enum: ['low','medium','high','critical'] },
              keywords: { type: 'array', items: { type: 'string' } },
              semantic_phrase: { type: 'string' },
            },
            required: ['tables', 'time_window'],
            additionalProperties: false,
          },
          needs_clarification: { type: 'string' },
        },
        required: ['query', 'interpreted_filters'],
        additionalProperties: false,
      },
      handler: async (input) => {
        plan = input;
        const f = (input as any).interpreted_filters;
        const tables: string[] = f.tables ?? [];
        const fromIso = f.time_window?.from_iso;
        const toIso = f.time_window?.to_iso;
        const sevMin = f.severity_min;

        // Run a real-but-conservative query over each requested table.
        // RLS scopes everything to ctx.org_id automatically.
        const all: any[] = [];

        if (tables.includes('incidents')) {
          let q = ctx.user.from('incidents').select('id, title, description, category, severity, status, occurred_at, site_id').limit(50).order('occurred_at', { ascending: false });
          if (fromIso) q = q.gte('occurred_at', fromIso);
          if (toIso) q = q.lte('occurred_at', toIso);
          if (sevMin) {
            const order = ['low','medium','high','critical'];
            const min = order.indexOf(sevMin);
            if (min >= 0) q = q.in('severity', order.slice(min));
          }
          const { data } = await q;
          (data ?? []).forEach((r: any) => all.push({ table: 'incidents', ...r }));
        }
        if (tables.includes('shifts')) {
          let q = ctx.user.from('shifts').select('id, guard_id, site_id, scheduled_start, scheduled_end, status').limit(50).order('scheduled_start', { ascending: false });
          if (fromIso) q = q.gte('scheduled_start', fromIso);
          if (toIso) q = q.lte('scheduled_start', toIso);
          const { data } = await q;
          (data ?? []).forEach((r: any) => all.push({ table: 'shifts', ...r }));
        }
        if (tables.includes('camera_alerts')) {
          let q = ctx.user.from('camera_alerts').select('id, camera_id, site_id, detected_at, detection_type, confidence, triage_status').limit(50).order('detected_at', { ascending: false });
          if (fromIso) q = q.gte('detected_at', fromIso);
          if (toIso) q = q.lte('detected_at', toIso);
          const { data } = await q;
          (data ?? []).forEach((r: any) => all.push({ table: 'camera_alerts', ...r }));
        }
        resultRows = all.slice(0, 100);
        return { rows: resultRows.length };
      },
    },
  ];

  try {
    const result = await runLoop({
      modelRole: 'agent',
      systemStatic: SYSTEM_STATIC,
      userMessage: query,
      tools,
      temperature: 0.1,
      maxIterations: 3,
    });

    await ctx.service.from('ai_sessions').insert({
      org_id: ctx.org_id, user_id: ctx.user_id,
      surface: 'forensic_search', model: result.modelUsed, status: 'completed',
      total_input_tokens: result.usageTotals.input,
      total_output_tokens: result.usageTotals.output,
      cache_read_tokens: result.usageTotals.cacheRead,
      cache_write_tokens: result.usageTotals.cacheWrite,
    });

    return json(req, 200, { plan, rows: resultRows });
  } catch (err) {
    return json(req, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});
