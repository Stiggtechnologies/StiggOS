// POST /functions/v1/contract-kpi-snapshot
// Body: { contract_id: string, month: 'YYYY-MM' }
//
// Computes the five KPI buckets for the contract for the requested month and
// upserts a contract_kpi_snapshots row. The values are pulled from live data:
//   • Patrol Delivery       — v_contract_patrol_delivery view
//   • Asset Protection      — incidents (categories: vandalism, theft, trespass)
//   • Incident Response     — incident reported→resolved deltas
//   • Hotspot Trends        — incident counts by site + time band
//   • Maintenance Impact    — placeholder until tickets are imported
//
// The dashboard page calls this to materialize a snapshot any time. A monthly
// pg_cron job calls it on the 1st of each month for every active contract.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;
  if (!['owner','admin','manager'].includes(ctx.role)) return json(req, 403, { error: 'requires manager+' });

  const body = await req.json().catch(() => ({}));
  const contract_id = (body as { contract_id?: string }).contract_id;
  const month = (body as { month?: string }).month;
  if (!contract_id || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return json(req, 400, { error: 'contract_id + month=YYYY-MM required' });
  }

  const start = `${month}-01`;
  const startDate = new Date(start + 'T00:00:00Z');
  const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));
  const end = endDate.toISOString().slice(0, 10);

  const { data: links } = await ctx.user.from('contract_sites')
    .select('site_id').eq('contract_id', contract_id).is('removed_at', null);
  const siteIds = (links ?? []).map((r: any) => r.site_id);
  if (siteIds.length === 0) return json(req, 200, { snapshot_id: null, note: 'no sites linked' });

  // Patrol Delivery — completed vs scheduled.
  const { data: shifts } = await ctx.user.from('shifts')
    .select('id, status, scheduled_start, scheduled_end, actual_start, actual_end')
    .in('site_id', siteIds)
    .gte('scheduled_start', startDate.toISOString())
    .lt('scheduled_start', new Date(endDate.getTime() + 86_400_000).toISOString());
  const total = shifts?.length ?? 0;
  const completed = shifts?.filter((s: any) => s.status === 'completed').length ?? 0;
  const noShows  = shifts?.filter((s: any) => s.status === 'no_show').length ?? 0;
  const completionPct = total > 0 ? +(100 * completed / total).toFixed(2) : null;

  // Incidents in the period.
  const { data: incidents } = await ctx.user.from('incidents')
    .select('id, site_id, category, severity, status, occurred_at, resolved_at')
    .in('site_id', siteIds)
    .gte('occurred_at', startDate.toISOString())
    .lt('occurred_at', new Date(endDate.getTime() + 86_400_000).toISOString());

  const all = (incidents ?? []) as Array<{ id: string; site_id: string; category: string; severity: string; status: string; occurred_at: string; resolved_at: string | null }>;

  // Asset Protection — vandalism / theft / trespass (the "damage" buckets).
  const assetCats = new Set(['vandalism', 'theft', 'trespass']);
  const assetIncidents = all.filter((i) => assetCats.has(i.category));
  const asset_protection = {
    total: assetIncidents.length,
    by_category: countBy(assetIncidents, (i) => i.category),
    by_severity: countBy(assetIncidents, (i) => i.severity),
  };

  // Incident Response — time-to-resolve for resolved rows.
  const resolved = all.filter((i) => i.resolved_at);
  const resolveMs = resolved.map((i) => Date.parse(i.resolved_at!) - Date.parse(i.occurred_at));
  const incident_response = {
    total: all.length,
    resolved: resolved.length,
    pct_resolved: all.length > 0 ? +(100 * resolved.length / all.length).toFixed(2) : null,
    median_resolution_minutes: resolveMs.length > 0 ? Math.round(median(resolveMs) / 60_000) : null,
  };

  // Hotspot Trends — incidents by site + by hour band.
  const bandLabel = (h: number) => h < 6 ? '00–06' : h < 12 ? '06–12' : h < 18 ? '12–18' : '18–24';
  const hotspot_trends = {
    by_site: countBy(all, (i) => i.site_id),
    by_band: countBy(all, (i) => bandLabel(new Date(i.occurred_at).getUTCHours())),
  };

  const patrol_delivery = {
    scheduled: total, completed, no_shows: noShows,
    completion_pct: completionPct,
    target_pct: 100,
    on_target: completionPct === null ? null : completionPct >= 100,
  };

  const maintenance_impact = {
    note: 'Tracked via Northview maintenance feed (integration pending); manual entry until then.',
    manual_entries: [],
  };

  const summary_md = renderSummary({
    month, contract_id,
    patrol_delivery, asset_protection, incident_response, hotspot_trends,
  });

  // Idempotent — upsert by (contract_id, period_start, period_end).
  const { data: existing } = await ctx.user.from('contract_kpi_snapshots')
    .select('id').eq('contract_id', contract_id).eq('period_start', start).eq('period_end', end).maybeSingle();
  const payload = {
    org_id: ctx.org_id, contract_id, period_start: start, period_end: end,
    asset_protection, patrol_delivery, incident_response, hotspot_trends, maintenance_impact,
    summary_md,
  };
  let id: string;
  if (existing) {
    const { error } = await ctx.service.from('contract_kpi_snapshots').update(payload).eq('id', existing.id);
    if (error) return json(req, 500, { error: error.message });
    id = existing.id;
  } else {
    const { data, error } = await ctx.service.from('contract_kpi_snapshots').insert(payload).select('id').single();
    if (error) return json(req, 500, { error: error.message });
    id = data.id;
  }
  return json(req, 200, { snapshot_id: id, summary_md });
});

function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rows) { const k = key(r); m[k] = (m[k] ?? 0) + 1; }
  return m;
}
function median(xs: number[]): number {
  const s = xs.slice().sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length % 2 ? s[mid]! : ((s[mid-1]! + s[mid]!) / 2);
}

function renderSummary(args: {
  month: string; contract_id: string;
  patrol_delivery: any; asset_protection: any; incident_response: any; hotspot_trends: any;
}): string {
  const pd = args.patrol_delivery;
  const lines: string[] = [];
  lines.push(`# Monthly KPI Summary — ${args.month}`);
  lines.push('');
  lines.push(`**Patrol delivery.** ${pd.completed} of ${pd.scheduled} scheduled visits completed (${pd.completion_pct ?? '—'}%). Target: 100%.`);
  if (pd.no_shows > 0) lines.push(`- ⚠️ ${pd.no_shows} no-shows — review with supervisor.`);
  lines.push('');
  lines.push(`**Asset protection.** ${args.asset_protection.total} damage-related incident(s). By category: ${JSON.stringify(args.asset_protection.by_category)}.`);
  lines.push('');
  lines.push(`**Incident response.** ${args.incident_response.resolved} of ${args.incident_response.total} incidents resolved in-period. Median resolution: ${args.incident_response.median_resolution_minutes ?? '—'} min.`);
  lines.push('');
  lines.push(`**Hotspot trends.** Incidents by site: ${JSON.stringify(args.hotspot_trends.by_site)}; by hour band: ${JSON.stringify(args.hotspot_trends.by_band)}.`);
  lines.push('');
  lines.push(`*Generated automatically. Contract review meeting source-of-truth.*`);
  return lines.join('\n');
}
