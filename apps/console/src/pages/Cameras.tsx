import { useEffect, useState, type FormEvent } from 'react';
import { Camera, Plus, Edit3, Shield, Wifi, WifiOff } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';

interface CameraRow {
  id: string; org_id: string; site_id: string;
  nvr_system_id: string | null;
  channel_no: number | null;
  label: string
  ai_features: string[];
  online: boolean;
  last_seen_at: string | null;
}

interface NvrSystem {
  id: string; vendor: string; label: string; site_id: string | null; is_active: boolean;
}

interface ArmingSchedule {
  id: string; name: string; spec: any; is_active: boolean;
}

interface LinkageRule {
  id: string; scope_type: 'camera'|'site'|'org'; scope_id: string | null;
  event_types: string[]; severity_min: string | null;
  arming_schedule_id: string | null; actions: any[]; priority: number; is_active: boolean;
}

const HIK_EVENTS = ['linecrossing','intrusion','region_entrance','region_exiting','object_removal','tamper','motion','pir','alarm_input'];
const ACTION_KINDS = ['notify_push','notify_sms','notify_email','notify_voice','fire_relay','fire_siren','talk_down','dispatch_route','create_incident'];

export function Cameras() {
  const [tab, setTab] = useState<'cameras'|'nvrs'|'schedules'|'rules'>('cameras');
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Camera /> Cameras & Automation</h1>
        <p className="text-slate-400 mt-1">
          NVRs / VMS bridges, arming schedules (when), and linkage rules (what to do).
          Together these replace what HikCentral Professional does — vendor-agnostic.
        </p>
      </header>
      <nav className="flex gap-1 mb-4 text-sm">
        {[
          { k: 'cameras',   label: 'Cameras' },
          { k: 'nvrs',      label: 'NVR / VMS bridges' },
          { k: 'schedules', label: 'Arming schedules' },
          { k: 'rules',     label: 'Linkage rules' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-3 py-2 rounded-t border-b-2 ${tab === t.k ? 'border-blue-500 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >{t.label}</button>
        ))}
      </nav>
      {tab === 'cameras'   && <CamerasTab />}
      {tab === 'nvrs'      && <NvrsTab />}
      {tab === 'schedules' && <SchedulesTab />}
      {tab === 'rules'     && <RulesTab />}
    </div>
  );
}

