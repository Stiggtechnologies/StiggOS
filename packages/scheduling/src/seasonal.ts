// The seasonal patrol generator. Models the Northview MSA precisely:
//   • Summer (May–Oct): 1 visit/night to each core site, optional sites every other night.
//   • Winter (Nov–Apr): 2 visits/night (Wave 1 + Wave 2) to each core site, optional nightly.
//   • Times randomized within each wave's window.
//   • Flow A vs Flow B alternate by ISO week → site visit ordering changes weekly.
//   • Within a flow, sites get visits spread across the wave window so two adjacent
//     sites don't share the exact same minute every night.
//
// Seed: any string. Seed = `${contract_id}:${YYYY-MM}` is a good default — keeps
// the schedule stable across regenerations within a month, but reshuffles next month.

import { mulberry32, hash32 } from './rng.js';
import type { ProposedShift, ScheduleSite, SeasonalConfig } from './types.js';

interface GenerateArgs {
  config: SeasonalConfig;
  sites: ScheduleSite[];
  /** Inclusive start, exclusive end. Both as 'YYYY-MM-DD' in the contract tz. */
  start_date: string;
  end_date: string;
  /** Stable seed for determinism. */
  seed: string;
}

export function generateSchedule(args: GenerateArgs): ProposedShift[] {
  const { config, sites } = args;
  const rng = mulberry32(hash32(args.seed));
  const out: ProposedShift[] = [];

  const dates = enumerateDates(args.start_date, args.end_date);
  for (const day of dates) {
    const isWinter = config.winter_months.includes(day.getUTCMonth() + 1);
    const isSummer = config.summer_months.includes(day.getUTCMonth() + 1);
    if (!isWinter && !isSummer) continue;        // Defensive: gap months skipped.

    // Flow alternates by ISO week — A on even weeks, B on odd weeks.
    const flow = isoWeek(day) % 2 === 0 ? config.flows[0] : config.flows[1];
    const flowName: 'A' | 'B' = flow === config.flows[0] ? 'A' : 'B';

    // Walk sites in the flow's order so two adjacent sites get distinct random
    // offsets without colliding on the same minute.
    const ordering = flow.site_order.filter((id) => sites.some((s) => s.site_id === id));
    // Sites listed in scheduled but missing from the flow → append.
    for (const s of sites) if (!ordering.includes(s.site_id)) ordering.push(s.site_id);

    for (const siteId of ordering) {
      const site = sites.find((s) => s.site_id === siteId);
      if (!site) continue;

      const isOptional = !!site.is_optional;
      // Decide whether the optional site gets a visit tonight.
      if (isSummer && isOptional && (config.summer_optional_pattern ?? 'every_other_day') === 'every_other_day') {
        const dayOfYear = Math.floor((day.getTime() - Date.UTC(day.getUTCFullYear(), 0, 1)) / 86_400_000);
        if (dayOfYear % 2 !== 0) continue;
      }

      const visitsTonight = isWinter
        ? (site.winter_visits_per_night ?? config.winter_visits_per_night)
        : (site.summer_visits_per_night ?? config.summer_visits_per_night);

      // For optional sites in winter we keep one visit by default unless overridden.
      const adjusted = isOptional && isWinter ? (site.winter_visits_per_night ?? 1) : visitsTonight;

      for (let wave = 1; wave <= adjusted; wave++) {
        const useWave2 = wave === 2;
        const start = useWave2 ? config.wave_2_start : config.wave_1_start;
        const end   = useWave2 ? config.wave_2_end   : config.wave_1_end;
        const startMin = parseHHMM(start);
        const endMin   = parseHHMM(end);
        // Allow overnight wrap (start > end means wraps past midnight).
        const span = endMin > startMin ? endMin - startMin : (24 * 60 - startMin + endMin);
        // Reserve room so the visit fits before window end.
        const offset = Math.floor(rng() * Math.max(1, span - config.visit_duration_min));
        const startInst = atOffset(day, startMin + offset, config.timezone, useWave2);
        const endInst   = new Date(startInst.getTime() + config.visit_duration_min * 60_000);

        out.push({
          site_id: siteId,
          scheduled_start: startInst.toISOString(),
          scheduled_end:   endInst.toISOString(),
          shift_type: 'overnight',
          bill_rate: config.bill_rate_cad_hr,
          pay_rate:  config.pay_rate_cad_hr,
          flow: flowName,
          wave: wave as 1 | 2,
          status: 'scheduled',
          generated_by_ai: true,
        });
      }
    }
  }
  return out;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function enumerateDates(startISO: string, endISO: string): Date[] {
  const out: Date[] = [];
  const cur = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO   + 'T00:00:00Z');
  while (cur < end) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Build a Date for `day at offsetMin` in the given timezone. Wave-2 minutes
 *  past midnight roll to the *next* calendar day. */
function atOffset(day: Date, offsetMin: number, timezone: string, useWave2: boolean): Date {
  // Naive but correct enough: compute the local midnight UTC equivalent for
  // `day` in `timezone`, then add the offset. Times near DST transitions can
  // shift by an hour — acceptable for patrol scheduling (operators flex ±15
  // min anyway), and we annotate Wave 2 starts that wrap to the next day.
  const base = localMidnightUTC(day, timezone);
  if (useWave2 && offsetMin < 12 * 60) {
    // Wave 2 always belongs to the *next* civil day.
    return new Date(base.getTime() + (24 * 60 + offsetMin) * 60_000);
  }
  return new Date(base.getTime() + offsetMin * 60_000);
}

function localMidnightUTC(day: Date, timezone: string): Date {
  // Compute the UTC instant such that, when formatted in `timezone`, the
  // displayed time is exactly 00:00 on `day`'s civil date.
  //
  // Algorithm:
  //   1. Take Date.UTC(civilY,civilM,civilD,0,0,0) as a probe — this is
  //      midnight UTC, not midnight local.
  //   2. Format probe in target tz to discover its local Y/M/D + H:MM.
  //   3. Compute the day-drift (probe's local date vs civil date) and the
  //      minute-of-day. Shift probe by both to land on local 00:00.
  // Handles DST correctly because the offset comes from Intl, not arithmetic.
  const civilY = day.getUTCFullYear(), civilM = day.getUTCMonth(), civilD = day.getUTCDate();
  const naive = new Date(Date.UTC(civilY, civilM, civilD, 0, 0, 0));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(naive);
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  const ly = get('year'), lm = get('month'), ld = get('day');
  const lh = get('hour'),  lmin = get('minute');
  const localDayMs   = Date.UTC(ly, lm - 1, ld);
  const civilDayMs   = Date.UTC(civilY, civilM, civilD);
  const dayDriftMs   = localDayMs - civilDayMs;
  const localMinuteOfDay = lh * 60 + lmin;
  // Shift probe so that local Y/M/D = civil and local H:MM = 00:00.
  return new Date(naive.getTime() - dayDriftMs - localMinuteOfDay * 60_000);
}

function isoWeek(d: Date): number {
  // ISO 8601 week number — Thursday-based.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}
