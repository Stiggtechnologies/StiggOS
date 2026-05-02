import { describe, expect, it } from 'vitest';
import { runCompliance } from '../src/index.js';

const NOW = new Date('2026-05-01T12:00:00Z');
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const baseCtx = {
  org_id: 'o', region: 'AB', now: NOW,
  guards: [], sites: [], contracts: [], privacy_breaches: [],
};

describe('asset-offline rules', () => {
  it('flags lost (>72h)', async () => {
    const f = await runCompliance({
      ...baseCtx,
      asset_trackers: [{ id: 'a1', label: 'Master keys', last_seen_at: ago(80), is_active: true, battery_pct: 90 }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-ASSET-LOST')).toBeDefined();
  });
  it('flags stale (24-72h) at low severity', async () => {
    const f = await runCompliance({
      ...baseCtx,
      asset_trackers: [{ id: 'a1', label: 'Patrol kit', last_seen_at: ago(40), is_active: true, battery_pct: 90 }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-ASSET-STALE')!.severity).toBe('low');
  });
  it('flags low battery', async () => {
    const f = await runCompliance({
      ...baseCtx,
      asset_trackers: [{ id: 'a1', label: 'Radio', last_seen_at: ago(1), is_active: true, battery_pct: 8 }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-ASSET-BATT')).toBeDefined();
  });
  it('skips inactive trackers', async () => {
    const f = await runCompliance({
      ...baseCtx,
      asset_trackers: [{ id: 'a1', label: 'Decommissioned', last_seen_at: null, is_active: false, battery_pct: null }],
    });
    expect(f.find((r) => r.rule_id?.startsWith('OPS-ASSET'))).toBeUndefined();
  });
});

describe('vehicle alert backlog rule', () => {
  it('escalates with high count', async () => {
    const f = await runCompliance({
      ...baseCtx,
      vehicle_alert_counts: [{ vehicle_id: 'v1', unit_number: 'P-12', count_7d: 22, severity_max: 'medium' }],
    });
    const x = f.find((r) => r.rule_id === 'OPS-VEHICLE-DRIFT');
    expect(x?.severity).toBe('high');
  });
  it('skips quiet vehicles', async () => {
    const f = await runCompliance({
      ...baseCtx,
      vehicle_alert_counts: [{ vehicle_id: 'v1', unit_number: 'P-12', count_7d: 2, severity_max: 'low' }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-VEHICLE-DRIFT')).toBeUndefined();
  });
});

describe('missed-tour trend rule', () => {
  it('flags 5+ misses as high', async () => {
    const f = await runCompliance({
      ...baseCtx,
      tour_misses: [{ site_id: 's1', site_name: 'Northview #5', missed_count_24h: 6 }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-TOUR-MISS')!.severity).toBe('high');
  });
  it('flags 2-4 misses as medium', async () => {
    const f = await runCompliance({
      ...baseCtx,
      tour_misses: [{ site_id: 's1', site_name: 'Calgary plaza', missed_count_24h: 3 }],
    });
    expect(f.find((r) => r.rule_id === 'OPS-TOUR-MISS')!.severity).toBe('medium');
  });
});
