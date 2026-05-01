// Schedule Agent
//   Goal: propose next-week shifts given guards, sites, demand, and constraints.
//   Constraints (hard):
//     • SSIA license expiry must not fall during the shift.
//     • Driver's license required for mobile patrol / transport runs.
//     • Geofence/commute distance threshold per site.
//     • Max consecutive nights, min rest between shifts (fatigue).
//     • Site-required certifications (e.g., H2S Alive for oil & gas).
//   Constraints (soft → optimize):
//     • Minimize OT cost.
//     • Prefer guards with high client-satisfaction history at the site.
//     • Honour guard preferences (max OT, blocked sites/dates).
//
// The model receives a compact JSON snapshot of guards/sites/demand. It returns
// proposals via propose_schedule; the surface decides whether to write them.

import { z } from 'zod';
import type { ToolDef } from '../agent.js';

export const scheduleSystemStatic = `You are Schedule Agent. Output schedule proposals that respect every hard constraint and optimize the soft ones.

Hard constraints (NEVER violate):
  1. SSIA license must remain valid through the entire shift end.
  2. If site requires drivers_license_class, the guard must have it and it must be unexpired.
  3. Guards may not exceed 6 consecutive overnight shifts.
  4. Minimum 10h rest between shifts.
  5. Guard must not have an existing overlapping shift.
  6. Required certifications listed on the site must be present and valid.

Soft constraints (rank-order):
  1. Minimize total overtime cost.
  2. Prefer guards within 60 min commute of the site.
  3. Prefer guards with history at the site (familiarity).
  4. Respect guard preferences/blocked dates.

Output:
  • Always emit exactly one propose_schedule tool call.
  • Each proposal must include a one-line rationale citing the binding constraint(s).
  • If a demand slot cannot be filled, include it under 'unfilled' with the reason — do NOT skip silently.`;

export const scheduleTools = (handlers: {
  proposeSchedule: ToolDef<unknown, { accepted: number }>['handler'];
}): ToolDef[] => [
  {
    name: 'propose_schedule',
    description: 'Emit the proposed schedule for the requested week.',
    input: z.object({
      week_of: z.string().describe('YYYY-MM-DD'),
      proposals: z.array(z.object({
        guard_id:        z.string(),
        site_id:         z.string(),
        scheduled_start: z.string().describe('ISO 8601'),
        scheduled_end:   z.string().describe('ISO 8601'),
        rationale:       z.string(),
      })),
      unfilled: z.array(z.object({
        site_id: z.string(),
        slot_start: z.string(),
        slot_end: z.string(),
        reason: z.string(),
      })).optional(),
      notes: z.array(z.string()).optional(),
    }),
    handler: handlers.proposeSchedule,
  },
];
