import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import type { Site, Client } from '@stigg/shared';
import { SERVICE_LINES, SERVICE_LINE_LABEL } from '@stigg/shared';
import { MapPin, AlertTriangle } from 'lucide-react';

export function Sites() {
  const [rows, setRows] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Site> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [sites, cs] = await Promise.all([
      supabase.from('sites').select('*').order('name'),
      supabase.from('clients').select('id, name, status').order('name'),
    ]);
    if (sites.error) setError(sites.error.message);
    setRows((sites.data ?? []) as Site[]);
    setClients((cs.data ?? []) as Client[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      client_id: edit.client_id,
      name: edit.name,
      city: edit.city ?? null,
      region: edit.region ?? 'AB',
      site_type: edit.site_type ?? 'commercial',
      remote: edit.remote ?? false,
      hazards: edit.hazards ?? [],
      service_lines: edit.service_lines ?? ['guarding'],
      is_active: edit.is_active ?? true,
    };
    const res = edit.id
      ? await supabase.from('sites').update(payload).eq('id', edit.id)
      : await supabase.from('sites').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null);
    await load();
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id.slice(0, 6);

  const columns: Column<Site>[] = [
    {
      key: 'name', label: 'Site',
      searchable: (s) => `${s.name} ${s.city ?? ''}`,
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} /> {s.city ?? '—'}, {s.region ?? '—'}</div>
        </div>
      ),
    },
    { key: 'client', label: 'Client', render: (s) => <span className="text-slate-300">{clientName(s.client_id)}</span> },
    { key: 'type', label: 'Type', render: (s) => <span className="text-slate-300 capitalize">{s.site_type.replace('_',' ')}</span> },
    {
      key: 'lines', label: 'Service lines',
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.service_lines.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">{l}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'flags', label: '',
      render: (s) => (
        <div className="flex items-center gap-2 text-amber-400">
          {s.remote && <span title="Remote — Working Alone procedures required" className="inline-flex items-center gap-1 text-[11px]"><AlertTriangle size={11} /> remote</span>}
          {!s.is_active && <span className="text-[11px] text-slate-500">inactive</span>}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Sites & Posts"
        description="Physical locations where service is delivered. Remote sites trigger Working-Alone rules under AB OHS Code Part 28."
        rows={rows} loading={loading} error={error}
        columns={columns} onRefresh={load}
        onCreate={{ label: 'Add site', onClick: () => setEdit({ region: 'AB', site_type: 'commercial', service_lines: ['guarding'], is_active: true }) }}
        onRowClick={(s) => setEdit(s)}
      />
      <Modal
        open={!!edit} onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit site' : 'New site'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="site-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <form id="site-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Name
              <input className="input mt-1" required value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </label>
            <label className="text-sm col-span-2">Client
              <select className="input mt-1" required value={edit.client_id ?? ''} onChange={(e) => setEdit({ ...edit, client_id: e.target.value })}>
                <option value="">— select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm">City<input className="input mt-1" value={edit.city ?? ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></label>
            <label className="text-sm">Region
              <select className="input mt-1" value={edit.region ?? 'AB'} onChange={(e) => setEdit({ ...edit, region: e.target.value as Site['region'] })}>
                {['AB','BC','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm">Type
              <select className="input mt-1" value={edit.site_type ?? 'commercial'} onChange={(e) => setEdit({ ...edit, site_type: e.target.value as Site['site_type'] })}>
                {['residential','commercial','industrial','oil_gas','construction','retail','healthcare','hospitality','government','education','remote','other'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm flex items-center gap-2 mt-6">
              <input type="checkbox" checked={!!edit.remote} onChange={(e) => setEdit({ ...edit, remote: e.target.checked })} />
              Remote (lone-worker procedures required)
            </label>
            <fieldset className="col-span-2 text-sm">
              <legend className="mb-1 text-slate-400">Service lines</legend>
              <div className="flex flex-wrap gap-2">
                {SERVICE_LINES.map((l) => (
                  <label key={l} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                    <input
                      type="checkbox"
                      checked={edit.service_lines?.includes(l) ?? false}
                      onChange={(e) => {
                        const set = new Set(edit.service_lines ?? []);
                        if (e.target.checked) set.add(l); else set.delete(l);
                        setEdit({ ...edit, service_lines: Array.from(set) as Site['service_lines'] });
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
