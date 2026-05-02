// Stigg dispatch engine — deterministic event-routing.
//
// Inputs:
//   • a triggered event (camera, panic, vehicle, asset, manual)
//   • a set of linkage rules (already filtered to the org/site/camera)
//   • the active arming schedules
//   • the dispatch routes referenced by the rules' actions
//   • current time + the route's rotation_state
//
// Outputs (pure, no side effects):
//   • the chosen rule
//   • a list of Action items the caller will execute (push, sms, voice, relay,
//     siren, talk-down, webhook, mobile-patrol, police, monitoring desk)
//   • the new rotation_state to persist
//
// The evaluator is intentionally pure so we can unit test the entire decision
// matrix without mocking webhooks. The edge function is a thin shell that
// calls evaluate() and then performs the listed actions.

export { evaluate } from './evaluate.js';
export { isArmed } from './arming.js';
export { selectTarget } from './rotation.js';
export type {
  TriggerEvent, LinkageRule, ArmingSchedule, DispatchRoute, RouteTarget,
  Action, EvaluationResult, RotationState,
} from './types.js';
