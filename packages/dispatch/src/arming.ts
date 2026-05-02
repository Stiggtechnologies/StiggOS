// Pure arming-schedule evaluator.
//
// We compute the local-time weekday + minute-of-day in the schedule's tz
// without pulling a tz library: convert the input UTC Date through
// Intl.DateTimeFormat with the schedule timezone — this handles DST.

import type { ArmingSchedule, ArmingWindow } from './types.js';

interface Local { weekday: number; minute: number }   // weekday 1..7 (Mon..Sun), minute 0..1439

function localFromUTC(at: Date, timezone: string): Local {
  // The Intl 'short' weekday gives us Mon..Sun via a fixed mapping.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, hour12: false,
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const wmap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = wmap[parts.weekday!] ?? 1;
  const minute = (Number(parts.hour) * 60) + Number(parts.minute);
  return { weekday, minute };
}

function windowMinutes(w: ArmingWindow): { start: number; end: number } {
  const [sh, sm] = w.start.split(':').map(Number);
  const [eh, em] = w.end.split(':').map(Number);
  return { start: (sh ?? 0) * 60 + (sm ?? 0), end: (eh ?? 0) * 60 + (em ?? 0) };
}

export function isArmed(at: Date, schedule: ArmingSchedule): boolean {
  if (!schedule.is_active) return false;
  const tz = schedule.spec.timezone || 'UTC';
  const { weekday, minute } = localFromUTC(at, tz);
  for (const w of schedule.spec.windows) {
    if (!w.days.includes(weekday as 1|2|3|4|5|6|7)) continue;
    const { start, end } = windowMinutes(w);
    if (start <= end) {
      // Same-day window e.g. 09:00–17:00.
      if (minute >= start && minute <= end) return true;
    } else {
      // Overnight window e.g. 22:00–06:00.
      if (minute >= start || minute <= end) return true;
    }
  }
  return false;
}
