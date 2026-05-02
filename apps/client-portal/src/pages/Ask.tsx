// Plain-English Q&A. The customer types a question; the forensic-search edge
// function (RLS-scoped to their client_id) interprets it, runs the query,
// and returns rows. RLS guarantees they only ever see their own data.

import { useState, type FormEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { invokeFn, supabaseConfigured } from '../lib/supabase';

interface Resp {
  plan: { interpreted_filters: { tables: string[]; time_window: { human: string } } } | null;
  rows: Array<Record<string, unknown> & { table: string }>;
}

const SUGGESTIONS = [
  'Show incidents at my sites in the last 7 days',
  'Are there any open critical incidents?',
  'How many shifts ran last week?',
  'Show camera alerts from last night',
];

export function Ask() {
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
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-blue-600" /> Ask in plain English</h1>
        <p className="text-slate-500 mt-1">
          Ask anything about your coverage. Results are scoped to your sites only.
        </p>
      </header>

      <form onSubmit={go} className="card flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-9" placeholder="e.g. show incidents at the warehouse last week" value={q} onChange={(e) => setQ(e.target.value)} required />
        </div>
        <button className="btn-primary" disabled={busy || !supabaseConfigured}>{busy ? 'Searching…' : 'Ask'}</button>
      </form>

      <div className="flex flex-wrap gap-2 text-xs">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => setQ(s)} className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-100">
            {s}
          </button>
        ))}
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}

      {resp?.plan && (
        <div className="card">
          <p className="text-xs text-slate-500">Interpreted as:</p>
          <p className="text-sm">{resp.plan.interpreted_filters.tables.join(', ')} · {resp.plan.interpreted_filters.time_window.human}</p>
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
                <div key={i} className="text-sm border-b border-slate-100 last:border-0 pb-2">
                  <div className="text-xs text-slate-500">{r.table}</div>
                  <pre className="text-xs whitespace-pre-wrap bg-slate-50 p-2 rounded">{JSON.stringify(r, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
