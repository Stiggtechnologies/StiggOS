// Alberta-specific compliance rules.
//
// Statutes referenced:
//   • SSIA — Security Services and Investigators Act (RSA 2010)
//     Administered by Alberta Justice & Solicitor General. License renewal
//     required every 2 years; lapse = working without a license = offense.
//   • OHS — Occupational Health and Safety Act / Code (specifically the
//     Working Alone provisions in Part 28 — periodic check-ins for guards
//     posted at remote / lone-worker sites).
//   • WCB — Workers' Compensation Board reporting timelines.
//
// These rules are deterministic — no LLM involved. The LLM (Compliance
// Co-pilot) consumes the Findings and writes human-readable summaries.

import type { Finding, RuleFn } from '../types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / DAY_MS);
}

// Rule: SSIA license expiring or expired.
const ssiaLicenseExpiry: RuleFn = (ctx) => {
  const now = ctx.now ?? new Date();
  const out: Finding[] = [];
  for (const g of ctx.guards) {
    if (g.status !== 'active') continue;
    const d = daysUntil(g.ssia_license_expiry, now);
    if (d === null) {
      out.push({
        rule_id: 'AB-SSIA-001',
        severity: 'high',
        scope_type: 'guard',
        scope_id: g.id,
        title: `Missing SSIA license — ${g.first_name} ${g.last_name}`,
        description: 'Active guard has no Alberta SSIA license recorded. Working without one is an offence under the Security Services and Investigators Act.',
        regulatory_anchor: 'AB SSIA Part 2',
        recommended_action: 'Pull the guard from active rotation until a valid license is recorded.',
        citations: [{ table: 'guards', id: g.id, note: 'ssia_license_number is null' }],
      });
      continue;
    }
    if (d < 0) {
      out.push({
        rule_id: 'AB-SSIA-002',
        severity: 'critical',
        scope_type: 'guard',
        scope_id: g.id,
        title: `EXPIRED SSIA license — ${g.first_name} ${g.last_name}`,
        description: `License expired ${-d} day(s) ago. Guard must not be scheduled until renewed.`,
        regulatory_anchor: 'AB SSIA Part 2',
        recommended_action: 'Block scheduling immediately. Initiate renewal application and pre-book replacement coverage.',
        citations: [{ table: 'guards', id: g.id, note: 'ssia_license_expiry < today' }],
      });
    } else if (d <= 30) {
      out.push({
        rule_id: 'AB-SSIA-003',
        severity: d <= 14 ? 'high' : 'medium',
        scope_type: 'guard',
        scope_id: g.id,
        title: `SSIA license expires in ${d} days — ${g.first_name} ${g.last_name}`,
        description: `Renewal lead time for AB Justice & Solicitor General is typically 4–6 weeks. ${d} days remaining.`,
        regulatory_anchor: 'AB SSIA Part 2',
        recommended_action: 'Open renewal task; pre-book replacement coverage for any shifts after expiry.',
        due_by: g.ssia_license_expiry ?? undefined,
        citations: [{ table: 'guards', id: g.id, note: 'ssia_license_expiry within 30d' }],
      });
    }
  }
  return out;
};

// Rule: First-aid certification expiring (Alberta OHS expects current first-aid
// certification at most lone-worker / remote / industrial sites).
const firstAidExpiry: RuleFn = (ctx) => {
  const now = ctx.now ?? new Date();
  return ctx.guards.flatMap((g) => {
    const d = daysUntil(g.first_aid_expiry, now);
    if (d === null || d > 60) return [];
    if (d < 0) {
      return [{
        rule_id: 'AB-OHS-FA-EXP',
        severity: 'high',
        scope_type: 'guard',
        scope_id: g.id,
        title: `First-aid expired — ${g.first_name} ${g.last_name}`,
        description: `First-aid certification lapsed ${-d} day(s) ago. Required for lone-worker and industrial postings under OHS Code Part 11.`,
        regulatory_anchor: 'AB OHS Code Part 11',
        recommended_action: 'Schedule recertification before next industrial / remote shift.',
        citations: [{ table: 'guards', id: g.id }],
      }] as Finding[];
    }
    return [{
      rule_id: 'AB-OHS-FA-WARN',
      severity: 'medium',
      scope_type: 'guard',
      scope_id: g.id,
      title: `First-aid expires in ${d} days — ${g.first_name} ${g.last_name}`,
      description: `Schedule recertification before lapse to avoid scheduling restrictions on lone-worker postings.`,
      regulatory_anchor: 'AB OHS Code Part 11',
      recommended_action: 'Book recertification course this month.',
      due_by: g.first_aid_expiry ?? undefined,
      citations: [{ table: 'guards', id: g.id }],
    }] as Finding[];
  });
};

// Rule: Lone-worker / remote site staffing — OHS Code Part 28 demands a
// documented working-alone procedure including periodic check-ins.
// We can't validate the procedure document here; we surface remote sites
// without enforced check-ins as a flag for the org admin.
const loneWorkerProcedure: RuleFn = (ctx) => {
  const remoteSites = ctx.sites.filter((s) => s.remote);
  if (remoteSites.length === 0) return [];
  return [{
    rule_id: 'AB-OHS-WA',
    severity: 'medium',
    scope_type: 'org',
    title: `${remoteSites.length} remote site(s) require Working-Alone procedures`,
    description: 'Sites flagged as remote (oil sands / unmanned facility / wildlife hazard) require a documented Working-Alone procedure with periodic check-ins. Verify lone_worker_checkins are scheduled for every shift on each remote site.',
    regulatory_anchor: 'AB OHS Code Part 28',
    recommended_action: 'Verify each remote site has an active Working-Alone procedure on file and that check-ins are enabled.',
    citations: remoteSites.map((s) => ({ table: 'sites', id: s.id, note: 'remote=true' })),
  }];
};

export const albertaRules: RuleFn[] = [ssiaLicenseExpiry, firstAidExpiry, loneWorkerProcedure];
