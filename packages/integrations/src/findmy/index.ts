// FindMy / AirTag bridge.
//
// Apple AirTags don't have a public API. The two practical paths:
//   1. Run an OpenHaystack/anisette bridge on a Mac in the office that polls
//      reports for your AirTags' public keys and forwards them as POSTs.
//   2. Use a generic BLE relay device that ingests Tile / Samsung SmartThings
//      / Chipolo locations.
//
// Either way, the inbound shape is the same: a normalized ping. We just parse
// it and pass through; no business logic here.

export interface NormalizedAssetPing {
  device_serial: string;
  reported_at: string;
  lat: number;
  lng: number;
  accuracy_m?: number;
  battery_pct?: number;
  source: string;
  raw: Record<string, unknown>;
}

export function parsePing(body: any): NormalizedAssetPing | null {
  if (!body || typeof body !== 'object') return null;
  const serial = body.device_serial ?? body.serial ?? body.id;
  const lat = Number(body.lat ?? body.latitude);
  const lng = Number(body.lng ?? body.lon ?? body.longitude);
  const reported = body.reported_at ?? body.timestamp ?? body.time;
  if (!serial || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const t = (() => {
    if (typeof reported === 'number') return new Date(reported > 1e12 ? reported : reported * 1000).toISOString();
    if (typeof reported === 'string') {
      const n = Date.parse(reported);
      return Number.isFinite(n) ? new Date(n).toISOString() : new Date().toISOString();
    }
    return new Date().toISOString();
  })();
  return {
    device_serial: String(serial),
    reported_at: t,
    lat, lng,
    accuracy_m: body.accuracy_m ?? body.accuracy,
    battery_pct: body.battery_pct ?? body.battery,
    source: body.source ?? 'findmy_bridge',
    raw: body,
  };
}
