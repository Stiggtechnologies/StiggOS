// Public asset-tracker ingest. AirTag bridges (OpenHaystack/anisette), Tile,
// Samsung, generic BLE relays — all post a normalized JSON ping.
//
// POST /functions/v1/asset-track?token=<ASSET_TRACK_TOKEN>
//   Body: { device_serial, lat, lng, timestamp?, accuracy_m?, battery_pct? }
//
// Updates asset_trackers.last_seen_at + last_geo and writes asset_track_pings.
// Asset offline alerts are computed by the daily compliance scan, not here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const url = new URL(req.url);
  const expected = Deno.env.get('ASSET_TRACK_TOKEN');
  const provided = url.searchParams.get('token') ?? req.headers.get('x-stigg-token');
  if (!expected) return new Response('ASSET_TRACK_TOKEN not configured', { status: 500 });
  if (provided !== expected) return new Response('forbidden', { status: 403 });

  let body: any; try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const serial = body.device_serial ?? body.serial ?? body.id;
  const lat = Number(body.lat ?? body.latitude); const lng = Number(body.lng ?? body.lon ?? body.longitude);
  if (!serial || !Number.isFinite(lat) || !Number.isFinite(lng)) return new Response('lat/lng/serial required', { status: 400 });
  const ts = (() => {
    const r = body.reported_at ?? body.timestamp ?? body.time;
    if (typeof r === 'number') return new Date(r > 1e12 ? r : r * 1000).toISOString();
    if (typeof r === 'string') { const n = Date.parse(r); return Number.isFinite(n) ? new Date(n).toISOString() : new Date().toISOString(); }
    return new Date().toISOString();
  })();

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: tracker } = await sb.from('asset_trackers').select('id, org_id').eq('device_serial', String(serial)).maybeSingle();
  if (!tracker) return new Response(JSON.stringify({ accepted: false, reason: 'unknown tracker' }), { status: 200 });

  const wkt = `POINT(${lng} ${lat})`;
  await sb.from('asset_track_pings').insert({
    org_id: tracker.org_id, tracker_id: tracker.id,
    reported_at: ts, geo: wkt as any,
    accuracy_m: body.accuracy_m ?? body.accuracy ?? null,
    battery_pct: body.battery_pct ?? body.battery ?? null,
    source: body.source ?? 'findmy_bridge',
    raw: body,
  });
  await sb.from('asset_trackers').update({
    last_seen_at: ts, last_geo: wkt as any,
    battery_pct: body.battery_pct ?? body.battery ?? null,
  }).eq('id', tracker.id);

  return new Response(JSON.stringify({ accepted: true }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
