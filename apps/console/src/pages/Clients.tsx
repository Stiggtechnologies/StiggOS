import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { statusBadge } from '../lib/format';
import type { Client } from '@stigg/shared';
import { SERVICE_LINES, SERVICE_LINE_LABEL } from '@stigg/shared';

export function Clients() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Client> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) setError(error.message);
    setRows((data ?? []) as Client[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      name: edit.name,
      industry: edit.industry || null,
      tier: edit.tier || null,
      status: edit.status ?? 'prospect',
      service_lines: edit.service_lines ?? [],
      portal_enabled: edit.portal_enabled ?? false,
      primary_contact: edit.primary_contact ?? null,
      tags: edit.tags ?? [],
    };
    const res = edit.id
      ? await supabase.from('clients').update(payload).eq('id', edit.id)
      : await supabase.from('clients').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null);
    await load();
  }

  const columns: Column<Client>[] = [
    { key: 'name', label: 'Client', searchable: (c) => `${c.name} ${c.industry ?? ''}`, render: (c) => (
      <div>
        <div className="font-medium">{c.name}</div>
        <div className="text-xs text-slate-500">{c.industry ?? '—'}</div>
      </div>
    ) },
    { key: 'tier', label: 'Tier', render: (c) => <span className="text-slate-300">{c.tier ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (c) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(c.status)}`}>{c.status}</span> },
    {
      key: 'lines', label: 'Service lines',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.service_lines.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">{l}</span>
          ))}
        </div>
      ),
    },
    { key: 'portal', label: 'Portal', render: (c) => c.portal_enabled
      ? <span className="text-emerald-400 text-xs">enabled</span>
      : <span className="text-slate-500 text-xs">off</span> },
  ];

  return (
    <>
      <DataTable
        title="Clients"
        description="Customer accounts. One client may consume multiple service lines."
        rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
        onCreate={{ label: 'Add client', onClick: () => setEdit({ status: 'prospect', service_lines: [], portal_enabled: false }) }}
        onRowClick={(c) => setEdit(c)}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit client' : 'New client'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="client-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <form id="client-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Name<input className="input mt-1" required value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="text-sm">Industry<input className="input mt-1" value={edit.industry ?? ''} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} /></label>
            <label className="text-sm">Tier
              <select className="input mt-1" value={edit.tier ?? ''} onChange={(e) => setEdit({ ...edit, tier: (e.target.value || null) as Client['tier'] })}>
                <option value="">—</option><option>Essential</option><option>Enhanced</option><option>Premium</option><option>Enterprise</option>
              </select>
            </label>
            <label className="text-sm">Status
              <select className="input mt-1" value={edit.status ?? 'prospect'} onChange={(e) => setEdit({ ...edit, status: e.target.value as Client['status'] })}>
                <option>prospect</option><option>active</option><option>paused</option><option>churned</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2 mt-6">
              <input type="checkbox" checked={!!edit.portal_enabled} onChange={(e) => setEdit({ ...edit, portal_enabled: e.target.checked })} />
              Portal access
            </label>
            <fieldset className="col-span-2">
              <legend className="text-sm text-slate-400 mb-1">Service lines consumed</legend>
              <div className="flex flex-wrap gap-2">
                {SERVICE_LINES.map((l) => (
                  <label key={l} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                    <input
                      type="checkbox"
                      checked={edit.service_lines?.includes(l) ?? false}
                      onChange={(e) => {
                        const set = new Set(edit.service_lines ?? []);
                        if (e.target.checked) set.add(l); else set.delete(l);
                        setEdit({ ...edit, service_lines: Array.from(set) as Client['service_lines'] });
                      }}
                    />
                    {SERVICE_LINE_LABEL[l]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm col-span-2">Primary contact (JSON)
              <textarea className="input mt-1 font-mono text-xs" rows={3}
                value={edit.primary_contact ? JSON.stringify(edit.primary_contact, null, 2) : ''}
                onChange={(e) => {
                  try { setEdit({ ...edit, primary_contact: e.target.value ? JSON.parse(e.target.value) : null }); }
                  catch { /* deferred */ }
                }} />
            </label>
          </form>
        )}
      </Modal>
    </>
  );
}
