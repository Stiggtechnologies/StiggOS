// Traccar / OsmAnd / generic GPS protocol parser.
//
// OsmAnd is a query-string protocol every consumer GPS app speaks:
//   GET /?id=<deviceId>&lat=51.05&lon=-114.07&timestamp=1700000000&speed=12.3&bearing=180&accuracy=4.0
// Traccar's HTTP forwarder POSTs JSON with the same fields plus 'attributes'.
// Both shapes converge into NormalizedFix below.
//
// We deliberately accept timestamps in seconds OR milliseconds OR ISO 8601 —
// every shipper is "almost" right and refusing them strands real fixes.
//
// Speeding/idling/unauthorized rules live in `rules.ts` for unit testing.

export interface NormalizedFix {
  device_id: string;
  recorded_at: string;        // ISO
  lat: number;
  lng: number;
  speed_kmh?: number;
  heading_deg?: number;
  ignition?: boolean;
  accuracy_m?: number;
  battery_pct?: number;
  source: 'traccar' | 'osmand' | 'unknown';
  raw: Record<string, unknown>;
}

function parseNumber(x: unknown): number | undefined {
  if (x == null) return undefined;
  const n = typeof x === 'string' ? parseFloat(x) : Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function parseTimestamp(x: unknown): string {
  if (typeof x === 'string') {
    const t = Date.parse(x);
    if (Number.isFinite(t)) return new Date(t).toISOString();
    const n = Number(x);
    if (Number.isFinite(n)) return parseTimestamp(n);
  }
  if (typeof x === 'number') {
    // Heuristic: > 10^12 → already milliseconds.
    return new Date(x > 1e12 ? x : x * 1000).toISOString();
  }
  return new Date().toISOString();
}

/** Parse an OsmAnd-style query payload (GET /?id=…&lat=…&lon=…). */
export function parseOsmAnd(params: URLSearchParams | Record<string, string>): NormalizedFix | null {
  const get = (k: string): string | undefined =>
    params instanceof URLSearchParams ? (params.get(k) ?? undefined) : params[k];
  const id = get('id') ?? get('deviceid');
  if (!id) return null;
  const lat = parseNumber(get('lat')); const lng = parseNumber(get('lon') ?? get('lng'));
  if (lat == null || lng == null) return null;
  const speedRaw = parseNumber(get('speed'));
  // Traccar/OsmAnd: speed in knots → km/h, m/s → km/h heuristic on small values.
  const speed_kmh = speedRaw == null ? undefined : speedRaw < 5 ? speedRaw * 3.6 : speedRaw * 1.852;
  return {
    device_id: id,
    recorded_at: parseTimestamp(get('timestamp')),
    lat, lng,
    speed_kmh,
    heading_deg: parseNumber(get('bearing') ?? get('heading')),
    accuracy_m: parseNumber(get('accuracy') ?? get('hdop')),
    battery_pct: parseNumber(get('batt') ?? get('battery')),
    ignition: get('ignition') === 'true',
    source: 'osmand',
    raw: Object.fromEntries(
      params instanceof URLSearchParams ? Array.from(params.entries()) : Object.entries(params),
    ),
  };
}

/** Parse a Traccar-style JSON forwarder POST body. */
export function parseTraccarPost(body: any): NormalizedFix | null {
  if (!body || typeof body !== 'object') return null;
  const id = body.uniqueId ?? body.id ?? body.deviceId;
  const lat = parseNumber(body.latitude ?? body.lat);
  const lng = parseNumber(body.longitude ?? body.lon ?? body.lng);
  if (!id || lat == null || lng == null) return null;
  // Traccar reports speed in knots; convert.
  const speedKnots = parseNumber(body.speed);
  const speed_kmh = speedKnots == null ? undefined : speedKnots * 1.852;
  const attrs = (body.attributes ?? {}) as Record<string, unknown>;
  return {
    device_id: String(id),
    recorded_at: parseTimestamp(body.fixTime ?? body.deviceTime ?? body.serverTime ?? body.timestamp),
    lat, lng,
    speed_kmh,
    heading_deg: parseNumber(body.course ?? body.heading),
    accuracy_m: parseNumber(body.accuracy),
    battery_pct: parseNumber(attrs.batteryLevel ?? attrs.battery),
    ignition: typeof attrs.ignition === 'boolean' ? attrs.ignition : undefined,
    source: 'traccar',
    raw: body,
  };
}

export { evaluateFix } from './rules.js';
export type { VehicleAlertSpec } from './rules.js';
