import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import type { Org, UserProfile } from '@stigg/shared';
import { Shield, Save } from 'lucide-react';
import { SERVICE_LINES, SERVICE_LINE_LABEL } from '@stigg/shared';

export function Settings() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [edit, setEdit] = useState<Partial<UserProfile> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgDirty, setOrgDirty] = useState(false);

  async function load() {
    if (!supabaseConfigured || !profile) return;
    const [{ data: o }, { data: us }] = await Promise.all([
      supabase.from('orgs').select('*').eq('id', profile.org_id).single(),
      supabase.from('user_profiles').select('*').eq('org_id', profile.org_id).order('full_name'),
    ]);
    setOrg(o as Org);
    setUsers((us ?? []) as UserProfile[]);
  }
  useEffect(() => { load(); }, [profile?.org_id]);

  async function saveOrg() {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from('orgs').update({
      name: org.name,
      timezone: org.timezone,
      ssia_license: org.ssia_license,
      service_lines: org.service_lines,
    }).eq('id', org.id);
    setSaving(false);
    if (error) setError(error.message); else setOrgDirty(false);
  }

  async function saveUser() {
    if (!edit?.id) return;
    setSaving(true);
    const { error } = await supabase.from('user_profiles').update({
      role: edit.role, is_active: edit.is_active, full_name: edit.full_name,
    }).eq('id', edit.id);
    setSaving(false);
    if (error) setError(error.message); else { setEdit(null); await load(); }
  }

  const userCols: Column<UserProfile>[] = [
    { key: 'name', label: 'Name', searchable: (u) => `${u.full_name ?? ''} ${u.email}`, render: (u) => (
      <div>
        <div className="font-medium">{u.full_name ?? '—'}</div>
        <div className="text-xs text-slate-500">{u.email}</div>
      </div>
    ) },
    { key: 'role', label: 'Role', render: (u) => <code className="text-xs">{u.role}</code> },
    { key: 'active', label: 'Active', render: (u) => u.is_active ? <span className="text-emerald-400 text-xs">yes</span> : <span className="text-slate-500 text-xs">disabled</span> },
    { key: 'last', label: 'Last seen', render: (u) => <span className="text-xs text-slate-400">{fmtDateTime((u as any).last_seen_at)}</span> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Shield /> Settings</h1>
        <p className="text-slate-400 mt-1">Organization configuration, members, and service lines.</p>
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}

      {org && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Organization</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Name<input className="input mt-1" value={org.name} onChange={(e) => { setOrg({ ...org, name: e.target.value }); setOrgDirty(true); }} /></label>
            <label className="text-sm">Timezone<input className="input mt-1" value={org.timezone} onChange={(e) => { setOrg({ ...org, timezone: e.target.value }); setOrgDirty(true); }} /></label>
            <label className="text-sm">SSIA license<input className="input mt-1" value={org.ssia_license ?? ''} onChange={(e) => { setOrg({ ...org, ssia_license: e.target.value }); setOrgDirty(true); }} /></label>
            <label className="text-sm">Region<input className="input mt-1" value={org.region} disabled /></label>
          </div>
          <fieldset>
            <legend className="text-sm text-slate-400 mb-1">Active service lines</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICE_LINES.map((l) => (
                <label key={l} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                  <input
                    type="checkbox"
                    checked={org.service_lines.includes(l)}
                    onChange={(e) => {
                      const set = new Set(org.service_lines);
                      if (e.target.checked) set.add(l); else set.delete(l);
                      setOrg({ ...org, service_lines: Array.from(set) }); setOrgDirty(true);
                    }}
                  />
                  {SERVICE_LINE_LABEL[l]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end">
            <button className="btn-primary inline-flex items-center gap-1" onClick={saveOrg} disabled={!orgDirty || saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      )}

      <section>
        <DataTable
          title="Members" description="Org users + their roles. Only admins can change roles."
          rows={users} loading={false} error={null} columns={userCols}
          onRowClick={(u) => setEdit(u)}
        />
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit member" width="md"
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveUser} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <div className="space-y-3">
            <label className="text-sm block">Full name<input className="input mt-1" value={edit.full_name ?? ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></label>
            <label className="text-sm block">Role
              <select className="input mt-1" value={edit.role ?? 'viewer'} onChange={(e) => setEdit({ ...edit, role: e.target.value as UserProfile['role'] })}>
                <option>owner</option><option>admin</option><option>manager</option>
                <option>dispatcher</option><option>supervisor</option><option>guard</option>
                <option>it_tech</option><option>transport_officer</option><option>client</option><option>viewer</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              Active
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
