// Vehicle alert rules. Pure: in → fixes + thresholds, out → vehicle_alerts.
// The edge function calls this each time a fix lands and inserts the resulting
// alerts (deduped by alert_type within a small window).

import type { NormalizedFix } from './index.js';

export interface ThresholdSpec {
  /** km/h hard limit. Default 110 (highway) — override per vehicle/site. */
  speed_limit_kmh?: number;
  /** Idle threshold in km/h — speed below this counts as idling. */
  idle_threshold_kmh?: number;
  /** Idle minutes before raising idling alert. */
  idle_minutes?: number;
  /** ISO weekday (1..7) + HH:MM range when the vehicle is *authorized* to move.
   *  Anything outside this window emits 'unauthorized_use'. Empty = always allowed. */
  authorized_windows?: Array<{ days: number[]; start: string; end: string; timezone: string }>;
}

export interface VehicleAlertSpec {
  alert_type: 'speeding' | 'idling' | 'unauthorized_use' | 'offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  speed_kmh?: number;
  details?: Record<string, unknown>;
}

function localMinute(at: Date, tz: string): { weekday: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { weekday: map[parts.weekday!] ?? 1, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function inWindow(at: Date, w: { days: number[]; start: string; end: string; timezone: string }): boolean {
  const { weekday, minute } = localMinute(at, w.timezone);
  if (!w.days.includes(weekday)) return false;
  const [sh, sm] = w.start.split(':').map(Number);
  const [eh, em] = w.end.split(':').map(Number);
  const s = (sh ?? 0) * 60 + (sm ?? 0);
  const e = (eh ?? 0) * 60 + (em ?? 0);
  return s <= e ? (minute >= s && minute <= e) : (minute >= s || minute <= e);
}

export function evaluateFix(args: {
  fix: NormalizedFix;
  thresholds: ThresholdSpec;
  /** Recent prior fix, if any — used to detect idling and offline gaps. */
  prior?: NormalizedFix;
}): VehicleAlertSpec[] {
  const { fix, thresholds, prior } = args;
  const out: VehicleAlertSpec[] = [];

  // Severity: 0–25 over = medium, 25–50 over = high, 50+ over = critical.
  const limit = thresholds.speed_limit_kmh ?? 110;
  if (fix.speed_kmh != null && fix.speed_kmh > limit) {
    const over = fix.speed_kmh - limit;
    out.push({
      alert_type: 'speeding',
      severity: over > 50 ? 'critical' : over > 25 ? 'high' : 'medium',
      speed_kmh: fix.speed_kmh,
      details: { limit_kmh: limit },
    });
  }

  const idleThreshold = thresholds.idle_threshold_kmh ?? 3;
  const idleMin = thresholds.idle_minutes ?? 10;
  if (prior && fix.speed_kmh != null && prior.speed_kmh != null
      && fix.speed_kmh < idleThreshold && prior.speed_kmh < idleThreshold) {
    const elapsedMs = Date.parse(fix.recorded_at) - Date.parse(prior.recorded_at);
    if (elapsedMs >= idleMin * 60_000) {
      out.push({
        alert_type: 'idling',
        severity: 'low',
        details: { idle_minutes: Math.round(elapsedMs / 60_000) },
      });
    }
  }

  const windows = thresholds.authorized_windows ?? [];
  if (windows.length > 0) {
    const t = new Date(fix.recorded_at);
    const ok = windows.some((w) => inWindow(t, w));
    if (!ok && fix.speed_kmh != null && fix.speed_kmh > 5) {
      out.push({ alert_type: 'unauthorized_use', severity: 'medium', speed_kmh: fix.speed_kmh });
    }
  }

  return out;
}
