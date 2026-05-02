export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface TriggerEvent {
  /** Stable string keys understood by linkage_rules.event_types */
  type: string;                  // 'linecrossing','intrusion','motion','panic','speeding','asset_offline'…
  severity: Severity;
  org_id: string;
  site_id?: string;
  camera_id?: string;
  vehicle_id?: string;
  asset_id?: string;
  /** Free-form payload preserved into dispatch_events.payload */
  payload?: Record<string, unknown>;
  /** Effective time of the event. Used to evaluate arming schedules. */
  at: Date;
}

export interface ArmingWindow {
  /** ISO weekday numbers — 1=Mon … 7=Sun */
  days: Array<1|2|3|4|5|6|7>;
  /** Local 24h "HH:MM" within the schedule's timezone. */
  start: string;
  end: string;
}

export interface ArmingSchedule {
  id: string;
  name: string;
  spec: { windows: ArmingWindow[]; timezone: string };
  is_active: boolean;
}

export type ActionKind =
  | 'notify_push' | 'notify_sms' | 'notify_email' | 'notify_voice' | 'notify_surveillance_center'
  | 'fire_relay' | 'fire_siren' | 'talk_down'
  | 'ptz_preset'
  | 'create_incident'
  | 'dispatch_route'
  | 'webhook';

export interface Action {
  kind: ActionKind;
  /** Optional reference to a dispatch_route (for kind='dispatch_route'). */
  route_id?: string;
  /** Free-form per-action params (e.g. { message:'…' } or { preset:3 }) */
  params?: Record<string, unknown>;
}

export interface LinkageRule {
  id: string;
  scope_type: 'camera' | 'site' | 'org';
  scope_id?: string;
  event_types: string[];
  severity_min?: Severity | null;
  arming_schedule_id?: string | null;
  actions: Action[];
  priority: number;             // lower = first
  is_active: boolean;
}

export type RouteStrategy = 'round_robin' | 'escalation' | 'severity_escalation' | 'broadcast';

export interface RouteTarget {
  kind: 'guard' | 'desk' | 'police' | 'webhook' | 'phone';
  id?: string;                  // user_profile_id, dispatch_desk_id, …
  channel: 'sms' | 'voice' | 'push' | 'email' | 'webhook';
  address: string;              // phone number, email, URL, or push token
  cooldown_sec?: number;        // honoured per-target across calls
  ack_required?: boolean;
  /** Severity gate for severity_escalation strategy. */
  fires_at_or_above?: Severity;
}

export interface DispatchRoute {
  id: string;
  name: string;
  strategy: RouteStrategy;
  targets: RouteTarget[];
  is_active: boolean;
  rotation_state?: RotationState;
}

export interface RotationState {
  /** index of the next target to try in round_robin / escalation */
  cursor?: number;
  /** Map<target_address, last_fired_at_iso> */
  cooldowns?: Record<string, string>;
}

export interface EvaluationContext {
  rules: LinkageRule[];
  schedules: ArmingSchedule[];
  routes: Record<string, DispatchRoute>;   // keyed by route.id
}

export interface EvaluationResult {
  /** The single rule selected (most-specific × highest-priority) — null if none matched. */
  rule: LinkageRule | null;
  /** Concrete actions to execute, in order. */
  actions: Array<Action & { resolved_targets?: RouteTarget[] }>;
  /** Mutated rotation_state per route id, for the caller to persist. */
  next_rotation_state: Record<string, RotationState>;
  /** Why this rule was (or wasn't) picked — useful for audit + UI. */
  trace: string[];
}
