// Customer-facing reports catalog. Hand-curated to only show what actually
// works for a portal user:
//   - PDF reports the customer can run directly (Monthly Statement, DAR)
//   - Dashboard reports that link to in-app pages they can already see
//
// Internal-only reports (PIPEDA breach, SSIA license status, billing
// reconciliation, etc.) and reports that require an internal record id
// (Single Incident) are intentionally hidden.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart, ExternalLink, Play, Loader2, CheckCircle2, XCircle, Search, Clock, X } from 'lucide-react';
import { listReports } from '@stigg/reports';
import type { ReportDefinition } from '@stigg/reports';
import { invokeFn, supabase } from '../lib/supabase';

const PUBLIC_REPORT_IDS = new Set([
  // Renderable
  'dar',
  'monthly-statement',
  // Dashboard-only — point at portal pages
  'site-daily-summary',
  'patrol-coverage-week',
  'patrol-coverage-month',
  'tour-completion',
  'gps-trail',
  'incident-summary',
  'incident-trends',
  'incident-critical',
  'site-scorecard',
  'contract-kpi',
]);

interface RunRow {
  id: string; report_id: string; status: string; output_url: string | null;
  duration_ms: number | null; created_at: string; error: string | null;
}
interface Site { id: string; name: string }

export function Reports() {
  const all = useMemo(() => listReports().filter((r) => PUBLIC_REPORT_IDS.has(r.id)), []);
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReportDefinition<any> | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  async function loadRuns() {
    const { data } = await supabase.from('report_runs')
      .select('id, report_id, status, output_url, duration_ms, created_at, error')
      .order('created_at', { ascending: false }).limit(30);
    setRuns((data ?? []) as RunRow[]);
  }
  async function loadSites() {
    const { data } = await supabase.from('sites').select('id, name').order('name');
    setSites((data ?? []) as Site[]);
  }
  useEffect(() => { loadRuns(); loadSites(); }, []);

  const filtered = all.filter((r) =>
    !query.trim() || r.name.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase()),
  );

  function clickRun(r: ReportDefinition<any>) {
    if (r.id === 'monthly-statement' || r.id === 'dar') { setPending(r); return; }
    runWithFilters(r, {});
  }

  async function runWithFilters(r: ReportDefinition<any>, filters: Record<string, unknown>) {
    setRunning(r.id); setError(null); setPending(null);
    try {
      // Monthly statement runs through the dedicated edge fn that locks
      // client_id to the caller's profile (defence-in-depth even if RLS
      // would block cross-tenant reads anyway).
      const fn = r.id === 'monthly-statement' ? 'portal-statement' : 'report-render';
      const body = r.id === 'monthly-statement'
        ? { month: filters.month }
        : { report_id: r.id, filters, format: 'html' };
      const res = await invokeFn<{ output_url: string | null }>(fn, body);
      if (res.output_url) window.open(res.output_url, '_blank', 'noopener');
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FileBarChart size={20} className="text-stigg-600" /> Reports</h1>
        <p className="page-subtitle">{all.length} reports — standardized across every site so portfolio rollups, board packages, and audit responses come from one source of truth.</p>
      </div>

      <div className="card-tight relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-8" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2"><XCircle size={14} />{error}</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 hover:border-stigg-300 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-ink-900 text-sm">{r.name}</span>
                {r.renders_to_pdf && <span className="chip-info">PDF</span>}
              </div>
              <p className="text-xs text-ink-500 mt-1 leading-snug">{r.description}</p>
            </div>
            <div className="mt-auto">
              {r.renders_to_pdf
                ? <button className="btn-sm-primary w-full justify-center" disabled={running === r.id} onClick={() => clickRun(r)}>
                    {running === r.id ? <><Loader2 size={11} className="animate-spin" /> Rendering…</> : <><Play size={11} /> Run</>}
                  </button>
                : r.dashboard_path
                  ? <Link className="btn-sm-ghost w-full justify-center" to={portalPathFor(r.dashboard_path)}>
                      <ExternalLink size={11} /> Open dashboard
                    </Link>
                  : null}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-ink-900 flex items-center gap-2"><Clock size={14} className="text-stigg-600" /> Recent runs</h2>
          <button className="text-xs text-ink-500 hover:text-stigg-600" onClick={loadRuns}>Refresh</button>
        </div>
        {runs.length === 0
          ? <p className="text-sm text-ink-500">No runs yet.</p>
          : <table className="w-full text-sm">
              <thead className="text-ink-500 text-left text-xs">
                <tr><th className="py-2">When</th><th>Report</th><th>Status</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-xs text-ink-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="text-ink-700">{r.report_id}</td>
                    <td>
                      {r.status === 'succeeded' && <span className="chip-ok"><CheckCircle2 size={10} /> ready</span>}
                      {r.status === 'running'   && <span className="chip-info"><Loader2 size={10} className="animate-spin" /> running</span>}
                      {r.status === 'failed'    && <span className="chip-crit"><XCircle size={10} /> failed</span>}
                    </td>
                    <td className="text-right">
                      {r.output_url
                        ? <a href={r.output_url} target="_blank" rel="noopener noreferrer" className="text-stigg-600 hover:underline inline-flex items-center gap-1 text-xs">open <ExternalLink size={10} /></a>
                        : <span className="text-ink-400 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {pending && (
        <FilterModal
          report={pending}
          sites={sites}
          onClose={() => setPending(null)}
          onRun={(filters) => runWithFilters(pending, filters)}
          running={running === pending.id}
        />
      )}
    </div>
  );
}

function FilterModal({ report, sites, onClose, onRun, running }: {
  report: ReportDefinition<any>; sites: Site[];
  onClose: () => void; onRun: (filters: Record<string, unknown>) => void; running: boolean;
}) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  const [date, setDate] = useState(todayIso);
  const [pickedMonth, setPickedMonth] = useState(month);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (report.id === 'monthly-statement') onRun({ month: pickedMonth });
    else if (report.id === 'dar')          onRun({ site_id: siteId, date });
    else                                    onRun({});
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white border border-ink-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">{report.name}</h2>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-900"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {report.id === 'monthly-statement' && (
            <label className="block text-xs text-ink-600 font-medium">Month
              <input type="month" value={pickedMonth} onChange={(e) => setPickedMonth(e.target.value)} className="input mt-1" required />
            </label>
          )}
          {report.id === 'dar' && (
            <>
              <label className="block text-xs text-ink-600 font-medium">Site
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input mt-1" required>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block text-xs text-ink-600 font-medium">Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" required />
              </label>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-ink-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={running} className="btn-primary">
            {running ? <><Loader2 size={14} className="animate-spin" /> Rendering…</> : <><Play size={14} /> Run</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function portalPathFor(path: string): string {
  if (path === '/sites')      return '/sites';
  if (path === '/incidents')  return '/incidents';
  if (path === '/patrols')    return '/coverage';
  if (path === '/contracts')  return '/statements';
  if (path === '/ops/map')    return '/coverage';
  if (path === '/clients')    return '/';
  if (path === '/guards')     return '/guards';
  if (path === '/ai')         return '/advisor';
  return '/';
}
