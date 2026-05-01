import { useState, type FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { invokeFn, supabaseConfigured } from '../lib/supabase';

interface Resp {
  plan: { interpreted_filters: { tables: string[]; time_window: { human: string; from_iso?: string; to_iso?: string } } } | null;
  rows: Array<Record<string, unknown> & { table: string }>;
}

export function ForensicSearch() {
  const [q, setQ] = useState('');
  const [resp, setResp] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResp(null);
    try { setResp(await invokeFn<Resp>('forensic-search', { query: q })); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Search /> Forensic Search</h1>
        <p className="text-slate-400 mt-1">
          Ask in plain English. The model picks tables, time windows, and filters; the result rows come from your live database under RLS.
        </p>
      </div>
      <form className="card flex gap-3" onSubmit={go}>
        <input
          className="input flex-1"
          placeholder='e.g. "incidents involving sedans at retail sites in the last 30 days"'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          required
        />
        <button className="btn-primary inline-flex items-center gap-2" disabled={busy || !supabaseConfigured}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Searching…</> : 'Search'}
        </button>
      </form>

      {error && <div className="card border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}

      {resp && resp.plan && (
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Interpreted filters</div>
          <div className="text-sm">
            tables: {resp.plan.interpreted_filters.tables.join(', ')} · window: {resp.plan.interpreted_filters.time_window.human}
          </div>
        </div>
      )}

      {resp && (
        <div className="card">
          <h2 className="font-semibold mb-3">Results · {resp.rows.length}</h2>
          {resp.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No matches.</p>
          ) : (
            <div className="space-y-2">
              {resp.rows.map((r, i) => (
                <div key={i} className="text-sm border-b border-slate-800 last:border-0 pb-2">
                  <div className="text-xs text-slate-500">{r.table}</div>
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
