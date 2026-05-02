import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';

interface Vehicle {
  id: string; unit_number: string; plate: string | null;
  vehicle_type: 'marked_patrol' | 'unmarked_patrol' | 'armoured' | 'transport' | 'utility';
  capabilities: string[];
  is_active: boolean;
  current_geo_at: string | null;
}

const TYPES: Vehicle['vehicle_type'][] = ['marked_patrol', 'unmarked_patrol', 'armoured', 'transport', 'utility'];
const CAPS = ['gps','dashcam','partition','safe','satphone'];

export function EquipmentAssets() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Vehicle> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const { data, error } = await supabase.from('vehicles').select('*').order('unit_number');
    if (error) setError(error.message);
    setRows((data ?? []) as Vehicle[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      unit_number: edit.unit_number, plate: edit.plate ?? null,
      vehicle_type: edit.vehicle_type ?? 'marked_patrol',
      capabilities: edit.capabilities ?? [],
      is_active: edit.is_active ?? true,
    };
    const res = edit.id ? await supabase.from('vehicles').update(payload).eq('id', edit.id)
                       : await supabase.from('vehicles').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null); await load();
  }

  const columns: Column<Vehicle>[] = [
    { key: 'unit', label: 'Unit', searchable: (v) => `${v.unit_number} ${v.plate ?? ''}`, render: (v) => (
      <div>
        <div className="font-medium">{v.unit_number}</div>
        <div className="text-xs text-slate-500">{v.plate ?? 'no plate'}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (v) => <span className="text-slate-300 capitalize">{v.vehicle_type.replace('_', ' ')}</span> },
    { key: 'caps', label: 'Capabilities', render: (v) => (
      <div className="flex flex-wrap gap-1">
        {v.capabilities.map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c}</span>)}
      </div>
    ) },
    { key: 'last', label: 'Last GPS', render: (v) => <span className="text-xs text-slate-400">{fmtDateTime(v.current_geo_at)}</span> },
    { key: 'active', label: 'Active', render: (v) => v.is_active ? <span className="text-emerald-400 text-xs">yes</span> : <span className="text-slate-500 text-xs">no</span> },
  ];

  return (
    <>
      <DataTable
        title="Equipment & Vehicles"
        description="Marked patrol vehicles, transport units, equipment with capability tags."
        rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
        onCreate={{ label: 'Add vehicle', onClick: () => setEdit({ vehicle_type: 'marked_patrol', capabilities: [], is_active: true }) }}
        onRowClick={(v) => setEdit(v)}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit vehicle' : 'New vehicle'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="veh-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {edit && (
          <form id="veh-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm">Unit number<input className="input mt-1" required value={edit.unit_number ?? ''} onChange={(e) => setEdit({ ...edit, unit_number: e.target.value })} /></label>
            <label className="text-sm">Plate<input className="input mt-1" value={edit.plate ?? ''} onChange={(e) => setEdit({ ...edit, plate: e.target.value })} /></label>
            <label className="text-sm">Type
              <select className="input mt-1" value={edit.vehicle_type ?? 'marked_patrol'} onChange={(e) => setEdit({ ...edit, vehicle_type: e.target.value as Vehicle['vehicle_type'] })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm flex items-center gap-2 mt-6">
              <input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              Active
            </label>
            <fieldset className="col-span-2">
              <legend className="text-sm text-slate-400 mb-1">Capabilities</legend>
              <div className="flex flex-wrap gap-2">
                {CAPS.map((c) => (
                  <label key={c} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                    <input
                      type="checkbox"
                      checked={edit.capabilities?.includes(c) ?? false}
                      onChange={(e) => {
                        const set = new Set(edit.capabilities ?? []);
                        if (e.target.checked) set.add(c); else set.delete(c);
                        setEdit({ ...edit, capabilities: Array.from(set) });
                      }}
                    />{c}
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
