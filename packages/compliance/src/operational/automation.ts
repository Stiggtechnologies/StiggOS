// Operational rules — not statutory, but they catch the kind of drift that
// turns into incidents if ignored. The Compliance Co-pilot consumes these
// alongside SSIA / OHS / PIPEDA findings.

import type { Finding, RuleFn } from '../types.js';

const HOUR_MS = 60 * 60 * 1000;

// Asset trackers (AirTag etc.) silent for > 24 hours.
const assetOffline: RuleFn = (ctx) => {
  const now = (ctx.now ?? new Date()).getTime();
  const out: Finding[] = [];
  for (const a of ctx.asset_trackers ?? []) {
    if (!a.is_active) continue;
    if (!a.last_seen_at) {
      out.push({
        rule_id: 'OPS-ASSET-NOPING',
        severity: 'medium', scope_type: 'org',
        title: `Asset tracker "${a.label}" has never reported`,
        description: 'No ping has ever been received from this tracker. Verify the bridge is online and the device is paired.',
        regulatory_anchor: 'internal/asset-accountability',
        recommended_action: 'Confirm tracker is powered + within range of the bridge.',
        citations: [{ table: 'asset_trackers', id: a.id }],
      });
      continue;
    }
    const ageH = (now - Date.parse(a.last_seen_at)) / HOUR_MS;
    if (ageH > 72) {
      out.push({
        rule_id: 'OPS-ASSET-LOST',
        severity: 'high', scope_type: 'org',
        title: `Asset "${a.label}" silent for ${Math.round(ageH)}h`,
        description: 'Tracker silent > 72h. Treat as potentially lost — verify physically, escalate if still missing.',
        regulatory_anchor: 'internal/asset-accountability',
        recommended_action: 'Verify physical possession; if missing, log under incidents and notify supervisor.',
        citations: [{ table: 'asset_trackers', id: a.id }],
      });
    } else if (ageH > 24) {
      out.push({
        rule_id: 'OPS-ASSET-STALE',
        severity: 'low', scope_type: 'org',
        title: `Asset "${a.label}" silent for ${Math.round(ageH)}h`,
        description: 'Tracker has not reported in over a day. Often a battery issue.',
        regulatory_anchor: 'internal/asset-accountability',
        recommended_action: 'Replace battery / check tracker placement.',
        citations: [{ table: 'asset_trackers', id: a.id }],
      });
    }
    if (a.battery_pct != null && a.battery_pct < 15) {
      out.push({
        rule_id: 'OPS-ASSET-BATT',
        severity: 'low', scope_type: 'org',
        title: `Asset "${a.label}" battery at ${a.battery_pct}%`,
        description: 'Tracker battery is below 15%.',
        regulatory_anchor: 'internal/asset-accountability',
        recommended_action: 'Replace the battery within the next maintenance pass.',
        citations: [{ table: 'asset_trackers', id: a.id }],
      });
    }
  }
  return out;
};

// Vehicles racking up alerts (speeding/idling) over the last 7 days.
const vehicleAlertBacklog: RuleFn = (ctx) => {
  return (ctx.vehicle_alert_counts ?? []).flatMap((v) => {
    if (v.count_7d < 5) return [];
    const sev = v.severity_max === 'critical' ? 'critical'
              : v.count_7d > 20 || v.severity_max === 'high' ? 'high'
              : 'medium';
    return [{
      rule_id: 'OPS-VEHICLE-DRIFT',
      severity: sev as Finding['severity'], scope_type: 'org',
      title: `Vehicle ${v.unit_number} — ${v.count_7d} alerts (7d)`,
      description: `Repeated speeding/idling/unauthorized-use signals over the last week.`,
      regulatory_anchor: 'internal/fleet-conduct',
      recommended_action: 'Review track history with the assigned driver. Consider mandatory coaching.',
      citations: [{ table: 'vehicles', id: v.vehicle_id }],
    }];
  });
};

// Sites with repeated missed tour scans in the last 24h.
const missedToursTrend: RuleFn = (ctx) => {
  return (ctx.tour_misses ?? []).flatMap((t) => {
    if (t.missed_count_24h < 2) return [];
    return [{
      rule_id: 'OPS-TOUR-MISS',
      severity: t.missed_count_24h >= 5 ? 'high' : 'medium',
      scope_type: 'site' as const,
      scope_id: t.site_id,
      title: `${t.missed_count_24h} missed tour scans at ${t.site_name} (24h)`,
      description: 'Multiple expected checkpoint scans were not completed within their window.',
      regulatory_anchor: 'internal/post-orders',
      recommended_action: 'Spot-check the site; review the assigned guard\'s GPS track for that shift.',
      citations: [{ table: 'sites', id: t.site_id }],
    }];
  });
};

export const automationRules: RuleFn[] = [assetOffline, vehicleAlertBacklog, missedToursTrend];
