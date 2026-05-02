import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/evaluate.js';
import type {
  ArmingSchedule, DispatchRoute, EvaluationContext, LinkageRule, TriggerEvent,
} from '../src/index.js';

const NOW_BIZ   = new Date('2026-05-01T18:00:00Z'); // Fri 12:00 Edmonton
const NOW_NIGHT = new Date('2026-05-02T08:00:00Z'); // Sat 02:00 Edmonton

const business: ArmingSchedule = {
  id: 'biz', name: 'biz', is_active: true,
  spec: { timezone: 'America/Edmonton', windows: [{ days: [1,2,3,4,5], start: '09:00', end: '17:00' }] },
};
const afterHours: ArmingSchedule = {
  id: 'ah', name: 'after-hours', is_active: true,
  spec: { timezone: 'America/Edmonton', windows: [{ days: [1,2,3,4,5,6,7], start: '17:01', end: '08:59' }] },
};

const guards: DispatchRoute = {
  id: 'guards-rr', name: 'guards rr', strategy: 'round_robin', is_active: true,
  targets: [
    { kind: 'guard', channel: 'sms', address: '+15875550001' },
    { kind: 'guard', channel: 'sms', address: '+15875550002' },
  ],
};
const escalation: DispatchRoute = {
  id: 'esc', name: 'escalation', strategy: 'severity_escalation', is_active: true,
  targets: [
    { kind: 'desk',   channel: 'webhook', address: 'https://desk', fires_at_or_above: 'low' },
    { kind: 'police', channel: 'voice',   address: '+19115550001', fires_at_or_above: 'critical' },
  ],
};

const baseRules: LinkageRule[] = [
  // Org-wide: notify-only on motion.
  {
    id: 'r-org', scope_type: 'org', priority: 100, is_active: true,
    event_types: ['motion','linecrossing'],
    actions: [{ kind: 'notify_push', params: { channel: 'app' } }],
  },
  // Site-specific: louder on linecrossing during business hours.
  {
    id: 'r-site-biz', scope_type: 'site', scope_id: 'site-1', priority: 50, is_active: true,
    event_types: ['linecrossing'],
    arming_schedule_id: 'biz',
    actions: [
      { kind: 'notify_push' },
      { kind: 'dispatch_route', route_id: 'guards-rr' },
    ],
  },
  // Site-specific: full dispatch + relays after hours.
  {
    id: 'r-site-night', scope_type: 'site', scope_id: 'site-1', priority: 50, is_active: true,
    event_types: ['linecrossing','intrusion'],
    arming_schedule_id: 'ah',
    actions: [
      { kind: 'fire_relay', params: { name: 'siren' } },
      { kind: 'fire_siren' },
      { kind: 'dispatch_route', route_id: 'esc' },
    ],
  },
];

const ctx: EvaluationContext = {
  rules: baseRules,
  schedules: [business, afterHours],
  routes: { 'guards-rr': guards, 'esc': escalation },
};

const ev = (over: Partial<TriggerEvent>): TriggerEvent => ({
  type: 'linecrossing', severity: 'medium', org_id: 'o', site_id: 'site-1', at: NOW_BIZ, ...over,
});

describe('evaluate — rule selection', () => {
  it('prefers site rule over org rule when both match', () => {
    const r = evaluate({ event: ev({}), ctx });
    expect(r.rule?.id).toBe('r-site-biz');
  });

  it('falls back to org rule when site rule is gated out by arming', () => {
    // Linecrossing on a Saturday — site-biz fails; site-night matches; expect site-night to win.
    const r = evaluate({ event: ev({ at: NOW_NIGHT }), ctx });
    expect(r.rule?.id).toBe('r-site-night');
  });

  it('emits empty actions when armed-rule fails its schedule (fail closed)', () => {
    const ctx2 = { ...ctx, rules: [baseRules[1]!] }; // only the biz-armed rule
    const r = evaluate({ event: ev({ at: NOW_NIGHT }), ctx: ctx2 });
    expect(r.actions).toEqual([]);
  });
});

describe('evaluate — action fan-out', () => {
  it('resolves dispatch_route targets through the rotation', () => {
    const r = evaluate({ event: ev({}), ctx });
    const dispatch = r.actions.find((a) => a.kind === 'dispatch_route')!;
    expect(dispatch.resolved_targets).toBeDefined();
    expect(dispatch.resolved_targets!.length).toBe(1);
    expect(dispatch.resolved_targets![0]!.address).toBe('+15875550001');
    // Mutated state advances the cursor.
    expect(r.next_rotation_state['guards-rr']!.cursor).toBe(1);
  });

  it('fires both relay and siren on after-hours intrusion + escalates to desk', () => {
    const r = evaluate({ event: ev({ type: 'intrusion', severity: 'high', at: NOW_NIGHT }), ctx });
    const kinds = r.actions.map((a) => a.kind);
    expect(kinds).toEqual(['fire_relay', 'fire_siren', 'dispatch_route']);
    const dispatch = r.actions.find((a) => a.kind === 'dispatch_route')!;
    expect(dispatch.resolved_targets![0]!.address).toBe('https://desk'); // desk fires from low+
  });

  it('police target only fires at critical', () => {
    const r = evaluate({ event: ev({ type: 'intrusion', severity: 'critical', at: NOW_NIGHT }), ctx });
    const dispatch = r.actions.find((a) => a.kind === 'dispatch_route')!;
    // severity_escalation picks the FIRST matching — desk also matches at critical.
    expect(dispatch.resolved_targets![0]!.address).toBe('https://desk');
  });

  it('returns no rule when nothing matches', () => {
    const r = evaluate({ event: ev({ type: 'unattended_baggage' }), ctx });
    expect(r.rule).toBeNull();
    expect(r.actions).toEqual([]);
  });

  it('records a useful trace for audit', () => {
    const r = evaluate({ event: ev({}), ctx });
    expect(r.trace.some((t) => t.includes('picked rule'))).toBe(true);
    expect(r.trace.some((t) => t.includes('armed'))).toBe(true);
    expect(r.trace.some((t) => t.includes('route'))).toBe(true);
  });
});

describe('evaluate — severity gating', () => {
  it('respects severity_min on rules', () => {
    const ctx2 = {
      ...ctx,
      rules: [{ ...baseRules[0]!, severity_min: 'high' as const }],
    };
    const low = evaluate({ event: ev({ severity: 'low' }), ctx: ctx2 });
    expect(low.rule).toBeNull();
    const high = evaluate({ event: ev({ severity: 'high' }), ctx: ctx2 });
    expect(high.rule?.id).toBe('r-org');
  });
});
