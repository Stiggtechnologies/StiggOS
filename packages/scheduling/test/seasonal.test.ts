import { describe, expect, it } from 'vitest';
import { generateSchedule } from '../src/seasonal.js';
import type { ScheduleSite, SeasonalConfig } from '../src/types.js';

const sites: ScheduleSite[] = [
  { site_id: 'parkview1' },
  { site_id: 'parkview2' },
  { site_id: '6-nixon'  },
  { site_id: '4-nixon'  },
  { site_id: '16-saund' },
  { site_id: '15-saund' },
  { site_id: 'macdonald', is_optional: true },
];

const cfg: SeasonalConfig = {
  summer_months: [5,6,7,8,9,10],
  winter_months: [11,12,1,2,3,4],
  summer_visits_per_night: 1,
  winter_visits_per_night: 2,
  wave_1_start: '19:30',
  wave_1_end:   '23:30',
  wave_2_start: '00:30',
  wave_2_end:   '03:30',
  visit_duration_min: 25,
  flows: [
    { id: 'A', site_order: ['parkview1','parkview2','6-nixon','4-nixon','16-saund','15-saund','macdonald'] },
    { id: 'B', site_order: ['parkview1','6-nixon','16-saund','parkview2','4-nixon','15-saund','macdonald'] },
  ],
  timezone: 'America/Edmonton',
  bill_rate_cad_hr: 39.40,
  summer_optional_pattern: 'every_other_day',
};

describe('seasonal generator — summer', () => {
  it('emits 1 visit per core site per day', () => {
    // 7 days in June → 6 core sites × 7 = 42 core visits.
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 's1' });
    const core = out.filter((o) => sites.find((s) => s.site_id === o.site_id && !s.is_optional));
    expect(core.length).toBe(42);
    // Each core site appears 7 times.
    for (const s of sites.filter((x) => !x.is_optional)) {
      expect(core.filter((o) => o.site_id === s.site_id).length).toBe(7);
    }
  });

  it('schedules MacDonald every other night in summer', () => {
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 's1' });
    const md = out.filter((o) => o.site_id === 'macdonald');
    // Across 7 days every-other-day yields 3 or 4 visits (depends on start parity).
    expect(md.length).toBeGreaterThanOrEqual(3);
    expect(md.length).toBeLessThanOrEqual(4);
  });

  it('places Wave 1 visits within the configured window', () => {
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-02', seed: 's1' });
    for (const sh of out) {
      const tz = 'America/Edmonton';
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
      const parts = Object.fromEntries(fmt.formatToParts(new Date(sh.scheduled_start)).map((p) => [p.type, p.value]));
      const min = Number(parts.hour) * 60 + Number(parts.minute);
      // Wave 1 window 19:30–23:30 minus the 25-min visit duration head-room.
      expect(min).toBeGreaterThanOrEqual(19 * 60 + 30);
      expect(min).toBeLessThanOrEqual(23 * 60 + 30);
    }
  });

  it('is deterministic given the same seed', () => {
    const a = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 'fixed' });
    const b = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 'fixed' });
    expect(b).toEqual(a);
  });

  it('reshuffles when the seed changes', () => {
    const a = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 'one' });
    const b = generateSchedule({ config: cfg, sites, start_date: '2026-06-01', end_date: '2026-06-08', seed: 'two' });
    // We expect at least *some* visits to move. Same length though.
    expect(a.length).toBe(b.length);
    let differs = 0;
    for (let i = 0; i < a.length; i++) if (a[i]!.scheduled_start !== b[i]!.scheduled_start) differs++;
    expect(differs).toBeGreaterThan(0);
  });

  it('alternates flow A and flow B by ISO week', () => {
    // 2026-06-08 is a Monday — start of an ISO week.
    const wk1 = generateSchedule({ config: cfg, sites, start_date: '2026-06-08', end_date: '2026-06-09', seed: 'x' });
    const wk2 = generateSchedule({ config: cfg, sites, start_date: '2026-06-15', end_date: '2026-06-16', seed: 'x' });
    const flow1 = wk1[0]!.flow;
    const flow2 = wk2[0]!.flow;
    expect(flow1).not.toBe(flow2);
  });
});

describe('seasonal generator — winter', () => {
  it('emits 2 visits per core site per night and nightly MacDonald', () => {
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-12-01', end_date: '2026-12-08', seed: 'w1' });
    const core = out.filter((o) => sites.find((s) => s.site_id === o.site_id && !s.is_optional));
    expect(core.length).toBe(6 /*core sites*/ * 2 /*visits*/ * 7 /*days*/);
    const md = out.filter((o) => o.site_id === 'macdonald');
    expect(md.length).toBe(7);
  });

  it('produces both Wave 1 and Wave 2 entries per core site per night', () => {
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-12-01', end_date: '2026-12-02', seed: 'w2' });
    for (const s of sites.filter((x) => !x.is_optional)) {
      const visits = out.filter((o) => o.site_id === s.site_id);
      expect(visits.map((v) => v.wave).sort()).toEqual([1, 2]);
    }
  });

  it('places Wave 2 visits in the early-morning window', () => {
    const out = generateSchedule({ config: cfg, sites, start_date: '2026-12-01', end_date: '2026-12-02', seed: 'w3' });
    const wave2 = out.filter((o) => o.wave === 2);
    expect(wave2.length).toBeGreaterThan(0);
    for (const sh of wave2) {
      const tz = 'America/Edmonton';
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
      const parts = Object.fromEntries(fmt.formatToParts(new Date(sh.scheduled_start)).map((p) => [p.type, p.value]));
      const min = Number(parts.hour) * 60 + Number(parts.minute);
      expect(min).toBeGreaterThanOrEqual(0 * 60 + 30);
      expect(min).toBeLessThanOrEqual(3 * 60 + 30);
    }
  });
});
