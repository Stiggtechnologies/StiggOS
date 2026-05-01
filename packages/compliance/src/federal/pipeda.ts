// Federal Canadian privacy: Personal Information Protection and Electronic
// Documents Act (PIPEDA). Applies to organizations engaged in commercial
// activities, including private security operators handling video, access
// logs, and incident records.
//
// Key obligations enforced here:
//   • s.10.1: Mandatory breach notification to OPC + affected individuals
//             without unreasonable delay when a real risk of significant
//             harm exists.
//   • Best-practice: a tabletop drill at least once per quarter.

import type { Finding, RuleFn } from '../types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const breachNotificationLag: RuleFn = (ctx) => {
  const now = ctx.now ?? new Date();
  return ctx.privacy_breaches
    .filter((b) => !b.notification_sent || !b.opc_reported)
    .map((b) => {
      const age = Math.floor((now.getTime() - Date.parse(b.detected_at)) / DAY_MS);
      const overdue = age >= 3; // PIPEDA says "as soon as feasible"; 3 days is our internal threshold
      return {
        rule_id: 'PIPEDA-NOTIF',
        severity: overdue ? 'critical' : 'high',
        scope_type: 'org',
        title: `Privacy breach awaiting notification (${age}d old)`,
        description: `Breach detected ${b.detected_at} affecting ${b.records_affected ?? 'unknown'} records has notification_sent=${b.notification_sent}, opc_reported=${b.opc_reported}. PIPEDA s.10.1 requires notification without unreasonable delay where a real risk of significant harm exists.`,
        regulatory_anchor: 'PIPEDA s.10.1',
        recommended_action: 'Complete the OPC notification (Form PB) and affected-individual notifications today.',
        citations: [{ table: 'privacy_breach_register', id: b.id }],
      } as Finding;
    });
};

const drillCadence: RuleFn = (ctx) => {
  const now = ctx.now ?? new Date();
  const quarterStart = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  const drills = ctx.privacy_breaches.filter((b) => Date.parse(b.detected_at) >= quarterStart.getTime());
  // We treat any breach event tagged as a drill as evidence; the schema
  // doesn't have a 'drill' flag yet, so this rule is a soft "no events of
  // any kind this quarter" reminder.
  if (drills.length === 0) {
    return [{
      rule_id: 'PIPEDA-DRILL',
      severity: 'low',
      scope_type: 'org',
      title: 'No privacy-incident events recorded this quarter',
      description: 'Best-practice cadence is one PIPEDA tabletop drill per quarter. None recorded this quarter.',
      regulatory_anchor: 'PIPEDA s.10.1 (best practice)',
      recommended_action: 'Schedule a tabletop drill this quarter and log the run in the privacy breach register flagged as a drill.',
      citations: [],
    }];
  }
  return [];
};

export const pipedaRules: RuleFn[] = [breachNotificationLag, drillCadence];
