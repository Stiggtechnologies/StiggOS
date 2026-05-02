// Deno-side mirror of @stigg/dispatch — pure logic, same semantics. We
// intentionally duplicate rather than imported from the npm package because
// supabase functions deploy bundles each function alone; pulling a workspace
// package adds esm.sh resolution friction.

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ArmingWindow { days: Array<1|2|3|4|5|6|7>; start: string; end: string }
export interface ArmingSchedule {
  id: string; name: string; is_active: boolean;
  spec: { windows: ArmingWindow[]; timezone: string };
}

export interface RouteTarget {
  kind: 'guard'|'desk'|'police'|'webhook'|'phone';
  id?: string; channel: 'sms'|'voice'|'push'|'email'|'webhook';
  address: string; cooldown_sec?: number; ack_required?: boolean;
  fires_at_or_above?: Severity;
}
export interface DispatchRoute {
  id: string; name: string; is_active: boolean;
  strategy: 'round_robin'|'escalation'|'severity_escalation'|'broadcast';
  targets: RouteTarget[];
  rotation_state?: { cursor?: number; cooldowns?: Record<string,string> };
}

export interface Action {
  kind: string;
  route_id?: string;
  params?: Record<string, unknown>;
}
export interface LinkageRule {
  id: string;
  scope_type: 'camera'|'site'|'org';
  scope_id?: string;
  event_types: string[];
  severity_min?: Severity | null;
  arming_schedule_id?: string | null;
  actions: Action[];
  priority: number;
  is_active: boolean;
}
export interface TriggerEvent {
  type: string; severity: Severity;
  org_id: string; site_id?: string; camera_id?: string;
  vehicle_id?: string; asset_id?: string;
  payload?: Record<string, unknown>;
  at: Date;
}

const SEV: Record<Severity, number> = { low:0, medium:1, high:2, critical:3 };
const WMAP: Record<string, number> = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };

export function isArmed(at: Date, sch: ArmingSchedule): boolean {
  if (!sch.is_active) return false;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: sch.spec.timezone || 'UTC', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const wd = WMAP[parts.weekday!] ?? 1;
  const min = Number(parts.hour) * 60 + Number(parts.minute);
  for (const w of sch.spec.windows) {
    if (!w.days.includes(wd as any)) continue;
    const [sh,sm] = w.start.split(':').map(Number);
    const [eh,em] = w.end.split(':').map(Number);
    const s = (sh??0)*60+(sm??0); const e = (eh??0)*60+(em??0);
    if (s <= e ? (min >= s && min <= e) : (min >= s || min <= e)) return true;
  }
  return false;
}

export interface Selection { picked: RouteTarget[]; next_state: NonNullable<DispatchRoute['rotation_state']> }
export function selectTarget(args: { route: DispatchRoute; severity: Severity; now: Date }): Selection {
  const { route, severity, now } = args;
  const state = route.rotation_state ?? {};
  let next = { ...state };
  const onCooldown = (t: RouteTarget) => {
    if (!t.cooldown_sec || !state.cooldowns?.[t.address]) return false;
    return now.getTime() - Date.parse(state.cooldowns[t.address]!) < t.cooldown_sec * 1000;
  };
  const bump = (t: RouteTarget) => {
    if (!t.cooldown_sec) return;
    next.cooldowns = { ...(next.cooldowns ?? {}), [t.address]: now.toISOString() };
  };
  if (route.strategy === 'broadcast') {
    const eligible = route.targets.filter((t) =>
      (!t.fires_at_or_above || SEV[severity] >= SEV[t.fires_at_or_above]) && !onCooldown(t),
    );
    eligible.forEach(bump);
    return { picked: eligible, next_state: next };
  }
  if (route.strategy === 'severity_escalation') {
    for (const t of route.targets) {
      const min = t.fires_at_or_above ?? 'low';
      if (SEV[severity] < SEV[min]) continue;
      if (onCooldown(t)) continue;
      bump(t);
      return { picked: [t], next_state: next };
    }
    return { picked: [], next_state: next };
  }
  if (route.strategy === 'escalation') {
    const cur = state.cursor ?? 0;
    const t = route.targets[cur];
    if (!t) return { picked: [], next_state: { ...next, cursor: 0 } };
    if (onCooldown(t)) {
      next.cursor = (cur + 1) % route.targets.length;
      const t2 = route.targets[next.cursor];
      if (!t2) return { picked: [], next_state: next };
      bump(t2);
      return { picked: [t2], next_state: next };
    }
    bump(t);
    next.cursor = (cur + 1) % route.targets.length;
    return { picked: [t], next_state: next };
  }
  // round_robin
  const start = state.cursor ?? 0;
  for (let i = 0; i < route.targets.length; i++) {
    const idx = (start + i) % route.targets.length;
    const t = route.targets[idx]!;
    if (onCooldown(t)) continue;
    next.cursor = (idx + 1) % route.targets.length;
    bump(t);
    return { picked: [t], next_state: next };
  }
  return { picked: [], next_state: next };
}

export interface EvalContext {
  rules: LinkageRule[];
  schedules: ArmingSchedule[];
  routes: Record<string, DispatchRoute>;
}
export interface EvalResult {
  rule: LinkageRule | null;
  actions: Array<Action & { resolved_targets?: RouteTarget[] }>;
  next_rotation_state: Record<string, NonNullable<DispatchRoute['rotation_state']>>;
  trace: string[];
}

export function evaluate(args: { event: TriggerEvent; ctx: EvalContext }): EvalResult {
  const { event, ctx } = args;
  const trace: string[] = [];
  const matched = ctx.rules.filter((r) => {
    if (!r.is_active) return false;
    if (!r.event_types.includes(event.type)) return false;
    if (r.severity_min && SEV[event.severity] < SEV[r.severity_min]) return false;
    if (r.scope_type === 'org') return true;
    if (r.scope_type === 'site') return r.scope_id === event.site_id;
    if (r.scope_type === 'camera') return r.scope_id === event.camera_id;
    return false;
  });
  if (matched.length === 0) { trace.push('no rules matched'); return { rule: null, actions: [], next_rotation_state: {}, trace }; }
  const armed = matched.filter((r) => {
    if (!r.arming_schedule_id) return true;
    const sch = ctx.schedules.find((s) => s.id === r.arming_schedule_id);
    if (!sch) return false;
    return isArmed(event.at, sch);
  });
  if (armed.length === 0) { trace.push('no armed rule matches'); return { rule: null, actions: [], next_rotation_state: {}, trace }; }
  const spec = (r: LinkageRule) => r.scope_type === 'camera' ? 0 : r.scope_type === 'site' ? 1 : 2;
  armed.sort((a, b) => spec(a) - spec(b) || a.priority - b.priority);
  const rule = armed[0]!;
  trace.push(`picked rule ${rule.id}`);
  const next: Record<string, NonNullable<DispatchRoute['rotation_state']>> = {};
  const actions: EvalResult['actions'] = [];
  for (const a of rule.actions) {
    if (a.kind !== 'dispatch_route') { actions.push(a); continue; }
    const route = a.route_id ? ctx.routes[a.route_id] : undefined;
    if (!route || !route.is_active) { trace.push(`route ${a.route_id} missing/inactive`); continue; }
    const sel = selectTarget({ route, severity: event.severity, now: event.at });
    next[route.id] = sel.next_state;
    actions.push({ ...a, resolved_targets: sel.picked });
    trace.push(`route "${route.name}" → ${sel.picked.length}`);
  }
  return { rule, actions, next_rotation_state: next, trace };
}
