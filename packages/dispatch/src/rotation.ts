// Target selection for a dispatch route. Pure — returns the picked targets
// AND the next rotation_state, never mutates inputs.

import type { DispatchRoute, RotationState, RouteTarget, Severity } from './types.js';

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function isOnCooldown(target: RouteTarget, state: RotationState | undefined, now: Date): boolean {
  if (!target.cooldown_sec || !state?.cooldowns) return false;
  const last = state.cooldowns[target.address];
  if (!last) return false;
  return now.getTime() - Date.parse(last) < target.cooldown_sec * 1_000;
}

function bumpCooldown(target: RouteTarget, state: RotationState, now: Date): RotationState {
  if (!target.cooldown_sec) return state;
  return {
    ...state,
    cooldowns: { ...(state.cooldowns ?? {}), [target.address]: now.toISOString() },
  };
}

export interface Selection {
  picked: RouteTarget[];
  next_state: RotationState;
}

export function selectTarget(args: {
  route: DispatchRoute;
  severity: Severity;
  now: Date;
}): Selection {
  const { route, severity, now } = args;
  const state: RotationState = route.rotation_state ?? {};
  let next: RotationState = { ...state };

  if (route.strategy === 'broadcast') {
    const eligible = route.targets.filter((t) =>
      (!t.fires_at_or_above || SEVERITY_RANK[severity] >= SEVERITY_RANK[t.fires_at_or_above])
      && !isOnCooldown(t, state, now),
    );
    for (const t of eligible) next = bumpCooldown(t, next, now);
    return { picked: eligible, next_state: next };
  }

  if (route.strategy === 'severity_escalation') {
    // Each target carries fires_at_or_above. Fire the first matching one.
    for (const t of route.targets) {
      const min = t.fires_at_or_above ?? 'low';
      if (SEVERITY_RANK[severity] < SEVERITY_RANK[min]) continue;
      if (isOnCooldown(t, state, now)) continue;
      next = bumpCooldown(t, next, now);
      return { picked: [t], next_state: next };
    }
    return { picked: [], next_state: next };
  }

  if (route.strategy === 'escalation') {
    // Always start at the top of the chain. The caller reissues with state if
    // the first target doesn't ack within the timeout — we bump cursor then.
    const cursor = state.cursor ?? 0;
    const t = route.targets[cursor];
    if (!t) return { picked: [], next_state: { ...next, cursor: 0 } };
    if (isOnCooldown(t, state, now)) {
      // Try the next one.
      next.cursor = (cursor + 1) % route.targets.length;
      const t2 = route.targets[next.cursor];
      if (!t2) return { picked: [], next_state: next };
      next = bumpCooldown(t2, next, now);
      return { picked: [t2], next_state: next };
    }
    next = bumpCooldown(t, next, now);
    next.cursor = (cursor + 1) % route.targets.length;
    return { picked: [t], next_state: next };
  }

  // round_robin (default)
  const start = state.cursor ?? 0;
  for (let i = 0; i < route.targets.length; i++) {
    const idx = (start + i) % route.targets.length;
    const t = route.targets[idx]!;
    if (isOnCooldown(t, state, now)) continue;
    next.cursor = (idx + 1) % route.targets.length;
    next = bumpCooldown(t, next, now);
    return { picked: [t], next_state: next };
  }
  return { picked: [], next_state: next };
}
