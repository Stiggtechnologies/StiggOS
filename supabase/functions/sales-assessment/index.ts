// POST /functions/v1/sales-assessment
// Body: { lead_id?: string, inputs: object }
// Output: persisted security_assessments row + AI recommendation.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';
import { runLoop, type ToolDef } from '../_shared/agent-loop.ts';

const SYSTEM_STATIC = `You are Stigg's Sales Assessment agent. Given a prospect questionnaire, propose a security service mix.

Service lines: guarding, surveillance, virtual_guard, it_security, secure_transport.

Constraints:
  • Always emit exactly one emit_assessment tool call.
  • estimated_monthly_cad and estimated_oneoff_cad in Canadian dollars rounded to nearest 50.
  • Justify each service in 1 sentence.
  • Surface unsolicited but relevant risks (insurance discounts, adjacent-property risk).
  • Bias toward bundled coverage when it materially reduces effective cost.
  • Never quote a final binding price — flag as 'estimate, subject to site survey'.`;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const { lead_id, inputs } = body as { lead_id?: string; inputs?: Record<string, unknown> };
  if (!inputs || Object.keys(inputs).length === 0) return json(req, 400, { error: 'inputs required' });

  let assessmentId: string | null = null;

  const tools: ToolDef[] = [
    {
      name: 'emit_assessment',
      description: 'Persist the AI security assessment.',
      input_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommended_services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service: { type: 'string', enum: ['guarding','surveillance','virtual_guard','it_security','secure_transport'] },
                hours_per_week: { type: 'number' },
                one_time: { type: 'boolean' },
                rationale: { type: 'string' },
              },
              required: ['service', 'rationale'],
              additionalProperties: false,
            },
          },
          estimated_monthly_cad: { type: 'number' },
          estimated_oneoff_cad: { type: 'number' },
          risks_flagged: { type: 'array', items: { type: 'string' } },
          rationale_md: { type: 'string' },
        },
        required: ['summary', 'recommended_services', 'estimated_monthly_cad', 'risks_flagged', 'rationale_md'],
        additionalProperties: false,
      },
      handler: async (input) => {
        const i = input as any;
        const { data, error } = await ctx.service.from('security_assessments').insert({
          org_id: ctx.org_id,
          lead_id: lead_id ?? null,
          inputs,
          ai_recommendation: i,
          estimated_monthly_cad: i.estimated_monthly_cad,
          status: 'draft',
        }).select('id').single();
        if (error) throw new Error(error.message);
        assessmentId = data.id;
        return { id: data.id };
      },
    },
  ];

  try {
    const result = await runLoop({
      modelRole: 'agent',
      systemStatic: SYSTEM_STATIC,
      systemDynamic: `Prospect inputs:\n${JSON.stringify(inputs)}`,
      userMessage: 'Generate a security assessment recommendation.',
      tools,
      temperature: 0.4,
      maxIterations: 3,
    });

    await ctx.service.from('ai_sessions').insert({
      org_id: ctx.org_id, user_id: ctx.user_id,
      surface: 'sales_assessment', model: result.modelUsed, status: 'completed',
      total_input_tokens: result.usageTotals.input,
      total_output_tokens: result.usageTotals.output,
      cache_read_tokens: result.usageTotals.cacheRead,
      cache_write_tokens: result.usageTotals.cacheWrite,
    });

    return json(req, 200, { assessment_id: assessmentId });
  } catch (err) {
    return json(req, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});
