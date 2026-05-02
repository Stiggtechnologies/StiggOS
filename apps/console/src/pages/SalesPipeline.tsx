import { useEffect, useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured, invokeFn } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import type { Lead } from '@stigg/shared';
import { Plus, Sparkles } from 'lucide-react';

const STAGES: Lead['stage'][] = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];

export function SalesPipeline() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Lead> | null>(null);
  const [saving, setSaving] = useState(false);
  const [assessFor, setAssessFor] = useState<Lead | null>(null);
  const [assessing, setAssessing] = useState(false);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    setRows((data ?? []) as Lead[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const payload: any = {
      source: edit.source ?? null, name: edit.name ?? null, company: edit.company ?? null,
      email: edit.email ?? null, phone: edit.phone ?? null, city: edit.city ?? null,
      industry: edit.industry ?? null,
      service_lines_interest: edit.service_lines_interest ?? [],
      stage: edit.stage ?? 'new', priority: edit.priority ?? 'medium',
      ai_score: edit.ai_score ?? null, ai_summary: edit.ai_summary ?? null,
    };
    const res = edit.id ? await supabase.from('leads').update(payload).eq('id', edit.id)
                       : await supabase.from('leads').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setEdit(null); await load();
  }

  async function moveStage(lead: Lead, stage: Lead['stage']) {
    await supabase.from('leads').update({ stage }).eq('id', lead.id);
    await load();
  }

  async function runAssessment(lead: Lead) {
    setAssessing(true);
    try {
      await invokeFn('sales-assessment', {
        lead_id: lead.id,
        inputs: {
          company: lead.company, industry: lead.industry, city: lead.city,
          service_lines_interest: lead.service_lines_interest,
          notes: lead.ai_summary ?? '',
        },
      });
      setAssessFor(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setAssessing(false); }
  }

  return (
    <>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Sales pipeline</h1>
          <p className="text-slate-400 mt-1">Lead → quote → contract. AI scores each lead and proposes a service mix on request.</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-1" onClick={() => setEdit({ stage: 'new', priority: 'medium' })}>
          <Plus size={14} /> Add lead
        </button>
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/10 text-red-200 text-sm mb-3">{error}</div>}

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const stageRows = rows.filter((r) => r.stage === stage);
          return (
            <section key={stage} className="card !p-3 min-h-[60vh]">
              <header className="text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>{stage}</span>
                <span className="text-slate-500">{stageRows.length}</span>
              </header>
              <div className="space-y-2">
                {loading && <p className="text-xs text-slate-500">Loading…</p>}
                {!loading && stageRows.length === 0 && <p className="text-xs text-slate-500">—</p>}
                {stageRows.map((r) => (
                  <article key={r.id} className="rounded border border-slate-800 bg-slate-900 p-3 hover:border-blue-500/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium">{r.company ?? r.name ?? 'Anon'}</div>
                      {r.ai_score != null && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          r.ai_score >= 75 ? 'bg-emerald-500/15 text-emerald-300' :
                          r.ai_score >= 50 ? 'bg-amber-500/15 text-amber-300' :
                          'bg-slate-500/15 text-slate-300'
                        }`}>{Math.round(r.ai_score)}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{r.city ?? '—'} · {r.industry ?? '—'}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.ai_summary ?? r.email ?? '—'}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {STAGES.filter((s) => s !== stage).slice(0, 2).map((s) => (
                        <button key={s} onClick={() => moveStage(r, s)} className="text-[10px] px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-800">→ {s}</button>
                      ))}
                      <button onClick={() => setAssessFor(r)} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                        <Sparkles size={10} /> Assess
                      </button>
                      <button onClick={() => setEdit(r)} className="text-[10px] text-slate-400 hover:text-slate-200 ml-auto">edit</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit lead' : 'New lead'}
        footer={<>
          <button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" form="lead-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        {edit && (
          <form id="lead-form" onSubmit={save} className="grid grid-cols-2 gap-3">
            <label className="text-sm">Company<input className="input mt-1" value={edit.company ?? ''} onChange={(e) => setEdit({ ...edit, company: e.target.value })} /></label>
            <label className="text-sm">Contact name<input className="input mt-1" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label className="text-sm">Email<input className="input mt-1" type="email" value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
            <label className="text-sm">Phone<input className="input mt-1" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
            <label className="text-sm">City<input className="input mt-1" value={edit.city ?? ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></label>
            <label className="text-sm">Industry<input className="input mt-1" value={edit.industry ?? ''} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} /></label>
            <label className="text-sm">Stage
              <select className="input mt-1" value={edit.stage ?? 'new'} onChange={(e) => setEdit({ ...edit, stage: e.target.value as Lead['stage'] })}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}<option>dormant</option>
              </select>
            </label>
            <label className="text-sm">Priority
              <select className="input mt-1" value={edit.priority ?? 'medium'} onChange={(e) => setEdit({ ...edit, priority: e.target.value as Lead['priority'] })}>
                <option>low</option><option>medium</option><option>high</option><option>hot</option>
              </select>
            </label>
            <label className="text-sm col-span-2">Notes / AI summary
              <textarea className="input mt-1" rows={3} value={edit.ai_summary ?? ''} onChange={(e) => setEdit({ ...edit, ai_summary: e.target.value })} />
            </label>
          </form>
        )}
      </Modal>

      <Modal open={!!assessFor} onClose={() => setAssessFor(null)} title="Run AI security assessment" width="md"
        footer={<>
          <button className="btn-ghost" onClick={() => setAssessFor(null)}>Cancel</button>
          <button className="btn-primary inline-flex items-center gap-1" disabled={assessing} onClick={() => assessFor && runAssessment(assessFor)}>
            <Sparkles size={14} /> {assessing ? 'Running…' : 'Generate'}
          </button>
        </>}
      >
        {assessFor && (
          <div className="text-sm text-slate-300 space-y-2">
            <p>Generates a structured service mix + monthly estimate for <strong>{assessFor.company ?? assessFor.name}</strong>.</p>
            <p className="text-xs text-slate-500">Persisted to <code>security_assessments</code>; PDF link follows when wired.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
