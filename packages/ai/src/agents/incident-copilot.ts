// Incident Copilot
//   Input: free-text or transcribed-voice narration from a guard.
//   Output: a structured incident draft + an `ai_structured` JSON object
//           covering who/what/when/where/how/actions_taken/witnesses/evidence_needed.
//
// The actual database write is the caller's responsibility — the tool here
// is a *create_incident* call whose handler the surface provides. This keeps
// the harness pure and lets the same agent run client-side (mock) or
// server-side (with a real Supabase service-role client).

import { z } from 'zod';
import type { ToolDef } from '../agent.js';

export const incidentSystemStatic = `You are Incident Copilot — an embedded assistant that turns a security guard's raw narration into a complete, regulator-grade incident report.

Operating principles:
  • Never invent facts not present in the narration. If something is unclear, say so in the description.
  • Distinguish primary observations from secondary inferences.
  • The 'category' field must be one of: trespass, vandalism, theft, disturbance, medical, fire, maintenance, suspicious_activity, vehicle, cyber, transport, other.
  • The 'severity' field must be one of: low, medium, high, critical. Critical = imminent threat to life or major asset loss; high = active threat or attempted breach; medium = unauthorized presence with no escalation; low = nuisance/maintenance.
  • PIPEDA: do NOT include personal identifiers beyond what was clearly observed (no fabricated names, plates, demographics).
  • Always populate 'ai_structured' with the canonical 6Ws (who/what/when/where/how/why), plus 'actions_taken', 'witnesses', and 'evidence_needed' suggesting follow-ups (e.g., CCTV review, police report).
  • Output a single create_incident tool call. Do not write a separate text reply.`;

export const incidentTools = (handlers: {
  createIncident: ToolDef<unknown, { id: string }>['handler'];
}): ToolDef[] => [
  {
    name: 'create_incident',
    description: 'Create a structured incident report from the guard narration.',
    input: z.object({
      title: z.string().describe('Short factual title — max ~80 chars.'),
      description: z.string().describe('Cleaned-up neutral prose description.'),
      category: z.enum([
        'trespass','vandalism','theft','disturbance','medical','fire',
        'maintenance','suspicious_activity','vehicle','cyber','transport','other',
      ]),
      severity: z.enum(['low','medium','high','critical']),
      ai_structured: z.object({
        who:           z.string().optional(),
        what:          z.string().optional(),
        when:          z.string().optional(),
        where:         z.string().optional(),
        how:           z.string().optional(),
        why:           z.string().optional(),
        actions_taken: z.string().optional(),
        witnesses:     z.array(z.string()).optional(),
        evidence_needed: z.array(z.string()).optional(),
      }),
      ai_confidence: z.number().min(0).max(1),
    }),
    handler: handlers.createIncident,
  },
];
