import { describe, expect, it } from 'vitest';
import { selectTarget } from '../src/rotation.js';
import type { DispatchRoute, RouteTarget } from '../src/index.js';

const NOW = new Date('2026-05-01T12:00:00Z');

const t = (over: Partial<RouteTarget>): RouteTarget => ({
  kind: 'guard', channel: 'sms', address: 'X', ...over,
});

describe('round_robin', () => {
  it('advances the cursor after each pick', () => {
    const route: DispatchRoute = {
      id: 'r', name: 'rr', strategy: 'round_robin', is_active: true,
      targets: [t({ address: 'A' }), t({ address: 'B' }), t({ address: 'C' })],
      rotation_state: {},
    };
    const r1 = selectTarget({ route, severity: 'medium', now: NOW });
    expect(r1.picked[0]!.address).toBe('A');
    expect(r1.next_state.cursor).toBe(1);
    const r2 = selectTarget({ route: { ...route, rotation_state: r1.next_state }, severity: 'medium', now: NOW });
    expect(r2.picked[0]!.address).toBe('B');
    const r3 = selectTarget({ route: { ...route, rotation_state: r2.next_state }, severity: 'medium', now: NOW });
    expect(r3.picked[0]!.address).toBe('C');
    const r4 = selectTarget({ route: { ...route, rotation_state: r3.next_state }, severity: 'medium', now: NOW });
    expect(r4.picked[0]!.address).toBe('A');
  });

  it('skips targets in cooldown and records a new cooldown', () => {
    const route: DispatchRoute = {
      id: 'r', name: 'rr', strategy: 'round_robin', is_active: true,
      targets: [t({ address: 'A', cooldown_sec: 60 }), t({ address: 'B' })],
      rotation_state: { cooldowns: { A: NOW.toISOString() } },
    };
    const r = selectTarget({ route, severity: 'medium', now: new Date(NOW.getTime() + 10_000) });
    expect(r.picked[0]!.address).toBe('B');
  });
});

describe('severity_escalation', () => {
  it('fires the first target whose fires_at_or_above is matched', () => {
    const route: DispatchRoute = {
      id: 'r', name: 'sev', strategy: 'severity_escalation', is_active: true,
      targets: [
        t({ address: 'desk',   fires_at_or_above: 'low' }),
        t({ address: 'guard',  fires_at_or_above: 'medium' }),
        t({ address: 'police', fires_at_or_above: 'critical' }),
      ],
    };
    expect(selectTarget({ route, severity: 'low', now: NOW }).picked[0]!.address).toBe('desk');
    expect(selectTarget({ route, severity: 'high', now: NOW }).picked[0]!.address).toBe('desk');
    // The first matching target wins by design — desk handles all severities >= low.
    // For police-only behaviour, raise desk's threshold or use 'broadcast'.
  });
});

describe('broadcast', () => {
  it('returns every eligible target at or above the severity threshold', () => {
    const route: DispatchRoute = {
      id: 'r', name: 'all', strategy: 'broadcast', is_active: true,
      targets: [
        t({ address: 'desk',   fires_at_or_above: 'low' }),
        t({ address: 'guard',  fires_at_or_above: 'medium' }),
        t({ address: 'police', fires_at_or_above: 'critical' }),
      ],
    };
    expect(selectTarget({ route, severity: 'high', now: NOW }).picked.map((p) => p.address))
      .toEqual(['desk', 'guard']);
    expect(selectTarget({ route, severity: 'critical', now: NOW }).picked.map((p) => p.address))
      .toEqual(['desk', 'guard', 'police']);
  });
});
