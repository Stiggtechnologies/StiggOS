// POST /functions/v1/billing-run
// Body: { month: 'YYYY-MM' }
//
// Computes monthly invoices for every active contract in the caller's org.
// Algorithm:
//   1. Pick the [period_start, period_end] = [month-01, last day of month].
//   2. For each active contract, sum bill_rate × hours_worked across the
//      period's completed shifts on that contract's client's sites. If the
//      contract has a fixed monthly_value_cad and zero shifts, fall back to it.
//   3. Compute GST (5% Alberta, override per org via orgs.gst_number presence
//      or a future setting).
//   4. Insert an invoice row in 'draft'. Marking it 'sent' triggers Stripe.
//
// Idempotent: re-running for the same month replaces existing draft invoices
// for that period.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';

interface ContractRow {
  id: string; client_id: string;
  monthly_value_cad: number | null;
  status: string;
}
interface ShiftRow {
  id: string; site_id: string;
  hours_worked: number | null;
  bill_rate: number | null;
  status: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;
  if (!['owner','admin','manager'].includes(ctx.role)) {
    return json(req, 403, { error: 'billing requires manager+ role' });
  }

  const body = await req.json().catch(() => ({}));
  const month = (body as { month?: string }).month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return json(req, 400, { error: 'month=YYYY-MM required' });

  const start = `${month}-01`;
  const startDate = new Date(start + 'T00:00:00Z');
  const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));
  const end = endDate.toISOString().slice(0, 10);

  const [{ data: contracts, error: cErr }, { data: shifts, error: sErr }, { data: sites }] = await Promise.all([
    ctx.user.from('contracts').select('id, client_id, monthly_value_cad, status').eq('status', 'active'),
    ctx.user.from('shifts').select('id, site_id, hours_worked, bill_rate, status')
      .eq('status', 'completed')
      .gte('actual_start', startDate.toISOString())
      .lte('actual_end', endDate.toISOString()),
    ctx.user.from('sites').select('id, client_id'),
  ]);
  if (cErr) return json(req, 500, { error: cErr.message });
  if (sErr) return json(req, 500, { error: sErr.message });

  const siteToClient = new Map<string, string>();
  for (const s of (sites ?? []) as Array<{ id: string; client_id: string }>) siteToClient.set(s.id, s.client_id);

  // Group hours by client_id.
  const hoursByClient = new Map<string, { subtotal: number; lines: Array<{ shift_id: string; hours: number; rate: number; subtotal: number }> }>();
  for (const sh of (shifts ?? []) as ShiftRow[]) {
    const clientId = siteToClient.get(sh.site_id);
    if (!clientId) continue;
    const hrs = sh.hours_worked ?? 0;
    const rate = sh.bill_rate ?? 0;
    const sub = +(hrs * rate).toFixed(2);
    if (sub <= 0) continue;
    const slot = hoursByClient.get(clientId) ?? { subtotal: 0, lines: [] };
    slot.subtotal = +(slot.subtotal + sub).toFixed(2);
    slot.lines.push({ shift_id: sh.id, hours: hrs, rate, subtotal: sub });
    hoursByClient.set(clientId, slot);
  }

  // Replace existing draft invoices for this period — idempotency.
  await ctx.service.from('invoices')
    .delete()
    .eq('org_id', ctx.org_id)
    .eq('period_start', start)
    .eq('period_end', end)
    .eq('status', 'draft');

  const inserted: Array<{ id: string; client_id: string; total_cad: number }> = [];
  const skipped: Array<{ contract_id: string; reason: string }> = [];
  const GST_RATE = 0.05;
  const seq = Date.now().toString().slice(-6);

  let i = 0;
  for (const c of (contracts ?? []) as ContractRow[]) {
    i++;
    const slot = hoursByClient.get(c.client_id);
    let subtotal = slot?.subtotal ?? 0;
    let line_items: Array<Record<string, unknown>> = slot?.lines ?? [];
    if (subtotal === 0 && c.monthly_value_cad) {
      subtotal = c.monthly_value_cad;
      line_items = [{ kind: 'fixed_monthly', amount: c.monthly_value_cad, contract_id: c.id }];
    }
    if (subtotal <= 0) {
      skipped.push({ contract_id: c.id, reason: 'no billable activity in period' });
      continue;
    }
    const gst = +(subtotal * GST_RATE).toFixed(2);
    const total = +(subtotal + gst).toFixed(2);
    const invNum = `INV-${month.replace('-','')}-${String(i).padStart(3,'0')}-${seq}`;
    const { data: row, error } = await ctx.service.from('invoices').insert({
      org_id: ctx.org_id,
      client_id: c.client_id,
      contract_id: c.id,
      invoice_number: invNum,
      period_start: start, period_end: end,
      subtotal_cad: subtotal, gst_rate: GST_RATE, gst_cad: gst, total_cad: total,
      status: 'draft',
      due_date: new Date(endDate.getTime() + 30 * 86_400_000).toISOString().slice(0, 10),
      line_items,
    }).select('id, client_id, total_cad').single();
    if (error) skipped.push({ contract_id: c.id, reason: error.message });
    else inserted.push(row);
  }

  return json(req, 200, { month, period: { start, end }, inserted, skipped });
});
