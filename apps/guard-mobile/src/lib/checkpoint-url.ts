// Pure URL parser for NFC tag landings. Lives in its own module so unit
// tests can import it without pulling React, supabase-js, or the geolocation
// shim along with it.
//
// Supported NFC tag URL shapes:
//   /p/NW-1001                                       — preferred (short, fits any NTAG)
//   /p/NW-1001/                                      — trailing slash variant
//   /patrol/checkin?checkpoint_id=NW-1001            — verbose, matches the original spec
//   /patrol/checkin?code=NW-1001                     — alias
//
// Returns the raw checkpoint code, or null if the URL isn't a check-in target.

export function parseCheckpointUrl(pathname: string, search = ''): string | null {
  const short = pathname.match(/^\/p\/([^/?#]+)\/?$/);
  if (short?.[1]) return decodeURIComponent(short[1]);

  if (pathname === '/patrol/checkin' || pathname === '/patrol/checkin/') {
    const params = new URLSearchParams(search);
    const code = params.get('checkpoint_id') ?? params.get('code');
    if (code) return code;
  }

  return null;
}
