// Alberta SSIA + OHS rules. Deterministic — pinned `now` lets us assert
// exact day-counts without flakiness.

import { describe, it, expect } from 'vitest';
import { runCompliance } from '../src/index.js';
import type { ComplianceContext } from '../src/index.js';

const NOW = new Date('2026-05-01T12:00:00Z');

function ctx(over: Partial<ComplianceContext>): ComplianceContext {
  return {
    org_id: 'org-1',
    region: 'AB',
    now: NOW,
    guards: [],
    sites: [],
    contracts: [],
    privacy_breaches: [],
    ...over,
  };
}

function guard(over: Partial<ComplianceContext['guards'][number]>): ComplianceContext['guards'][number] {
  return {
    id: 'g1', first_name: 'A', last_name: 'B', status: 'active',
    ssia_license_number: 'AB-1', ssia_license_expiry: '2027-01-01',
    first_aid_expiry: '2027-01-01', drivers_license_expiry: null,
    certifications: [],
    ...over,
  };
}

describe('Alberta SSIA license rules', () => {
  it('flags critical when license is already expired', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_expiry: '2026-04-01' })],  // 30 days ago
    }));
    const f = findings.find((x) => x.rule_id === 'AB-SSIA-002');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('critical');
    expect(f!.title).toContain('EXPIRED');
  });

  it('flags high when license expires within 14 days', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_expiry: '2026-05-10' })],  // +9 days
    }));
    const f = findings.find((x) => x.rule_id === 'AB-SSIA-003');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
    expect(f!.title).toMatch(/9 days/);
  });

  it('flags medium when license expires within 30 days but past 14', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_expiry: '2026-05-26' })],  // +25 days
    }));
    const f = findings.find((x) => x.rule_id === 'AB-SSIA-003');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('medium');
  });

  it('emits no SSIA findings when expiry is more than 30 days out', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_expiry: '2026-09-01' })],
    }));
    expect(findings.find((x) => x.rule_id?.startsWith('AB-SSIA-00'))).toBeUndefined();
  });

  it('flags missing license as high severity', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_number: null, ssia_license_expiry: null })],
    }));
    const f = findings.find((x) => x.rule_id === 'AB-SSIA-001');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
  });

  it('skips inactive guards', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ status: 'terminated', ssia_license_expiry: '2025-01-01' })],
    }));
    expect(findings.find((x) => x.rule_id?.startsWith('AB-SSIA'))).toBeUndefined();
  });
});

describe('Alberta OHS first-aid rule', () => {
  it('flags expired first aid', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ first_aid_expiry: '2026-04-01' })],
    }));
    const f = findings.find((x) => x.rule_id === 'AB-OHS-FA-EXP');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('high');
  });

  it('warns when first aid expires within 60 days', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ first_aid_expiry: '2026-06-15' })],
    }));
    const f = findings.find((x) => x.rule_id === 'AB-OHS-FA-WARN');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('medium');
  });

  it('emits no first-aid finding when expiry is far out', async () => {
    const findings = await runCompliance(ctx({
      guards: [guard({ first_aid_expiry: '2027-01-01' })],
    }));
    expect(findings.find((x) => x.rule_id?.startsWith('AB-OHS-FA'))).toBeUndefined();
  });
});

describe('Alberta OHS lone-worker rule', () => {
  it('emits a working-alone reminder when remote sites exist', async () => {
    const findings = await runCompliance(ctx({
      sites: [{ id: 's1', name: 'Mildred Lake', site_type: 'oil_gas', remote: true, hazards: ['cold_weather'] }],
    }));
    const f = findings.find((x) => x.rule_id === 'AB-OHS-WA');
    expect(f).toBeDefined();
    expect(f!.scope_type).toBe('org');
    expect(f!.regulatory_anchor).toContain('Part 28');
    expect(f!.citations).toHaveLength(1);
  });

  it('emits nothing when no remote sites', async () => {
    const findings = await runCompliance(ctx({
      sites: [{ id: 's1', name: 'Calgary', site_type: 'retail', remote: false, hazards: [] }],
    }));
    expect(findings.find((x) => x.rule_id === 'AB-OHS-WA')).toBeUndefined();
  });
});

describe('rule isolation', () => {
  it('failure of one rule does not poison others', async () => {
    // Force a rule error by passing data with a malformed expiry — rule still
    // returns findings, while a separate rule continues to work.
    const findings = await runCompliance(ctx({
      guards: [guard({ ssia_license_expiry: 'NOT-A-DATE' as any })],
      sites: [{ id: 's1', name: 'Mildred Lake', site_type: 'oil_gas', remote: true, hazards: [] }],
    }));
    expect(findings.find((x) => x.rule_id === 'AB-OHS-WA')).toBeDefined();
  });
});
