import { useState, type FormEvent } from 'react';
import { Calendar, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { invokeFn, supabaseConfigured } from '../lib/supabase';

interface ScheduleResp {
  week_of: string;
  accepted: Array<{ guard_id: string; site_id: string; scheduled_start: string; scheduled_end: string; rationale: string }>;
  rejected: Array<{ reason: string } & Record<string, unknown>>;
  iterations: number;
}

export function Scheduling() {
  const todayMonday = (() => {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff + 7);
    return d.toISOString().slice(0, 10);
  })();
  const [weekOf, setWeekOf] = useState(todayMonday);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScheduleResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await invokeFn<ScheduleResp>('schedule-agent', { week_of: weekOf });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Calendar /> Scheduling</h1>
        <p className="text-slate-400 mt-1">
          AI generates next-week proposals respecting hard constraints (license validity, rest, no overlap)
          and optimizing OT cost. Code re-validates every proposal before insert — model is hint, code is law.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="text-slate-400">Week of</span>
          <input className="input mt-1" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} required />
        </label>
        <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={busy || !supabaseConfigured}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Sparkles size={16} /> Generate proposals</>}
        </button>
      </form>

      {error && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-200">
          <p className="font-medium">Schedule generation failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-3">Accepted ({result.accepted.length})</h2>
            {result.accepted.length === 0 ? (
              <p className="text-sm text-slate-500">No proposals accepted. Either no demand for this week or all proposals failed validation — see Rejected.</p>
            ) : (
              <div className="space-y-3">
                {result.accepted.map((p, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">
                      {new Date(p.scheduled_start).toLocaleString()} → {new Date(p.scheduled_end).toLocaleTimeString()}
                    </div>
                    <div className="text-slate-400">guard <code>{p.guard_id.slice(0, 6)}</code> · site <code>{p.site_id.slice(0, 6)}</code></div>
                    <div className="text-xs text-blue-300 mt-1">{p.rationale}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400" /> Rejected ({result.rejected.length})
            </h2>
            {result.rejected.length === 0 ? (
              <p className="text-sm text-slate-500">None — all proposals passed.</p>
            ) : (
              <div className="space-y-3">
                {result.rejected.map((p, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{String(p.guard_id ?? 'unknown')} → {String(p.site_id ?? 'unknown')}</div>
                    <div className="text-xs text-amber-300 mt-1">⚠ {String(p.reason)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
