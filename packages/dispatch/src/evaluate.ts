// Top-level evaluator: pick the right rule, gate on the arming schedule,
// fan-out actions, resolve dispatch_route targets.

import { isArmed } from './arming.js';
import { selectTarget } from './rotation.js';
import type {
  Action, ArmingSchedule, EvaluationContext, EvaluationResult,
  LinkageRule, RotationState, Severity, TriggerEvent,
} from './types.js';

const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function specificity(rule: LinkageRule): number {
  // camera > site > org. Lower priority number wins ties.
  return rule.scope_type === 'camera' ? 0 : rule.scope_type === 'site' ? 1 : 2;
}

function appliesTo(rule: LinkageRule, ev: TriggerEvent): boolean {
  if (!rule.is_active) return false;
  if (!rule.event_types.includes(ev.type)) return false;
  if (rule.severity_min && SEV_RANK[ev.severity] < SEV_RANK[rule.severity_min]) return false;
  if (rule.scope_type === 'org') return true;
  if (rule.scope_type === 'site') return rule.scope_id === ev.site_id;
  if (rule.scope_type === 'camera') return rule.scope_id === ev.camera_id;
  return false;
}

export function evaluate(args: { event: TriggerEvent; ctx: EvaluationContext }): EvaluationResult {
  const { event, ctx } = args;
  const trace: string[] = [];

  // 1) Filter by event match (type, severity, scope).
  const matched = ctx.rules.filter((r) => appliesTo(r, event));
  if (matched.length === 0) {
    trace.push('no rules matched');
    return { rule: null, actions: [], next_rotation_state: {}, trace };
  }

  // 2) Filter by arming schedule. A rule whose schedule isn't armed is treated
  //    as not matching — the next-best candidate gets a turn. This mirrors how
  //    operators reason: "the daytime rule doesn't apply right now, use the
  //    nighttime rule instead."
  const armed = matched.filter((r) => {
    if (!r.arming_schedule_id) return true;
    const sch = ctx.schedules.find((s) => s.id === r.arming_schedule_id);
    if (!sch) { trace.push(`rule ${r.id} references missing schedule ${r.arming_schedule_id}`); return false; }
    const ok = isArmed(event.at, sch);
    trace.push(`rule ${r.id}: ${ok ? 'armed' : 'not armed'} by "${sch.name}"`);
    return ok;
  });

  if (armed.length === 0) {
    trace.push('matched rules exist but none are currently armed');
    return { rule: null, actions: [], next_rotation_state: {}, trace };
  }

  // 3) Pick most-specific × highest-priority among armed candidates.
  armed.sort((a, b) => specificity(a) - specificity(b) || a.priority - b.priority);
  const rule = armed[0]!;
  trace.push(`picked rule ${rule.id} (scope=${rule.scope_type}, priority=${rule.priority})`);

  // Fan-out actions, resolving dispatch_route targets.
  const next: Record<string, RotationState> = {};
  const actions: EvaluationResult['actions'] = [];

  for (const a of rule.actions) {
    if (a.kind !== 'dispatch_route') {
      actions.push(a);
      continue;
    }
    const route = a.route_id ? ctx.routes[a.route_id] : undefined;
    if (!route || !route.is_active) {
      trace.push(`dispatch_route ${a.route_id} missing or inactive`);
      continue;
    }
    const sel = selectTarget({ route, severity: event.severity, now: event.at });
    next[route.id] = sel.next_state;
    actions.push({ ...a, resolved_targets: sel.picked });
    trace.push(`route "${route.name}" → ${sel.picked.length} target(s)`);
  }

  return { rule, actions, next_rotation_state: next, trace };
}
