// Service Requests — customer-initiated tickets to ops. Auto-opens the new
// form when arrived at via /requests?new=1.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wrench, Plus, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, invokeFn } from '../lib/supabase';
import { ago, ucfirst } from '../lib/format';

interface Req {
  id: string; category: string; subject: string; description: string;
  priority: string; status: string; created_at: string;
  resolved_at: string | null; resolution: string | null;
  site_id: string | null;
}
interface Site { id: string; name: string }

const CATEGORIES = [
  { value: 'additional_coverage', label: 'Additional coverage (extra hours / extra patrol)' },
  { value: 'change_request',      label: 'Change request (scope / hours / post orders)' },
  { value: 'access_change',       label: 'Access change (key / code / access)' },
  { value: 'incident_followup',   label: 'Follow-up on a past incident' },
  { value: 'meeting_request',     label: 'Service review meeting' },
  { value: 'quote_request',       label: 'Quote for a new service line' },
  { value: 'complaint',           label: 'Service complaint' },
  { value: 'other',               label: 'Something else' },
] as const;

export function ServiceRequests() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [r, s] = await Promise.all([
      supabase.from('service_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('sites').select('id, name').order('name'),
    ]);
    setReqs((r.data ?? []) as Req[]);
    setSites((s.data ?? []) as Site[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Wrench size={20} className="text-stigg-600" /> Service requests</h1>
          <p className="page-subtitle">Anything you need from us — extra coverage, scope change, follow-up, complaint.</p>
        </div>
        <button className="btn-primary" onClick={() => { setOpen(true); setParams({ new: '1' }); }}>
          <Plus size={14} /> New request
        </button>
      </div>

      {open && <NewRequestModal sites={sites} onClose={() => { setOpen(false); setParams({}); }} onSaved={() => { setOpen(false); setParams({}); load(); }} />}

      {loading
        ? <div className="text-sm text-ink-500">Loading…</div>
        : reqs.length === 0
          ? <div className="card text-sm text-ink-500">No requests yet. Click <strong>New request</strong> above to send us anything.</div>
          : <div className="space-y-3">{reqs.map((r) => <RequestCard key={r.id} req={r} sites={sites} />)}</div>
      }
    </div>
  );
}

function RequestCard({ req, sites }: { req: Req; sites: Site[] }) {
  const siteName = req.site_id ? sites.find((s) => s.id === req.site_id)?.name : null;
  const status = req.status;
  const statusChip =
    status === 'open'        ? <span className="chip-info">open</span> :
    status === 'triaged'     ? <span className="chip-info">triaged</span> :
    status === 'in_progress' ? <span className="chip-warn">in progress</span> :
    status === 'resolved'    ? <span className="chip-ok"><CheckCircle2 size={10} /> resolved</span> :
    status === 'declined'    ? <span className="chip-crit">declined</span> :
                                <span className="chip-mute">{status}</span>;
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">{req.subject}</h3>
            {statusChip}
            {req.priority === 'urgent' && <span className="chip-crit">urgent</span>}
            {req.priority === 'high'   && <span className="chip-warn">high</span>}
          </div>
          <div className="text-xs text-ink-500 mt-1">{ucfirst(req.category)} · {siteName ?? 'no specific site'} · opened {ago(req.created_at)}</div>
          <p className="text-sm text-ink-700 mt-2 whitespace-pre-wrap">{req.description}</p>
          {req.resolution && (
            <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1">Resolution</div>
              {req.resolution}
              {req.resolved_at && <div className="text-xs text-ink-500 mt-1">resolved {ago(req.resolved_at)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewRequestModal({ sites, onClose, onSaved }: { sites: Site[]; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<string>('additional_coverage');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');
  const [siteId, setSiteId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      await invokeFn<{ id: string }>('portal-service-request', {
        category, subject, description, priority,
        site_id: siteId || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm grid place-items-center z-50 p-4 animate-fade-in">
      <form className="card max-w-lg w-full space-y-4 animate-slide-up" onSubmit={submit}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">New service request</h2>
          <button type="button" onClick={onClose} className="text-ink-500 hover:text-ink-900"><X size={16} /></button>
        </div>

        <label className="block">
          <span className="stat-label">Type</span>
          <select className="input mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="stat-label">Site (optional)</span>
          <select className="input mt-1.5" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">— Any / multiple sites —</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="stat-label">Subject</span>
          <input className="input mt-1.5" placeholder="e.g. Extra coverage Saturday for resident BBQ"
                 value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={4} />
        </label>

        <label className="block">
          <span className="stat-label">Details</span>
          <textarea className="input mt-1.5" rows={5} placeholder="What do you need, by when, and any constraints we should know about."
                    value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} />
        </label>

        <label className="block">
          <span className="stat-label">Priority</span>
          <div className="flex gap-2 mt-1.5">
            {(['low','normal','high','urgent'] as const).map((p) => (
              <button key={p} type="button"
                className={`text-xs px-3 py-1.5 rounded-md border ${priority === p ? 'bg-stigg-50 text-stigg-700 border-stigg-300' : 'border-ink-300 text-ink-700 hover:bg-ink-100'}`}
                onClick={() => setPriority(p)}>{p}</button>
            ))}
          </div>
        </label>

        {error && <div className="text-sm text-red-700 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}
