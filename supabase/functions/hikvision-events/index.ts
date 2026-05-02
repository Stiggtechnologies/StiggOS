// Public Hikvision NVR / HikCentral webhook endpoint.
//
// POST /functions/v1/hikvision-events?nvr=<nvr_system_id>
//   Headers: X-Hik-Signature: <hex>   (HMAC-SHA256 of raw body, secret = nvr_systems.webhook_secret)
//   Body:    JSON event payload (EventNotificationAlert envelope)
//
// Pipeline:
//   1. Verify signature against nvr_systems.webhook_secret (constant time).
//   2. Parse the event into a normalized shape.
//   3. Resolve `cameras` row by (nvr_system_id, channel_no).
//   4. Insert into camera_alerts.
//   5. Call dispatch-router internally with a TriggerEvent.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { mapHikEventType } from './hikmap.ts';

async function verifyHmac(body: string, sig: string, secret: string): Promise<boolean> {
  if (!sig || !secret) return false;
  const clean = sig.trim().toLowerCase().replace(/^sha256=/, '');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== clean.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ clean.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const url = new URL(req.url);
  const nvrId = url.searchParams.get('nvr');
  if (!nvrId) return new Response('missing ?nvr=', { status: 400 });

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: nvr } = await sb.from('nvr_systems').select('*').eq('id', nvrId).single();
  if (!nvr) return new Response('nvr not found', { status: 404 });

  const raw = await req.text();
  const sig = req.headers.get('x-hik-signature') ?? req.headers.get('X-Hik-Signature') ?? '';
  if (!nvr.webhook_secret) return new Response('webhook_secret not configured', { status: 500 });
  const ok = await verifyHmac(raw, sig, nvr.webhook_secret);
  if (!ok) return new Response('invalid signature', { status: 401 });

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response('invalid JSON', { status: 400 }); }

  const env = payload.EventNotificationAlert ?? payload.eventNotificationAlert ?? payload;
  const hikType = String(env.eventType ?? env.EventType ?? '').trim();
  if (!hikType) return new Response('eventType required', { status: 400 });
  const channel = Number(env.channelID ?? env.ChannelID ?? env.channel ?? NaN);
  const at = env.dateTime ?? env.Time ?? new Date().toISOString();
  const type = mapHikEventType(hikType);

  // Resolve the camera.
  let cameraId: string | null = null;
  if (Number.isFinite(channel)) {
    const { data: cam } = await sb.from('cameras')
      .select('id, site_id')
      .eq('nvr_system_id', nvrId)
      .eq('channel_no', channel)
      .maybeSingle();
    cameraId = cam?.id ?? null;
  }

  // Severity heuristic — cheap default; the linkage rule can override behaviour.
  const sev = type === 'intrusion' || type === 'object_removal' ? 'high'
            : type === 'tamper' ? 'high'
            : type === 'motion' || type === 'pir' ? 'low'
            : 'medium';

  // Persist the camera alert (so the Monitoring app sees it instantly).
  if (cameraId) {
    await sb.from('camera_alerts').insert({
      org_id: nvr.org_id,
      camera_id: cameraId,
      site_id: nvr.site_id,
      detected_at: at,
      detection_type: type,
      confidence: 1.0,
      triage_status: 'pending',
      ai_summary: `Hikvision ${hikType} on channel ${channel}`,
      metadata: { nvr_id: nvrId, hik_type: hikType, raw: env },
    });
  }

  // Heartbeat.
  await sb.from('nvr_systems').update({ last_heartbeat_at: new Date().toISOString() }).eq('id', nvrId);

  // Hand off to dispatch-router. We need a JWT to invoke; use service role.
  const dispatchUrl = Deno.env.get('SUPABASE_URL')! + '/functions/v1/dispatch-router';
  await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      event: {
        type, severity: sev,
        org_id: nvr.org_id,
        site_id: nvr.site_id,
        camera_id: cameraId,
        payload: { hik_type: hikType, channel },
        at,
      },
    }),
  }).catch(() => { /* best-effort — alert is already in camera_alerts */ });

  return new Response(JSON.stringify({ accepted: true, type, camera_id: cameraId }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
