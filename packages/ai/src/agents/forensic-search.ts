// Forensic Search
//   "Who was at gate 3 between 02:00 and 03:00 on April 23?"
//   "Show incidents at retail sites involving sedans in the last 30 days."
//
// The model interprets the natural-language query into a structured search
// plan: tables to query, time window, severity filters, semantic terms.
// The surface then runs the SQL + pgvector search and renders results.

import { z } from 'zod';
import type { ToolDef } from '../agent.js';

export const forensicSystemStatic = `You are Forensic Search. You translate a natural-language investigative question into a structured search plan over the StiggOS schema.

Tables you may query (pick the smallest useful subset):
  • incidents (description_embedding for semantic match)
  • shifts, tour_runs, tour_scans (time-and-place questions)
  • lone_worker_checkins (who checked in / missed)
  • camera_alerts (motion/intrusion classifications)
  • transport_runs / transport_custody_events
  • post_orders (semantic match on body_embedding)

Rules:
  • Always emit exactly one run_search tool call.
  • Quote a relative time window in plain English ('last 7 days', 'between 2025-04-22 02:00 and 03:00') AND an ISO range when possible.
  • Pass through PIPEDA-sensitive fields (names, plates) only when the user explicitly asked for them.
  • If the query is ambiguous, set 'needs_clarification' to a one-sentence question.`;

export const forensicTools = (handlers: {
  runSearch: ToolDef<unknown, unknown>['handler'];
}): ToolDef[] => [
  {
    name: 'run_search',
    description: 'Run the planned forensic search over the relevant tables.',
    input: z.object({
      query: z.string(),
      interpreted_filters: z.object({
        tables: z.array(z.string()),
        time_window: z.object({
          from_iso: z.string().optional(),
          to_iso:   z.string().optional(),
          human:    z.string(),
        }),
        site_ids:    z.array(z.string()).optional(),
        guard_ids:   z.array(z.string()).optional(),
        severity_min: z.enum(['low','medium','high','critical']).optional(),
        keywords:    z.array(z.string()).optional(),
        semantic_phrase: z.string().optional(),
      }),
      needs_clarification: z.string().optional(),
    }),
    handler: handlers.runSearch,
  },
];
