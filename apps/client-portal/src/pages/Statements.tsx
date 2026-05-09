// Statements — generate the monthly invoice + activity packet on demand.
// Lists prior runs so the customer can pull any month back at will.

import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, ExternalLink, Calendar, Download, CheckCircle2, XCircle } from 'lucide-react';
import { supabase, invokeFn } from '../lib/supabase';

interface Run { id: string; output_url: string | null; status: string; created_at: string; filters: any; duration_ms: number | null; error: string | null }

export function Statements() {
  const months = useMemo(() => last12Months(), []);
  const [month, setMonth] = useState(months[0]!);
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    const { data, error } = await supabase
      .from('report_runs')
      .select('id, output_url, status, created_at, filters, duration_ms, error')
      .eq('report_id', 'monthly-statement')
      .order('created_at', { ascending: false })
      .limit(24);
    if (!error) setRuns((data ?? []) as Run[]);
  }

  useEffect(() => { loadRuns(); }, []);

  async function generate() {
    setRunning(true); setError(null);
    try {
      const res = await invokeFn<{ output_url: string | null }>('portal-statement', { month });
      if (res.output_url) window.open(res.output_url, '_blank', 'noopener');
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FileText size={20} className="text-stigg-600" /> Statements</h1>
        <p className="page-subtitle">Standardized monthly reporting: invoice, KPIs, and activity summary in a single PDF — the same format across every site in your portfolio.</p>
      </div>

      <div className="card flex items-end gap-3 flex-wrap">
        <div>
          <label className="stat-label flex items-center gap-1.5"><Calendar size={11} /> Period</label>
          <select className="input mt-1.5 min-w-[180px]" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{prettyMonth(m)}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={generate} disabled={running}>
          {running ? <><Loader2 size={14} className="animate-spin" /> Rendering…</> : <><Download size={14} /> Generate statement</>}
        </button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2"><XCircle size={14} />{error}</div>}

      <div className="card">
        <h2 className="font-semibold mb-3">Previously generated</h2>
        {runs.length === 0
          ? <p className="text-sm text-ink-500">No statements yet — generate one above.</p>
          : <table className="w-full text-sm">
              <thead className="text-ink-500 text-left text-xs">
                <tr><th className="py-2">Period</th><th>Generated</th><th>Status</th><th>Duration</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium">{prettyMonth(r.filters?.month ?? '')}</td>
                    <td className="text-ink-500 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td>
                      {r.status === 'succeeded' && <span className="chip-ok"><CheckCircle2 size={10} /> ready</span>}
                      {r.status === 'running'   && <span className="chip-info"><Loader2 size={10} className="animate-spin" /> running</span>}
                      {r.status === 'failed'    && <span className="chip-crit" title={r.error ?? ''}><XCircle size={10} /> failed</span>}
                    </td>
                    <td className="text-xs text-ink-500 tabular-nums">{r.duration_ms != null ? `${r.duration_ms} ms` : '—'}</td>
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
    </div>
  );
}

function last12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
function prettyMonth(s: string): string {
  if (!/^\d{4}-\d{2}$/.test(s)) return s;
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}
