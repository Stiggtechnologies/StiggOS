// CORS helpers shared across edge functions.
// We intentionally do NOT allow '*' on Authorization-bearing routes.
//
// Set ALLOWED_ORIGINS as a comma-separated list in Supabase project secrets.
// In dev, falls back to a permissive list of localhost ports.

const ALLOWED_DEV = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const list = allow.length ? allow : ALLOWED_DEV;
  const ok = list.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : list[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }
  return null;
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json' },
  });
}
