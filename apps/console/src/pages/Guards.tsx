import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtCAD, fmtDate, expiryClass, expiryLabel, daysUntil, statusBadge } from '../lib/format';
import type { Guard } from '@stigg/shared';

export function Guards() {
  const [rows, setRows] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Guard> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('guards').select('*').order('last_name');
    if (error) setError(error.message);
    setRows((data ?? []) as Guard[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      first_name: edit.first_name?.trim(),
      last_name: edit.last_name?.trim(),
      email: edit.email || null,
      phone: edit.phone || null,
      hourly_rate: edit.hourly_rate ?? null,
      status: edit.status ?? 'active',
      employment_type: edit.employment_type ?? 'hourly',
      ssia_license_number: edit.ssia_license_number || null,
      ssia_license_expiry: edit.ssia_license_expiry || null,
      first_aid_expiry: edit.first_aid_expiry || null,
    };
    const res = edit.id
      ? await supabase.from('guards').update(payload).eq('id', edit.id)
      : await supabase.from('guards').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null);
    await load();
  }

  const columns: Column<Guard>[] = [
    {
      key: 'name', label: 'Name',
      searchable: (g) => `${g.first_name} ${g.last_name} ${g.email ?? ''}`,
      render: (g) => (
        <div>
          <div className="font-medium">{g.first_name} {g.last_name}</div>
          <div className="text-xs text-slate-500">{g.email ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (g) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(g.status)}`}>{g.status}</span>,
    },
    {
      key: 'rate', label: 'Pay rate',
      render: (g) => <span className="text-slate-300">{fmtCAD(g.hourly_rate)}/h</span>,
    },
    {
      key: 'license', label: 'SSIA license',
      render: (g) => (
        <div>
          <div className="text-slate-300">{g.ssia_license_number ?? <span className="text-red-400">missing</span>}</div>
          <div className={`text-xs ${expiryClass(daysUntil(g.ssia_license_expiry))}`}>{expiryLabel(g.ssia_license_expiry)}</div>
        </div>
      ),
    },
    {
      key: 'firstaid', label: 'First-aid',
      render: (g) => <span className={`text-xs ${expiryClass(daysUntil(g.first_aid_expiry))}`}>{expiryLabel(g.first_aid_expiry)}</span>,
    },
    { key: 'hire', label: 'Hired', render: () => <span className="text-xs text-slate-500">—</span> },
  ];

  return (
    <>
      <DataTable
        title="Guards"
        description="Active officers, license tracking, employment status."
        rows={rows} loading={loading} error={error}
        columns={columns}
        onRefresh={load}
        onCreate={{ label: 'Add guard', onClick: () => setEdit({ status: 'active', employment_type: 'hourly' }) }}
        onRowClick={(g) => setEdit(g)}
        emptyMessage="No guards yet. Add the first one to start scheduling."
        searchPlaceholder="Search by name or email"
      />
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit guard' : 'New guard'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn-primary" form="guard-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        {edit && (
          <form id="guard-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm">First name<input className="input mt-1" required value={edit.first_name ?? ''} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></label>
            <label className="text-sm">Last name<input className="input mt-1" required value={edit.last_name ?? ''} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></label>
            <label className="text-sm">Email<input className="input mt-1" type="email" value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
            <label className="text-sm">Phone<input className="input mt-1" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
            <label className="text-sm">Hourly rate (CAD)<input className="input mt-1" type="number" step="0.25" value={edit.hourly_rate ?? ''} onChange={(e) => setEdit({ ...edit, hourly_rate: parseFloat(e.target.value) })} /></label>
            <label className="text-sm">Status
              <select className="input mt-1" value={edit.status ?? 'active'} onChange={(e) => setEdit({ ...edit, status: e.target.value as Guard['status'] })}>
                <option value="active">active</option><option value="inactive">inactive</option>
                <option value="on_leave">on_leave</option><option value="probation">probation</option>
                <option value="terminated">terminated</option>
              </select>
            </label>
            <label className="text-sm col-span-2">SSIA license number<input className="input mt-1" value={edit.ssia_license_number ?? ''} onChange={(e) => setEdit({ ...edit, ssia_license_number: e.target.value })} /></label>
            <label className="text-sm">SSIA expiry<input className="input mt-1" type="date" value={edit.ssia_license_expiry ?? ''} onChange={(e) => setEdit({ ...edit, ssia_license_expiry: e.target.value })} /></label>
            <label className="text-sm">First-aid expiry<input className="input mt-1" type="date" value={edit.first_aid_expiry ?? ''} onChange={(e) => setEdit({ ...edit, first_aid_expiry: e.target.value })} /></label>
            <p className="col-span-2 text-xs text-slate-500">
              Per Alberta SSIA, you cannot schedule a guard whose license has expired. The compliance scan flags this automatically.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
