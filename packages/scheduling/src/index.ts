// Deterministic patrol-schedule generator.
//
// Inputs: a SeasonalConfig describing the contract, the list of sites,
// and a date range. Output: a list of ProposedShift rows ready to insert.
//
// Pure: same seed → same schedule. Operators get a "regenerate" button that
// preserves stability; only when the seed changes do shifts move.

export { generateSchedule } from './seasonal.js';
export { pickSeasonalRate } from './pricing.js';
export type {
  SeasonalConfig, ProposedShift, ScheduleSite, RouteFlow,
} from './types.js';
