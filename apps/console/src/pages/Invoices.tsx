import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured, invokeFn } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtCAD, fmtDate, statusBadge } from '../lib/format';
import { Receipt, Sparkles, ExternalLink } from 'lucide-react';

interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  contract_id: string | null;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_cad: number;
  gst_rate: number;
  gst_cad: number;
  total_cad: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
}

export function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Invoice> | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [inv, cs] = await Promise.all([
      supabase.from('invoices').select('*').order('period_end', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    if (inv.error) setError(inv.error.message);
    setRows((inv.data ?? []) as Invoice[]);
    setClients((cs.data ?? []) as Array<{ id: string; name: string }>);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const subtotal = edit.subtotal_cad ?? 0;
    const gst_rate = edit.gst_rate ?? 0.05;
    const gst = +(subtotal * gst_rate).toFixed(2);
    const total = +(subtotal + gst).toFixed(2);
    const payload: any = {
      client_id: edit.client_id,
      contract_id: edit.contract_id || null,
      invoice_number: edit.invoice_number || `INV-${Date.now()}`,
      period_start: edit.period_start,
      period_end: edit.period_end,
      subtotal_cad: subtotal,
      gst_rate, gst_cad: gst, total_cad: total,
      status: edit.status ?? 'draft',
      due_date: edit.due_date || null,
    };
    const res = edit.id ? await supabase.from('invoices').update(payload).eq('id', edit.id)
                       : await supabase.from('invoices').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null); await load();
  }

  // Auto-generate next month's invoices from active contracts.
  async function generateMonth() {
    setGenerating(true); setError(null);
    try {
      await invokeFn('billing-run', { month: new Date().toISOString().slice(0, 7) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setGenerating(false); }
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id.slice(0, 6);

  const columns: Column<Invoice>[] = [
    { key: 'num', label: 'Invoice', searchable: (r) => r.invoice_number, render: (r) => (
      <div>
        <div className="font-medium font-mono">{r.invoice_number}</div>
        <div className="text-xs text-slate-500">{clientName(r.client_id)}</div>
      </div>
    ) },
    { key: 'period', label: 'Period', render: (r) => <span className="text-xs text-slate-400">{fmtDate(r.period_start)} → {fmtDate(r.period_end)}</span> },
    { key: 'subtotal', label: 'Subtotal', render: (r) => <span>{fmtCAD(r.subtotal_cad)}</span> },
    { key: 'gst', label: 'GST', render: (r) => <span className="text-slate-400">{fmtCAD(r.gst_cad)}</span> },
    { key: 'total', label: 'Total', render: (r) => <span className="font-medium">{fmtCAD(r.total_cad)}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(r.status)}`}>{r.status}</span> },
    { key: 'pdf', label: 'PDF', render: (r) => r.pdf_url
        ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-blue-400 inline-flex items-center gap-1 text-xs"><ExternalLink size={12} /> open</a>
        : <span className="text-slate-500 text-xs">—</span> },
  ];

  return (
    <>
      <DataTable
        title="Invoices"
        description="Billing — Alberta GST 5% applied automatically. Run the monthly billing job to generate from active contracts."
        rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
        onCreate={{ label: 'New invoice', onClick: () => setEdit({ status: 'draft', gst_rate: 0.05, period_start: '', period_end: '' }) }}
        onRowClick={(r) => setEdit(r)}
        toolbar={
          <button onClick={generateMonth} disabled={generating || !supabaseConfigured} className="btn-ghost inline-flex items-center gap-1">
            <Sparkles size={14} /> {generating ? 'Generating…' : 'Run billing for this month'}
          </button>
        }
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit invoice' : 'New invoice'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="inv-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <form id="inv-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Client
              <select className="input mt-1" required value={edit.client_id ?? ''} onChange={(e) => setEdit({ ...edit, client_id: e.target.value })}>
                <option value="">— select —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Invoice #<input className="input mt-1" value={edit.invoice_number ?? ''} onChange={(e) => setEdit({ ...edit, invoice_number: e.target.value })} /></label>
            <label className="text-sm">Status
              <select className="input mt-1" value={edit.status ?? 'draft'} onChange={(e) => setEdit({ ...edit, status: e.target.value as Invoice['status'] })}>
                <option>draft</option><option>sent</option><option>paid</option><option>overdue</option><option>void</option>
              </select>
            </label>
            <label className="text-sm">Period start<input className="input mt-1" type="date" required value={edit.period_start ?? ''} onChange={(e) => setEdit({ ...edit, period_start: e.target.value })} /></label>
            <label className="text-sm">Period end<input className="input mt-1" type="date" required value={edit.period_end ?? ''} onChange={(e) => setEdit({ ...edit, period_end: e.target.value })} /></label>
            <label className="text-sm">Subtotal (CAD)<input className="input mt-1" type="number" step="0.01" value={edit.subtotal_cad ?? 0} onChange={(e) => setEdit({ ...edit, subtotal_cad: parseFloat(e.target.value) })} /></label>
            <label className="text-sm">GST rate<input className="input mt-1" type="number" step="0.001" value={edit.gst_rate ?? 0.05} onChange={(e) => setEdit({ ...edit, gst_rate: parseFloat(e.target.value) })} /></label>
            <label className="text-sm">Due date<input className="input mt-1" type="date" value={edit.due_date ?? ''} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} /></label>
            <p className="col-span-2 text-xs text-slate-500"><Receipt size={11} className="inline" /> Total auto-computed: subtotal × (1 + GST). Saving recalculates.</p>
          </form>
        )}
      </Modal>
    </>
  );
}
