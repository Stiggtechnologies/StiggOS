import { useEffect, useState, type FormEvent } from 'react';
import { Tag, Battery, MapPin } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';

interface Tracker {
  id: string; label: string; asset_type: string; vendor: string;
  device_serial: string | null;
  assigned_to: string | null;
  last_seen_at: string | null; battery_pct: number | null;
  is_active: boolean;
}

export function Assets() {
  const [rows, setRows] = useState<Tracker[]>([]);
  const [edit, setEdit] = useState<Partial<Tracker> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); return; }
    const { data, error } = await supabase.from('asset_trackers').select('*').order('label');
    if (error) setError(error.message);
    setRows((data ?? []) as Tracker[]);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return; setSaving(true);
    const payload: any = {
      label: edit.label,
      asset_type: edit.asset_type ?? 'keys',
      vendor: edit.vendor ?? 'airtag',
      device_serial: edit.device_serial ?? null,
      is_active: edit.is_active ?? true,
    };
    const res = edit.id ? await supabase.from('asset_trackers').update(payload).eq('id', edit.id)
                       : await supabase.from('asset_trackers').insert(payload);
    setSaving(false);
    if (res.error) setError(res.error.message); else { setEdit(null); load(); }
  }

  const cols: Column<Tracker>[] = [
    { key: 'label', label: 'Asset', searchable: (t) => `${t.label} ${t.device_serial ?? ''}`, render: (t) => (
      <div>
        <div className="font-medium">{t.label}</div>
        <div className="text-xs text-slate-500">{t.asset_type.replace(/_/g,' ')} · {t.vendor}</div>
      </div>
    ) },
    { key: 'serial', label: 'Serial', render: (t) => <code className="text-xs text-slate-400">{t.device_serial ?? '—'}</code> },
    { key: 'last', label: 'Last ping', render: (t) => {
      const d = t.last_seen_at;
      const ageH = d ? (Date.now() - Date.parse(d)) / 3_600_000 : null;
      return (
        <div>
          <div className="text-xs text-slate-400">{fmtDateTime(d)}</div>
          {ageH != null && (
            <div className={`text-[10px] ${ageH > 72 ? 'text-red-400' : ageH > 24 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {ageH < 1 ? '<1h ago' : `${ageH.toFixed(0)}h ago`}
            </div>
          )}
        </div>
      );
    } },
    { key: 'batt', label: 'Battery', render: (t) => t.battery_pct == null
      ? <span className="text-xs text-slate-500">—</span>
      : <span className={`text-xs inline-flex items-center gap-1 ${t.battery_pct < 15 ? 'text-red-400' : t.battery_pct < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
          <Battery size={12} /> {t.battery_pct}%
        </span> },
    { key: 'active', label: 'Active', render: (t) => t.is_active ? <span className="text-emerald-400 text-xs">yes</span> : <span className="text-slate-500 text-xs">no</span> },
  ];

  return (
    <>
      <DataTable
        title="Asset trackers"
        description="AirTag / Tile / FindMy bridge devices for keys, radios, patrol kits."
        rows={rows} loading={false} error={error} columns={cols} onRefresh={load}
        onCreate={{ label: 'Add tracker', onClick: () => setEdit({ asset_type: 'keys', vendor: 'airtag', is_active: true }) }}
        onRowClick={(t) => setEdit(t)}
        toolbar={<span className="text-xs text-slate-500">
          Bridge POSTs to <code className="text-blue-300">/functions/v1/asset-track?token=…</code>
        </span>}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit tracker' : 'New tracker'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="asset-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {edit && (
          <form id="asset-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Label<input className="input mt-1" required value={edit.label ?? ''} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></label>
            <label className="text-sm">Type
              <select className="input mt-1" value={edit.asset_type ?? 'keys'} onChange={(e) => setEdit({ ...edit, asset_type: e.target.value })}>
                {['keys','radio','patrol_kit','lockbox','tablet','vehicle_kit','other'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm">Vendor
              <select className="input mt-1" value={edit.vendor ?? 'airtag'} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })}>
                {['airtag','tile','samsung','generic_ble','findmy_bridge'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm col-span-2">Device serial<input className="input mt-1 font-mono" value={edit.device_serial ?? ''} onChange={(e) => setEdit({ ...edit, device_serial: e.target.value })} /></label>
            <label className="text-sm flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              Active
            </label>
          </form>
        )}
      </Modal>
    </>
  );
}
