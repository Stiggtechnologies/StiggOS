// POST /functions/v1/incident-copilot
// Body: { site_id, shift_id?, narration, ad_hoc?: true }
//
// Takes a guard's raw narration → structured incident report inserted into
// the `incidents` table with ai_structured + ai_confidence populated. Returns
// the inserted incident id. Falls back gracefully if the model can't fully
// structure (returns the draft for the user to confirm).

import { authenticate } from '../_shared/auth.ts';
import { corsHeaders, json, preflight } from '../_shared/cors.ts';
import { runLoop, type ToolDef } from '../_shared/agent-loop.ts';

const SYSTEM_STATIC = `You are Incident Copilot — an embedded assistant that turns a security guard's raw narration into a complete, regulator-grade incident report.

Operating principles:
  • Never invent facts not present in the narration.
  • Distinguish primary observations from secondary inferences.
  • Category must be one of: trespass, vandalism, theft, disturbance, medical, fire, maintenance, suspicious_activity, vehicle, cyber, transport, other.
  • Severity must be: low, medium, high, critical.
  • PIPEDA: do NOT include personal identifiers beyond what was clearly observed.
  • Always populate ai_structured (who/what/when/where/how/why + actions_taken + witnesses + evidence_needed).
  • Output a single create_incident tool call.`;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const { site_id, shift_id, narration } = body as { site_id?: string; shift_id?: string; narration?: string };
  if (!site_id || !narration) return json(req, 400, { error: 'site_id and narration required' });

  // Verify the user can write to this site (RLS check on read).
  const { data: siteRow, error: siteErr } = await ctx.user.from('sites').select('id').eq('id', site_id).single();
  if (siteErr || !siteRow) return json(req, 403, { error: 'site not visible to caller' });

  let createdIncidentId: string | null = null;

  const tools: ToolDef[] = [
    {
      name: 'create_incident',
      description: 'Create a structured incident report from the guard narration.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['trespass','vandalism','theft','disturbance','medical','fire','maintenance','suspicious_activity','vehicle','cyber','transport','other'] },
          severity: { type: 'string', enum: ['low','medium','high','critical'] },
          ai_structured: { type: 'object', additionalProperties: true },
          ai_confidence: { type: 'number' },
        },
        required: ['title','description','category','severity','ai_structured','ai_confidence'],
        additionalProperties: false,
      },
      handler: async (input) => {
        const i = input as {
          title: string; description: string;
          category: string; severity: string;
          ai_structured: Record<string, unknown>;
          ai_confidence: number;
        };
        // Service-role write: caller's RLS may forbid direct insert;
        // we set org_id explicitly to the authenticated user's org.
        const { data, error } = await ctx.service.from('incidents').insert({
          org_id: ctx.org_id,
          site_id,
          shift_id: shift_id ?? null,
          reported_by_guard_id: null, // future: resolve via user_profile → guards
          title: i.title.slice(0, 200),
          description: i.description,
          category: i.category,
          severity: i.severity,
          status: 'open',
          occurred_at: new Date().toISOString(),
          raw_narration: narration,
          ai_structured: i.ai_structured,
          ai_confidence: i.ai_confidence,
        }).select('id').single();
        if (error) throw new Error(error.message);
        createdIncidentId = data.id;
        return { id: data.id };
      },
    },
  ];

  try {
    const result = await runLoop({
      modelRole: 'agent',
      systemStatic: SYSTEM_STATIC,
      systemDynamic: `Site id: ${site_id}. Today is ${new Date().toISOString()}.`,
      userMessage: narration,
      tools,
      temperature: 0.1,
    });

    // Persist a session record for cost telemetry.
    await ctx.service.from('ai_sessions').insert({
      org_id: ctx.org_id,
      user_id: ctx.user_id,
      surface: 'incident_copilot',
      model: result.modelUsed,
      status: createdIncidentId ? 'completed' : 'aborted',
      total_input_tokens: result.usageTotals.input,
      total_output_tokens: result.usageTotals.output,
      cache_read_tokens: result.usageTotals.cacheRead,
      cache_write_tokens: result.usageTotals.cacheWrite,
    });

    return json(req, 200, { incident_id: createdIncidentId, iterations: result.iterations });
  } catch (err) {
    return json(req, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});