function CamerasTab() {
  const [rows, setRows] = useState<CameraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    supabase.from('cameras').select('id, org_id, site_id, nvr_system_id, channel_no, label, ai_features, online, last_seen_at').order('label').then(({ data, error }) => {
      if (error) setError(error.message);
      setRows((data ?? []) as CameraRow[]);
      setLoading(false);
    });
  }, []);

  const cols: Column<CameraRow>[] = [
    { key: 'label', label: 'Camera', searchable: (c) => c.label, render: (c) => (
      <div>
        <div className="font-medium">{c.label}</div>
        <div className="text-xs text-slate-500">{c.nvr_system_id ? `NVR ch.${c.channel_no ?? '—'}` : 'standalone / RTSP'}</div>
      </div>
    ) },
    { key: 'features', label: 'AI features', render: (c) => (
      <div className="flex flex-wrap gap-1">{c.ai_features.map((f) => <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">{f}</span>)}</div>
    ) },
    { key: 'status', label: 'Status', render: (c) => c.online
      ? <span className="text-emerald-400 text-xs inline-flex items-center gap-1"><Wifi size={12} /> online</span>
      : <span className="text-amber-400 text-xs inline-flex items-center gap-1"><WifiOff size={12} /> offline</span>
    },
    { key: 'last', label: 'Last seen', render: (c) => <span className="text-xs text-slate-400">{fmtDateTime(c.last_seen_at)}</span> },
  ];
  return <DataTable title="" rows={rows} loading={loading} error={error} columns={cols} />;
}

function NvrsTab() {
  const [rows, setRows] = useState<NvrSystem[]>([]);
  const [edit, setEdit] = useState<Partial<NvrSystem & { hostname?: string; api_port?: number; username?: string; secret_ref?: string; webhook_secret?: string; capabilities?: string[] }> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from('nvr_systems').select('*').order('label');
    if (error) setError(error.message);
    setRows((data ?? []) as NvrSystem[]);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return; setSaving(true);
    const payload: any = {
      vendor: edit.vendor ?? 'hikvision',
      label: edit.label,
      hostname: edit.hostname ?? null,
      api_port: edit.api_port ?? null,
      username: edit.username ?? null,
      secret_ref: edit.secret_ref ?? null,
      webhook_secret: edit.webhook_secret ?? null,
      capabilities: edit.capabilities ?? [],
      is_active: edit.is_active ?? true,
    };
    const res = (edit as any).id ? await supabase.from('nvr_systems').update(payload).eq('id', (edit as any).id)
                                 : await supabase.from('nvr_systems').insert(payload);
    setSaving(false);
    if (res.error) setError(res.error.message); else { setEdit(null); load(); }
  }

  const cols: Column<NvrSystem>[] = [
    { key: 'label', label: 'Bridge', searchable: (n) => `${n.label} ${n.vendor}`, render: (n) => (
      <div>
        <div className="font-medium">{n.label}</div>
        <div className="text-xs text-slate-500">{n.vendor}</div>
      </div>
    ) },
    { key: 'active', label: 'Active', render: (n) => n.is_active ? <span className="text-emerald-400 text-xs">yes</span> : <span className="text-slate-500 text-xs">no</span> },
  ];

  return (
    <>
      <DataTable
        title="" rows={rows} loading={false} error={error} columns={cols}
        onCreate={{ label: 'Add NVR / VMS', onClick: () => setEdit({ vendor: 'hikvision', is_active: true, capabilities: ['event_push'] }) }}
        onRowClick={(n) => setEdit(n as any)}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title="NVR / VMS bridge"
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="nvr-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {edit && (
          <form id="nvr-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Label<input className="input mt-1" required value={edit.label ?? ''} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></label>
            <label className="text-sm">Vendor
              <select className="input mt-1" value={edit.vendor ?? 'hikvision'} onChange={(e) => setEdit({ ...edit, vendor: e.target.value })}>
                {['hikvision','hikcentral','dahua','axis','milestone','generic_onvif','rtsp_only'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm flex items-center gap-2 mt-6">
              <input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              Active
            </label>
            <label className="text-sm">Hostname<input className="input mt-1" value={edit.hostname ?? ''} onChange={(e) => setEdit({ ...edit, hostname: e.target.value })} /></label>
            <label className="text-sm">API port<input className="input mt-1" type="number" value={edit.api_port ?? 80} onChange={(e) => setEdit({ ...edit, api_port: parseInt(e.target.value) })} /></label>
            <label className="text-sm">ISAPI username<input className="input mt-1" value={edit.username ?? ''} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></label>
            <label className="text-sm">ISAPI password<input className="input mt-1" type="password" value={edit.secret_ref ?? ''} onChange={(e) => setEdit({ ...edit, secret_ref: e.target.value })} /></label>
            <label className="text-sm col-span-2">Webhook HMAC secret
              <input className="input mt-1 font-mono" value={edit.webhook_secret ?? ''} onChange={(e) => setEdit({ ...edit, webhook_secret: e.target.value })} placeholder="paste the secret you configured on the NVR's HTTP Listener" />
            </label>
            <p className="text-xs text-slate-500 col-span-2">
              <Shield size={11} className="inline" /> Configure the NVR's HTTP listener URL to:{" "}
              <code className="text-blue-300">{`${import.meta.env.VITE_SUPABASE_URL ?? 'https://<project>.supabase.co'}/functions/v1/hikvision-events?nvr=<id>`}</code>{" "}
              with HMAC-SHA256 signature header X-Hik-Signature.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}

function SchedulesTab() {
  const [rows, setRows] = useState<ArmingSchedule[]>([]);
  const [edit, setEdit] = useState<Partial<ArmingSchedule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<string>('');

  async function load() {
    const { data } = await supabase.from('arming_schedules').select('*').order('name');
    setRows((data ?? []) as ArmingSchedule[]);
  }
  useEffect(() => { load(); }, []);

  function open(row?: ArmingSchedule) {
    const r = row ?? { name: '', spec: { timezone: 'America/Edmonton', windows: [{ days: [1,2,3,4,5], start: '09:00', end: '17:00' }] }, is_active: true };
    setEdit(r);
    setJson(JSON.stringify(r.spec, null, 2));
  }

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return; setSaving(true); setError(null);
    let spec: any;
    try { spec = JSON.parse(json); } catch (err) { setError('Invalid JSON in spec'); setSaving(false); return; }
    const payload: any = { name: edit.name, spec, is_active: edit.is_active ?? true };
    const res = edit.id ? await supabase.from('arming_schedules').update(payload).eq('id', edit.id)
                       : await supabase.from('arming_schedules').insert(payload);
    setSaving(false);
    if (res.error) setError(res.error.message); else { setEdit(null); load(); }
  }

  const cols: Column<ArmingSchedule>[] = [
    { key: 'name', label: 'Name', searchable: (s) => s.name, render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'tz', label: 'Timezone', render: (s) => <code className="text-xs">{s.spec?.timezone ?? '—'}</code> },
    { key: 'windows', label: 'Windows', render: (s) => <span className="text-xs text-slate-400">{(s.spec?.windows ?? []).length} window(s)</span> },
  ];

  return (
    <>
      <DataTable title="" rows={rows} loading={false} error={error} columns={cols}
        onCreate={{ label: 'New schedule', onClick: () => open() }}
        onRowClick={(r) => open(r)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Arming schedule" width="lg"
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="sch-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {edit && (
          <form id="sch-form" onSubmit={save} className="space-y-3">
            <label className="text-sm block">Name<input className="input mt-1" required value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Active</label>
            <div>
              <p className="text-sm text-slate-400 mb-1">spec (JSON)</p>
              <textarea className="input font-mono text-xs h-48" value={json} onChange={(e) => setJson(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">days = ISO weekdays 1..7 (Mon..Sun). Times in 24h "HH:MM". Overnight windows allowed (start {'>'} end).</p>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function RulesTab() {
  const [rows, setRows] = useState<LinkageRule[]>([]);
  const [schedules, setSchedules] = useState<ArmingSchedule[]>([]);
  const [edit, setEdit] = useState<Partial<LinkageRule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionsJson, setActionsJson] = useState('');

  async function load() {
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('linkage_rules').select('*').order('priority'),
      supabase.from('arming_schedules').select('*').eq('is_active', true).order('name'),
    ]);
    setRows((r ?? []) as LinkageRule[]);
    setSchedules((s ?? []) as ArmingSchedule[]);
  }
  useEffect(() => { load(); }, []);

  function open(row?: LinkageRule) {
    const r = row ?? {
      scope_type: 'org' as const, scope_id: null,
      event_types: ['linecrossing'], severity_min: null,
      arming_schedule_id: null, actions: [{ kind: 'notify_push' }],
      priority: 100, is_active: true,
    };
    setEdit(r);
    setActionsJson(JSON.stringify(r.actions ?? [], null, 2));
  }

  async function save(e: FormEvent) {
    e.preventDefault(); if (!edit) return; setSaving(true); setError(null);
    let actions: any;
    try { actions = JSON.parse(actionsJson); }
    catch { setError('Invalid JSON for actions'); setSaving(false); return; }
    const payload: any = {
      scope_type: edit.scope_type ?? 'org', scope_id: edit.scope_id ?? null,
      event_types: edit.event_types ?? [],
      severity_min: edit.severity_min ?? null,
      arming_schedule_id: edit.arming_schedule_id ?? null,
      actions, priority: edit.priority ?? 100, is_active: edit.is_active ?? true,
    };
    const res = edit.id ? await supabase.from('linkage_rules').update(payload).eq('id', edit.id)
                       : await supabase.from('linkage_rules').insert(payload);
    setSaving(false);
    if (res.error) setError(res.error.message); else { setEdit(null); load(); }
  }

  const cols: Column<LinkageRule>[] = [
    { key: 'scope', label: 'Scope', searchable: (r) => `${r.scope_type} ${(r.scope_id ?? '').slice(0,6)}`, render: (r) => (
      <span className="text-slate-300">{r.scope_type}{r.scope_id ? ` · ${r.scope_id.slice(0, 6)}` : ''}</span>
    ) },
    { key: 'evts', label: 'Events', render: (r) => (
      <div className="flex flex-wrap gap-1">{r.event_types.slice(0, 3).map((e) => <span key={e} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{e}</span>)}{r.event_types.length > 3 && <span className="text-[10px] text-slate-500">+{r.event_types.length-3}</span>}</div>
    ) },
    { key: 'sev', label: 'Sev floor', render: (r) => <span className="text-xs text-slate-400">{r.severity_min ?? '—'}</span> },
    { key: 'sched', label: 'Schedule', render: (r) => <span className="text-xs text-slate-400">{r.arming_schedule_id ? schedules.find(s => s.id === r.arming_schedule_id)?.name ?? '—' : 'always'}</span> },
    { key: 'actions', label: 'Actions', render: (r) => <span className="text-xs">{r.actions.length} step(s)</span> },
    { key: 'p', label: 'Priority', render: (r) => <span className="text-xs">{r.priority}</span> },
  ];

  return (
    <>
      <DataTable title="" rows={rows} loading={false} error={error} columns={cols}
        onCreate={{ label: 'New rule', onClick: () => open() }} onRowClick={(r) => open(r)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Linkage rule" width="xl"
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="rule-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {edit && (
          <form id="rule-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm">Scope
              <select className="input mt-1" value={edit.scope_type} onChange={(e) => setEdit({ ...edit, scope_type: e.target.value as any })}>
                <option value="org">org</option><option value="site">site</option><option value="camera">camera</option>
              </select>
            </label>
            <label className="text-sm">Scope id (uuid; blank for org-wide)
              <input className="input mt-1 font-mono" value={edit.scope_id ?? ''} onChange={(e) => setEdit({ ...edit, scope_id: e.target.value || null })} />
            </label>
            <fieldset className="col-span-2">
              <legend className="text-sm text-slate-400 mb-1">Event types</legend>
              <div className="flex flex-wrap gap-2">
                {HIK_EVENTS.map((ev) => (
                  <label key={ev} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-700">
                    <input type="checkbox" checked={(edit.event_types ?? []).includes(ev)}
                      onChange={(e) => {
                        const set = new Set(edit.event_types ?? []);
                        if (e.target.checked) set.add(ev); else set.delete(ev);
                        setEdit({ ...edit, event_types: Array.from(set) });
                      }} />
                    {ev}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm">Severity floor
              <select className="input mt-1" value={edit.severity_min ?? ''} onChange={(e) => setEdit({ ...edit, severity_min: e.target.value || null })}>
                <option value="">—</option><option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </label>
            <label className="text-sm">Arming schedule
              <select className="input mt-1" value={edit.arming_schedule_id ?? ''} onChange={(e) => setEdit({ ...edit, arming_schedule_id: e.target.value || null })}>
                <option value="">always armed</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Priority (lower = first)<input className="input mt-1" type="number" value={edit.priority ?? 100} onChange={(e) => setEdit({ ...edit, priority: parseInt(e.target.value) })} /></label>
            <label className="text-sm flex items-center gap-2 mt-6"><input type="checkbox" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Active</label>
            <div className="col-span-2">
              <p className="text-sm text-slate-400 mb-1">Actions (JSON array — runs in order)</p>
              <textarea className="input font-mono text-xs h-48" value={actionsJson} onChange={(e) => setActionsJson(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">Kinds: {ACTION_KINDS.join(' · ')}. dispatch_route requires <code>route_id</code>.</p>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
