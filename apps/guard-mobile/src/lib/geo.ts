// Geolocation helper. Returns once (high accuracy when available) and times
// out after 12s — guards in Fort McMurray winter conditions can have spotty GPS.

export interface Fix {
  lat: number;
  lng: number;
  accuracy_m: number;
  captured_at: string;
}

export function getFix(timeoutMs = 12_000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation unsupported on this device.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy_m: p.coords.accuracy,
        captured_at: new Date(p.timestamp).toISOString(),
      }),
      (err) => reject(new Error(err.message || 'Geolocation failed')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5_000 },
    );
  });
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lng - a.lng);
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
