// Public vehicle-tracking ingest. Two shapes:
//
//   GET  /functions/v1/vehicle-track?id=<vehicle_id>&lat=..&lon=..&speed=..&token=<webhook_token>
//        — OsmAnd-style query string.
//
//   POST /functions/v1/vehicle-track
//        — Traccar HTTP forwarder JSON body. Vehicle resolved by `uniqueId`.
//        Auth: ?token=<TRACCAR_TOKEN env> (URL parameter)
//
// We map the device id to a vehicle row, write a vehicle_track_points row,
// run the speeding/idling/unauthorized rules, insert vehicle_alerts as
// needed, and call dispatch-router with a TriggerEvent for any 'high'+ alert.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface NormalizedFix {
  device_id: string; recorded_at: string;
  lat: number; lng: number;
  speed_kmh?: number; heading_deg?: number;
  ignition?: boolean; accuracy_m?: number; battery_pct?: number;
  source: string; raw: Record<string, unknown>;
}

function parseTimestamp(x: unknown): string {
  if (typeof x === 'string') {
    const t = Date.parse(x); if (Number.isFinite(t)) return new Date(t).toISOString();
    const n = Number(x); if (Number.isFinite(n)) return parseTimestamp(n);
  }
  if (typeof x === 'number') return new Date(x > 1e12 ? x : x * 1000).toISOString();
  return new Date().toISOString();
}
const num = (x: unknown): number | undefined => {
  if (x == null) return undefined;
  const n = typeof x === 'string' ? parseFloat(x) : Number(x);
  return Number.isFinite(n) ? n : undefined;
};

function fromOsmAnd(p: URLSearchParams): NormalizedFix | null {
  const id = p.get('id') ?? p.get('deviceid');
  const lat = num(p.get('lat')); const lng = num(p.get('lon') ?? p.get('lng'));
  if (!id || lat == null || lng == null) return null;
  const sp = num(p.get('speed'));
  return {
    device_id: id, recorded_at: parseTimestamp(p.get('timestamp')),
    lat, lng,
    speed_kmh: sp == null ? undefined : sp < 5 ? sp * 3.6 : sp * 1.852,
    heading_deg: num(p.get('bearing') ?? p.get('heading')),
    accuracy_m: num(p.get('accuracy') ?? p.get('hdop')),
    battery_pct: num(p.get('batt') ?? p.get('battery')),
    ignition: p.get('ignition') === 'true',
    source: 'osmand',
    raw: Object.fromEntries(p.entries()),
  };
}

function fromTraccar(body: any): NormalizedFix | null {
  if (!body || typeof body !== 'object') return null;
  const id = body.uniqueId ?? body.id ?? body.deviceId;
  const lat = num(body.latitude ?? body.lat); const lng = num(body.longitude ?? body.lon ?? body.lng);
  if (!id || lat == null || lng == null) return null;
  const sp = num(body.speed);
  const attrs = body.attributes ?? {};
  return {
    device_id: String(id),
    recorded_at: parseTimestamp(body.fixTime ?? body.deviceTime ?? body.serverTime ?? body.timestamp),
    lat, lng,
    speed_kmh: sp == null ? undefined : sp * 1.852,
    heading_deg: num(body.course ?? body.heading),
    accuracy_m: num(body.accuracy),
    battery_pct: num(attrs.batteryLevel ?? attrs.battery),
    ignition: typeof attrs.ignition === 'boolean' ? attrs.ignition : undefined,
    source: 'traccar', raw: body,
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const expected = Deno.env.get('TRACCAR_TOKEN');
  const provided = url.searchParams.get('token') ?? req.headers.get('x-stigg-token');
  if (!expected) return new Response('TRACCAR_TOKEN not configured', { status: 500 });
  if (provided !== expected) return new Response('forbidden', { status: 403 });

  let fix: NormalizedFix | null = null;
  if (req.method === 'GET') fix = fromOsmAnd(url.searchParams);
  else if (req.method === 'POST') {
    let body: any; try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
    fix = fromTraccar(body);
  } else return new Response('method not allowed', { status: 405 });

  if (!fix) return new Response('cannot parse fix', { status: 400 });

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // device_id maps onto vehicles.unit_number OR an explicit metadata.device_id.
  const { data: vehicle } = await sb.from('vehicles')
    .select('id, org_id, metadata')
    .or(`unit_number.eq.${fix.device_id},metadata->>device_id.eq.${fix.device_id}`)
    .maybeSingle();
  if (!vehicle) return new Response(JSON.stringify({ accepted: false, reason: 'unknown vehicle' }), { status: 200 });

  // Insert track point.
  const wkt = `POINT(${fix.lng} ${fix.lat})`;
  await sb.from('vehicle_track_points').insert({
    org_id: vehicle.org_id, vehicle_id: vehicle.id,
    recorded_at: fix.recorded_at,
    geo: wkt as any,
    speed_kmh: fix.speed_kmh ?? null,
    heading_deg: fix.heading_deg ?? null,
    ignition: fix.ignition ?? null,
    source: fix.source,
    raw: fix.raw,
  });

  // Update the vehicle's current geo + last-seen.
  await sb.from('vehicles').update({
    current_geo: wkt as any,
    current_geo_at: fix.recorded_at,
  }).eq('id', vehicle.id);

  // Evaluate vehicle alerts. Prior fix needed for idling — fetch the most recent.
  const { data: prior } = await sb.from('vehicle_track_points')
    .select('recorded_at, speed_kmh').eq('vehicle_id', vehicle.id)
    .order('recorded_at', { ascending: false }).limit(2);
  const previous = (prior ?? []).find((r) => r.recorded_at !== fix!.recorded_at) ?? null;

  const alerts: Array<{ alert_type: string; severity: string; details?: Record<string, unknown> }> = [];
  const limit = (vehicle.metadata as any)?.speed_limit_kmh ?? 110;
  if (fix.speed_kmh != null && fix.speed_kmh > limit) {
    const over = fix.speed_kmh - limit;
    const sev = over > 50 ? 'critical' : over > 25 ? 'high' : 'medium';
    alerts.push({ alert_type: 'speeding', severity: sev, details: { limit_kmh: limit, speed_kmh: fix.speed_kmh } });
  }
  if (previous && (fix.speed_kmh ?? 0) < 3 && (previous.speed_kmh ?? 0) < 3) {
    const elapsed = Date.parse(fix.recorded_at) - Date.parse(previous.recorded_at);
    if (elapsed >= 10 * 60_000) alerts.push({ alert_type: 'idling', severity: 'low', details: { idle_minutes: Math.round(elapsed / 60_000) } });
  }

  for (const a of alerts) {
    await sb.from('vehicle_alerts').insert({
      org_id: vehicle.org_id, vehicle_id: vehicle.id,
      detected_at: fix.recorded_at,
      alert_type: a.alert_type, severity: a.severity,
      geo: wkt as any,
      speed_kmh: fix.speed_kmh ?? null,
      details: a.details ?? {},
    });
    if (a.severity === 'high' || a.severity === 'critical') {
      await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/dispatch-router', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          event: {
            type: a.alert_type, severity: a.severity,
            org_id: vehicle.org_id, vehicle_id: vehicle.id,
            payload: a.details ?? {}, at: fix.recorded_at,
          },
        }),
      }).catch(() => {});
    }
  }

  return new Response(JSON.stringify({ accepted: true, alerts }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
