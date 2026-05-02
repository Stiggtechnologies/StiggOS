import { describe, expect, it } from 'vitest';
import { parseOsmAnd, parseTraccarPost, evaluateFix } from '../src/traccar/index.js';

describe('parseOsmAnd', () => {
  it('parses a typical OsmAnd query', () => {
    const fix = parseOsmAnd(new URLSearchParams({
      id: 'unit-7', lat: '51.05', lon: '-114.07', timestamp: '1746138000', speed: '60', bearing: '180',
    }));
    expect(fix).toBeTruthy();
    expect(fix!.device_id).toBe('unit-7');
    expect(fix!.lat).toBeCloseTo(51.05);
    expect(fix!.lng).toBeCloseTo(-114.07);
    expect(fix!.speed_kmh).toBeCloseTo(60 * 1.852, 2);  // knots → km/h
  });
  it('returns null without id or coords', () => {
    expect(parseOsmAnd(new URLSearchParams({ lat: '1', lon: '1' }))).toBeNull();
    expect(parseOsmAnd(new URLSearchParams({ id: 'x' }))).toBeNull();
  });
});

describe('parseTraccarPost', () => {
  it('parses the JSON forwarder shape', () => {
    const fix = parseTraccarPost({
      uniqueId: 'unit-8', latitude: 51.05, longitude: -114.07,
      speed: 30, course: 45, fixTime: '2026-05-01T12:00:00Z',
      attributes: { batteryLevel: 78, ignition: true },
    });
    expect(fix).toBeTruthy();
    expect(fix!.device_id).toBe('unit-8');
    expect(fix!.speed_kmh).toBeCloseTo(30 * 1.852, 2);
    expect(fix!.battery_pct).toBe(78);
    expect(fix!.ignition).toBe(true);
  });
});

describe('evaluateFix — speeding', () => {
  const now = '2026-05-01T12:00:00Z';
  const base = { device_id: 'v', recorded_at: now, lat: 0, lng: 0, source: 'traccar' as const, raw: {} };

  it('flags speeding above the limit', () => {
    const out = evaluateFix({ fix: { ...base, speed_kmh: 130 }, thresholds: { speed_limit_kmh: 110 } });
    expect(out.find((a) => a.alert_type === 'speeding')!.severity).toBe('medium');
  });
  it('escalates to high for big overage', () => {
    const out = evaluateFix({ fix: { ...base, speed_kmh: 130 }, thresholds: { speed_limit_kmh: 100 } });
    expect(out[0]!.severity).toBe('high');
  });
  it('escalates to critical for huge overage', () => {
    const out = evaluateFix({ fix: { ...base, speed_kmh: 200 }, thresholds: { speed_limit_kmh: 110 } });
    expect(out[0]!.severity).toBe('critical');
  });
  it('does not flag at the limit', () => {
    const out = evaluateFix({ fix: { ...base, speed_kmh: 110 }, thresholds: { speed_limit_kmh: 110 } });
    expect(out.find((a) => a.alert_type === 'speeding')).toBeUndefined();
  });
});

describe('evaluateFix — idling', () => {
  it('flags idling when prior + current are below threshold for >= idle_minutes', () => {
    const t1 = '2026-05-01T12:00:00Z';
    const t2 = '2026-05-01T12:15:00Z';
    const fix = { device_id: 'v', recorded_at: t2, lat: 0, lng: 0, speed_kmh: 0, source: 'traccar' as const, raw: {} };
    const prior = { ...fix, recorded_at: t1 };
    const out = evaluateFix({ fix, prior, thresholds: { idle_minutes: 10 } });
    expect(out.find((a) => a.alert_type === 'idling')).toBeTruthy();
  });
  it('skips idling without a prior fix', () => {
    const out = evaluateFix({
      fix: { device_id: 'v', recorded_at: '2026-05-01T12:00:00Z', lat: 0, lng: 0, speed_kmh: 0, source: 'traccar' as const, raw: {} },
      thresholds: { idle_minutes: 10 },
    });
    expect(out.find((a) => a.alert_type === 'idling')).toBeUndefined();
  });
});

describe('evaluateFix — unauthorized_use', () => {
  it('flags movement outside the authorized window', () => {
    const out = evaluateFix({
      fix: {
        device_id: 'v', recorded_at: '2026-05-02T08:00:00Z', // Sat 02:00 Edmonton
        lat: 0, lng: 0, speed_kmh: 50, source: 'traccar', raw: {},
      },
      thresholds: { authorized_windows: [{ days: [1,2,3,4,5], start: '08:00', end: '17:00', timezone: 'America/Edmonton' }] },
    });
    expect(out.find((a) => a.alert_type === 'unauthorized_use')).toBeTruthy();
  });
  it('does not flag at near-zero speed even outside the window', () => {
    const out = evaluateFix({
      fix: {
        device_id: 'v', recorded_at: '2026-05-02T08:00:00Z',
        lat: 0, lng: 0, speed_kmh: 1, source: 'traccar', raw: {},
      },
      thresholds: { authorized_windows: [{ days: [1,2,3,4,5], start: '08:00', end: '17:00', timezone: 'America/Edmonton' }] },
    });
    expect(out.find((a) => a.alert_type === 'unauthorized_use')).toBeUndefined();
  });
});
