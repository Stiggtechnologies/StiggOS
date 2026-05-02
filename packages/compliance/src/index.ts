// Compliance plug-in registry. Each region (province / state / country) registers
// a set of deterministic rules. Rules return Findings; an LLM (compliance-watcher)
// can then triage and prose-ify them — but the rules themselves never call an LLM.
//
// Today: Alberta only (AB). PIPEDA is federal and applies everywhere in Canada.

import { albertaRules } from './regions/alberta.js';
import { pipedaRules } from './federal/pipeda.js';
import { automationRules } from './operational/automation.js';
import type { ComplianceContext, Finding, RuleFn } from './types.js';

export type { Finding, ComplianceContext, RuleFn } from './types.js';

const REGIONS: Record<string, RuleFn[]> = {
  AB: albertaRules,
};

const FEDERAL: RuleFn[] = [...pipedaRules];
const OPERATIONAL: RuleFn[] = [...automationRules];

export async function runCompliance(ctx: ComplianceContext): Promise<Finding[]> {
  const region = (ctx.region ?? 'AB').toUpperCase();
  const rules: RuleFn[] = [...(REGIONS[region] ?? []), ...FEDERAL, ...OPERATIONAL];

  const findings: Finding[] = [];
  for (const r of rules) {
    try {
      const out = await r(ctx);
      if (out) findings.push(...out);
    } catch (err) {
      // A failing rule should not poison the entire scan.
      findings.push({
        rule_id: 'rule_error',
        severity: 'medium',
        scope_type: 'org',
        title: 'Compliance rule errored',
        description: `Rule threw: ${err instanceof Error ? err.message : String(err)}`,
        regulatory_anchor: 'internal',
        recommended_action: 'Investigate the rule code; this is a software bug, not a compliance issue.',
        citations: [],
      });
    }
  }
  return findings;
}
