import { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { supabase, supabaseConfigured, invokeFn } from '../lib/supabase';
import type { AIInsight, Guard } from '@stigg/shared';

export function Compliance() {
  const [guards, setGuards] = useState<Array<Guard & { _expiringIn: number | null }>>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const [{ data: g }, { data: i }] = await Promise.all([
      supabase.from('guards').select('*').eq('status', 'active'),
      supabase.from('ai_insights').select('*').eq('surface', 'compliance').is('dismissed_at', null).order('severity', { ascending: false }),
    ]);
    const today = Date.now();
    const enriched = (g ?? []).map((row: any) => ({
      ...row,
      _expiringIn: row.ssia_license_expiry
        ? Math.ceil((Date.parse(row.ssia_license_expiry) - today) / 86_400_000)
        : null,
    }));
    setGuards(enriched);
    setInsights((i ?? []) as AIInsight[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function runScan() {
    setScanning(true); setError(null);
    try { await invokeFn('compliance-watcher', {}); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setScanning(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Shield /> Compliance</h1>
          <p className="text-slate-400 mt-1">
            Alberta SSIA · OHS · WCB · PIPEDA — deterministic rules + AI triage with citations.
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2" onClick={runScan} disabled={scanning || !supabaseConfigured}>
          {scanning ? <><Loader2 size={16} className="animate-spin" /> Scanning…</> : 'Run scan'}
        </button>
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Active SSIA licenses</h2>
          {loading ? <p className="text-sm text-slate-500">Loading…</p> :
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr><th className="py-2">Guard</th><th>License</th><th>Expires</th></tr>
              </thead>
              <tbody>
                {guards.map((g) => (
                  <tr key={g.id} className="border-t border-slate-800">
                    <td className="py-2">{g.first_name} {g.last_name}</td>
                    <td>{g.ssia_license_number ?? '—'}</td>
                    <td className={
                      g._expiringIn == null ? 'text-slate-500' :
                      g._expiringIn < 0     ? 'text-red-400 font-medium' :
                      g._expiringIn <= 30   ? 'text-amber-400'           : 'text-slate-300'
                    }>
                      {g.ssia_license_expiry ?? '—'}
                      {g._expiringIn != null && g._expiringIn >= 0 && (
                        <span className="text-xs text-slate-500 ml-1">({g._expiringIn}d)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Compliance insights</h2>
          {insights.length === 0 ? (
            <p className="text-sm text-slate-500">No active insights. Run a scan to refresh.</p>
          ) : (
            <div className="space-y-3">
              {insights.map((i) => (
                <div key={i.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      i.severity === 'critical' ? 'badge-critical' :
                      i.severity === 'high'     ? 'badge-high'     :
                      i.severity === 'medium'   ? 'badge-medium'   : 'badge-low'
                    }`}>{i.severity}</span>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{i.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
