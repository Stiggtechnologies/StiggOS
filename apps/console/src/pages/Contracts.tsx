import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtCAD, fmtDate, statusBadge } from '../lib/format';
import { SERVICE_LINES, SERVICE_LINE_LABEL, type ServiceLine } from '@stigg/shared';

interface Contract {
  id: string;
  org_id: string;
  client_id: string;
  contract_number: string | null;
  service_lines: ServiceLine[];
  start_date: string;
  end_date: string | null;
  monthly_value_cad: number | null;
  status: 'draft' | 'out_for_signature' | 'active' | 'suspended' | 'terminated' | 'expired';
  signed_at: string | null;
  document_url: string | null;
}

export function Contracts() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Contract> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [c, cs] = await Promise.all([
      supabase.from('contracts').select('*').order('start_date', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    if (c.error) setError(c.error.message);
    setRows((c.data ?? []) as Contract[]);
    setClients((cs.data ?? []) as Array<{ id: string; name: string }>);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      client_id: edit.client_id,
      contract_number: edit.contract_number || null,
      service_lines: edit.service_lines ?? [],
      start_date: edit.start_date,
      end_date: edit.end_date || null,
      monthly_value_cad: edit.monthly_value_cad ?? null,
      status: edit.status ?? 'draft',
    };
    const res = edit.id ? await supabase.from('contracts').update(payload).eq('id', edit.id)
                       : await supabase.from('contracts').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null);
    await load();
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id.slice(0, 6);

  const columns: Column<Contract>[] = [
    { key: 'num', label: 'Contract', searchable: (r) => `${r.contract_number ?? ''} ${clientName(r.client_id)}`, render: (r) => (
      <div>
        <div className="font-medium">{r.contract_number ?? r.id.slice(0, 8)}</div>
        <div className="text-xs text-slate-500">{clientName(r.client_id)}</div>
      </div>
    ) },
    { key: 'value', label: 'MRR', render: (r) => <span className="text-slate-300">{fmtCAD(r.monthly_value_cad)}</span> },
    {
      key: 'lines', label: 'Service lines',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.service_lines.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">{l}</span>
          ))}
        </div>
      ),
    },
    { key: 'term', label: 'Term', render: (r) => <span className="text-xs text-slate-400">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(r.status)}`}>{r.status}</span> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <a href={`/contracts/${r.id}`} className="text-xs text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>dashboard →</a>
          <button onClick={(e) => { e.stopPropagation(); setEdit(r); }} className="text-xs text-slate-400 hover:text-slate-200">edit</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Contracts"
        description="Service agreements with monthly recurring revenue. One contract may span multiple service lines."
        rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
        onCreate={{ label: 'New contract', onClick: () => setEdit({ status: 'draft', start_date: new Date().toISOString().slice(0,10), service_lines: [] }) }}
        onRowClick={(r) => { window.location.href = `/contracts/${r.id}`; }}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit contract' : 'New contract'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="contract-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <form id="contract-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Client
              <select className="input mt-1" required value={edit.client_id ?? ''} onChange={(e) => setEdit({ ...edit, client_id: e.target.value })}>
                <option value="">— select —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Contract number<input className="input mt-1" value={edit.contract_number ?? ''} onChange={(e) => setEdit({ ...edit, contract_number: e.target.value })} /></label>
            <label className="text-sm">Monthly value (CAD)<input className="input mt-1" type="number" step="0.01" value={edit.monthly_value_cad ?? ''} onChange={(e) => setEdit({ ...edit, monthly_value_cad: parseFloat(e.target.value) })} /></label>
            <label className="text-sm">Start date<input className="input mt-1" type="date" required value={edit.start_date ?? ''} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} /></label>
            <label className="text-sm">End date<input className="input mt-1" type="date" value={edit.end_date ?? ''} onChange={(e) => setEdit({ ...edit, end_date: e.target.value })} /></label>
            <label className="text-sm">Status
              <select className="input mt-1" value={edit.status ?? 'draft'} onChange={(e) => setEdit({ ...edit, status: e.target.value as Contract['status'] })}>
                <option>draft</option><option>out_for_signature</option><option>active</option>
                <option>suspended</option><option>terminated</option><option>expired</option>
              </select>
            </label>
            <fieldset className="col-span-2">
              <legend className="text-sm text-slate-400 mb-1">Service lines</legend>
              <div className="flex flex-wrap gap-2">
                {SERVICE_LINES.map((l) => (
                  <label key={l} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                    <input
                      type="checkbox"
                      checked={edit.service_lines?.includes(l) ?? false}
                      onChange={(e) => {
                        const set = new Set(edit.service_lines ?? []);
                        if (e.target.checked) set.add(l); else set.delete(l);
                        setEdit({ ...edit, service_lines: Array.from(set) as ServiceLine[] });
                      }}
                    />
                    {SERVICE_LINE_LABEL[l]}
                  </label>
                ))}
              </div>
            </fieldset>
          </form>
        )}
      </Modal>
    </>
  );
}
