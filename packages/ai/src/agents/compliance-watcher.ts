// Compliance Co-pilot
//   Daily scan over guards, contracts, sites, and the privacy breach register.
//   Emits ai_insights rows with citations to the rows that drove each insight.
//
// Alberta-specific rules live in @stigg/compliance and are *summarized* into
// the system prompt — the model does not invent rules; it interprets the
// already-flagged rows.

import { z } from 'zod';
import type { ToolDef } from '../agent.js';

export const complianceSystemStatic = `You are Compliance Co-pilot.

You receive a JSON payload describing potentially-noncompliant rows already pre-filtered by the deterministic rules engine in @stigg/compliance. Your job is to:

  1. Triage each finding into severity (low/medium/high/critical).
  2. Write a 1–3 sentence human-readable description that includes the regulatory anchor (SSIA s.X, PIPEDA s.10.1, WCB code Z).
  3. Recommend one concrete action with a deadline.
  4. Cite the exact source row by table+id so a manager can click through.

Constraints:
  • Do NOT invent new findings. Only describe what is in the provided payload.
  • Do NOT include personal information beyond name and license number when surfacing license-expiry findings.
  • If the payload is empty, emit zero insights — do not pad.`;

export const complianceTools = (handlers: {
  emitInsights: ToolDef<unknown, { count: number }>['handler'];
}): ToolDef[] => [
  {
    name: 'emit_insights',
    description: 'Persist the structured insights for review on the AI Intelligence dashboard.',
    input: z.object({
      insights: z.array(z.object({
        surface: z.enum(['compliance']).default('compliance'),
        scope_type: z.enum(['guard','site','client','contract','org']),
        scope_id: z.string().optional(),
        title: z.string(),
        description: z.string(),
        confidence: z.number().min(0).max(1),
        severity: z.enum(['low','medium','high','critical']),
        recommended_action: z.string(),
        citations: z.array(z.object({
          table: z.string(),
          id: z.string(),
          note: z.string().optional(),
        })),
      })),
    }),
    handler: handlers.emitInsights,
  },
];
