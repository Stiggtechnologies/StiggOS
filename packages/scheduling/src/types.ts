export interface RouteFlow {
  /** 'A' or 'B' — alternates by week. The names mirror the Northview proposal. */
  id: string;
  /** ordered site_ids — flow A vs flow B differ in visit sequence to break predictability. */
  site_order: string[];
}

export interface ScheduleSite {
  site_id: string;
  /** True for the optional add-on (e.g. MacDonald): summer alternates, winter is nightly. */
  is_optional?: boolean;
  /** Override patterns per-site if needed; defaults inherit from SeasonalConfig. */
  summer_visits_per_night?: number;
  winter_visits_per_night?: number;
}

export interface SeasonalConfig {
  /** ISO month numbers belonging to each season. 1 = Jan. */
  summer_months: number[];
  winter_months: number[];
  /** Visits applied to *core* sites in each season. */
  summer_visits_per_night: number;
  winter_visits_per_night: number;
  /** Patrol windows, in the contract's local timezone. 24h "HH:MM". */
  wave_1_start: string;   // e.g. "19:30"
  wave_1_end:   string;   // e.g. "23:30"
  wave_2_start: string;   // e.g. "00:30"
  wave_2_end:   string;   // e.g. "03:30"
  /** Per-shift duration (minutes). Defaults to a quick patrol stop. */
  visit_duration_min: number;
  /** Two route flows to alternate weekly, breaking predictability. */
  flows: [RouteFlow, RouteFlow];
  timezone: string;       // 'America/Edmonton'
  bill_rate_cad_hr?: number;
  pay_rate_cad_hr?: number;
  /** Optional alternation rule for "is_optional" sites in summer.
   *  'every_other_day' = visit every 2nd day (day_of_year parity). */
  summer_optional_pattern?: 'every_other_day' | 'nightly';
}

export interface ProposedShift {
  site_id: string;
  scheduled_start: string;   // ISO
  scheduled_end:   string;   // ISO
  shift_type: 'standard' | 'overnight' | 'split' | 'on_call' | 'event';
  bill_rate?: number;
  pay_rate?: number;
  flow: 'A' | 'B';
  wave: 1 | 2;
  status: 'scheduled';
  generated_by_ai: boolean;
}
