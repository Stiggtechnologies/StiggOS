// POST /functions/v1/invoice-pdf
// Body: { invoice_id }
//
// Renders a clean HTML invoice (Alberta GST-compliant) and uploads it to
// Supabase Storage at `invoices/{org_id}/{invoice_number}.html`. Updates
// the invoices.pdf_url column. Production should swap the HTML renderer
// for a true PDF (puppeteer / wkhtmltopdf) — kept HTML here so it works
// on Deno edge with no extra deps.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });
  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const { invoice_id } = await req.json().catch(() => ({})) as { invoice_id?: string };
  if (!invoice_id) return json(req, 400, { error: 'invoice_id required' });

  const { data: inv, error } = await ctx.user.from('invoices').select('*').eq('id', invoice_id).single();
  if (error || !inv) return json(req, 404, { error: 'invoice not found' });

  const [{ data: client }, { data: org }] = await Promise.all([
    ctx.user.from('clients').select('name, primary_contact').eq('id', inv.client_id).single(),
    ctx.user.from('orgs').select('name, ssia_license, gst_number, hq_address').eq('id', ctx.org_id).single(),
  ]);

  const html = renderInvoiceHtml({
    invoice: inv,
    client_name: (client as any)?.name ?? '',
    org_name: (org as any)?.name ?? '',
    org_gst: (org as any)?.gst_number ?? '',
    org_address: (org as any)?.hq_address ?? null,
  });

  const path = `invoices/${ctx.org_id}/${inv.invoice_number}.html`;
  const { error: upErr } = await ctx.service.storage
    .from('invoices')
    .upload(path, new Blob([html], { type: 'text/html' }), { upsert: true });
  if (upErr) return json(req, 500, { error: upErr.message });

  const { data: pub } = ctx.service.storage.from('invoices').getPublicUrl(path);
  await ctx.service.from('invoices').update({ pdf_url: pub.publicUrl }).eq('id', inv.id);

  return json(req, 200, { url: pub.publicUrl });
});

function renderInvoiceHtml(args: {
  invoice: any; client_name: string; org_name: string; org_gst: string; org_address: any;
}): string {
  const i = args.invoice;
  const lines = (i.line_items ?? []) as Array<Record<string, unknown>>;
  const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
  const addr = args.org_address ?? {};
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><title>Invoice ${i.invoice_number}</title>
<style>
  body{font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:48px;}
  h1{margin:0 0 4px;font-size:28px;}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left}
  th{background:#f8fafc;text-transform:uppercase;letter-spacing:.05em;font-size:11px;color:#64748b}
  .right{text-align:right}
  .totals td{border:0;padding:4px 12px}
  .totals .grand{font-weight:600;border-top:2px solid #0f172a}
  .meta{display:flex;justify-content:space-between;margin-top:24px;color:#475569}
</style>
</head><body>
  <header>
    <h1>${escape(args.org_name)}</h1>
    <div>${escape(addr.street ?? '')} · ${escape(addr.city ?? '')}, ${escape(addr.province ?? '')} ${escape(addr.postal ?? '')}</div>
    ${args.org_gst ? `<div>GST # ${escape(args.org_gst)}</div>` : ''}
  </header>
  <div class="meta">
    <div>
      <strong>Bill to</strong><br/>
      ${escape(args.client_name)}
    </div>
    <div class="right">
      <div><strong>Invoice</strong> ${escape(i.invoice_number)}</div>
      <div>Period ${escape(i.period_start)} → ${escape(i.period_end)}</div>
      <div>Due ${escape(i.due_date ?? '—')}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="right">Hours</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
    <tbody>
      ${lines.map((l: any) => `
        <tr>
          <td>${escape(l.kind === 'fixed_monthly' ? 'Monthly retainer' : 'Shift ' + (l.shift_id ?? '').slice(0,8))}</td>
          <td class="right">${l.hours != null ? Number(l.hours).toFixed(2) : '—'}</td>
          <td class="right">${l.rate != null ? fmt(Number(l.rate)) : '—'}</td>
          <td class="right">${fmt(Number(l.subtotal ?? l.amount ?? 0))}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <table class="totals" style="margin-left:auto;margin-top:16px;width:auto;min-width:280px">
    <tr><td>Subtotal</td><td class="right">${fmt(Number(i.subtotal_cad))}</td></tr>
    <tr><td>GST ${(Number(i.gst_rate) * 100).toFixed(0)}%</td><td class="right">${fmt(Number(i.gst_cad))}</td></tr>
    <tr class="grand"><td>Total CAD</td><td class="right">${fmt(Number(i.total_cad))}</td></tr>
  </table>
</body></html>`;
}

function escape(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
