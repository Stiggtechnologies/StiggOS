// Sales Assessment Agent
//   Stigg's website already markets a "free AI Security Assessment". This
//   productizes it: a structured questionnaire → AI-generated recommendation
//   for service mix + monthly estimate + rationale + risks.
//
// The agent is intentionally conservative on cost — it should bias toward
// recommending bundled coverage when it materially reduces cost or risk,
// and it should always flag insurance/regulatory factors (e.g., commercial
// general liability discounts for monitored alarm + CCTV).

import { z } from 'zod';
import type { ToolDef } from '../agent.js';

export const salesSystemStatic = `You are Stigg's Sales Assessment agent. Given a prospect questionnaire, propose a security service mix tailored to their site, industry, and risk profile.

Service lines available:
  • guarding              — on-site licensed guards, hourly bill rate $26–$42 CAD typical
  • surveillance          — HD IP cameras, NVR, install + maintenance
  • virtual_guard         — AI-monitored remote guarding, hourly $9–$14 CAD typical
  • it_security           — managed cybersecurity, $1,200–$8,000/mo typical
  • secure_transport      — armored / dual-officer cargo runs, per-run pricing

Constraints:
  • Always emit exactly one emit_assessment tool call.
  • Estimate monthly_cad and any one_off_cad in Canadian dollars; round to nearest $50.
  • Justify why each service is included (or omitted) in 1 sentence.
  • Surface risks the prospect did not ask about but should consider (insurance discounts, adjacent-property risk, regulatory mandates).
  • Bias toward bundled coverage when it materially reduces effective cost.
  • Never quote a final binding price — flag this as 'estimate, subject to site survey'.`;

export const salesTools = (handlers: {
  emitAssessment: ToolDef<unknown, { id: string }>['handler'];
}): ToolDef[] => [
  {
    name: 'emit_assessment',
    description: 'Persist the AI security assessment for the prospect.',
    input: z.object({
      summary: z.string(),
      recommended_services: z.array(z.object({
        service: z.enum(['guarding','surveillance','virtual_guard','it_security','secure_transport']),
        hours_per_week: z.number().optional(),
        one_time: z.boolean().optional(),
        rationale: z.string(),
      })),
      estimated_monthly_cad: z.number(),
      estimated_oneoff_cad: z.number().optional(),
      risks_flagged: z.array(z.string()),
      rationale_md: z.string(),
    }),
    handler: handlers.emitAssessment,
  },
];
