// POST /functions/v1/stripe-webhook  — public, no JWT (verified by Stripe signature)
//
// Stripe webhook receiver. Verifies the signature using STRIPE_WEBHOOK_SECRET,
// then reflects the event into our invoices table:
//
//   invoice.paid               → invoices.status = 'paid', paid_at = now
//   invoice.payment_failed     → invoices.status = 'overdue'
//   invoice.finalized          → invoices.status = 'sent'
//   customer.subscription.deleted → contracts.status = 'terminated'
//
// Mapping Stripe object → StiggOS row uses the `metadata.invoice_id` /
// `metadata.contract_id` fields we set when creating the Stripe object.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): Promise<boolean> {
  // Stripe signs as: t=timestamp,v1=hex(hmacSha256(timestamp + '.' + body, secret))
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare.
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('STRIPE_WEBHOOK_SECRET not set', { status: 500 });

  const sig = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  const ok = await verifyStripeSignature(raw, sig, secret);
  if (!ok) return new Response('invalid signature', { status: 400 });

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response('invalid body', { status: 400 }); }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const obj = event?.data?.object ?? {};
  const meta = obj.metadata ?? {};

  switch (event.type) {
    case 'invoice.finalized':
      if (meta.invoice_id) await sb.from('invoices').update({ status: 'sent' }).eq('id', meta.invoice_id);
      break;
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      if (meta.invoice_id) {
        await sb.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', meta.invoice_id);
      }
      break;
    case 'invoice.payment_failed':
      if (meta.invoice_id) await sb.from('invoices').update({ status: 'overdue' }).eq('id', meta.invoice_id);
      break;
    case 'customer.subscription.deleted':
      if (meta.contract_id) await sb.from('contracts').update({ status: 'terminated' }).eq('id', meta.contract_id);
      break;
    default:
      // Acknowledge unhandled types — Stripe will retry only on non-2xx.
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
