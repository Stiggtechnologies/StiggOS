// Contract operating dashboard — the monthly-review page.
//
// Reads from contract_kpi_snapshots (history) + live shifts/incidents (current).
// "Refresh KPI snapshot" calls the contract-kpi-snapshot edge fn so the
// numbers Dawn Collier sees are the same numbers in the management review.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Shield, AlertTriangle, CheckCircle2, MapPin, RefreshCw, FileText } from 'lucide-react';
import { supabase, supabaseConfigured, invokeFn } from '../lib/supabase';
import { fmtCAD, fmtDate, fmtDateTime } from '../lib/format';

interface Contract {
  id: string; client_id: string; contract_number: string | null;
  service_lines: string[]; start_date: string; end_date: string | null;
  monthly_value_cad: number | null;
  status: string;
  pricing_schedule: any;
  kpi_targets: any;
}
interface Snapshot {
  id: string; period_start: string; period_end: string;
  patrol_delivery: any; asset_protection: any;
  incident_response: any; hotspot_trends: any;
  maintenance_impact: any; summary_md: string | null;
}
interface SiteRow { id: string; name: string; suites: number | null }

function thisMonthYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
}

export function ContractDashboard() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(thisMonthYYYYMM());

  async function load() {
    if (!supabaseConfigured || !id) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [{ data: c }, { data: links }, { data: snaps }] = await Promise.all([
      supabase.from('contracts').select('id, client_id, contract_number, service_lines, start_date, end_date, monthly_value_cad, status, pricing_schedule, kpi_targets').eq('id', id).single(),
      supabase.from('contract_sites').select('site_id, is_optional').eq('contract_id', id).is('removed_at', null),
      supabase.from('contract_kpi_snapshots').select('*').eq('contract_id', id).order('period_start', { ascending: false }).limit(12),
    ]);
    setContract(c as Contract);
    if (c) {
      const { data: cl } = await supabase.from('clients').select('id, name').eq('id', (c as Contract).client_id).single();
      setClient(cl as any);
    }
    const siteIds = (links ?? []).map((l: any) => l.site_id);
    if (siteIds.length > 0) {
      const { data: ss } = await supabase.from('sites').select('id, name, metadata').in('id', siteIds);
      setSites(((ss ?? []) as any[]).map((s) => ({ id: s.id, name: s.name, suites: s.metadata?.suites ?? null })));
    }
    setSnapshots((snaps ?? []) as Snapshot[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function refreshSnapshot() {
    if (!id) return;
    setRefreshing(true); setError(null);
    try {
      await invokeFn('contract-kpi-snapshot', { contract_id: id, month });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setRefreshing(false); }
  }

  const current = snapshots.find((s) => s.period_start.startsWith(month));
  const seasonalSlot = useMemo(() => {
    if (!contract?.pricing_schedule?.schedule) return null;
    const m = parseInt(month.split('-')[1] ?? '0', 10);
    return contract.pricing_schedule.schedule.find((s: any) => s.months.includes(m)) ?? null;
  }, [contract, month]);

  if (loading) return <div className="text-slate-500 text-sm">Loading…</div>;
  if (!contract) return <div className="text-slate-500 text-sm">Contract not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Link to="/contracts" className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"><ArrowLeft size={12} /> Contracts</Link>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2">
            {contract.contract_number ?? contract.id.slice(0, 8)}
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              contract.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-500/15 text-slate-300'
            }`}>{contract.status}</span>
          </h1>
          <p className="text-slate-400 mt-1">{client?.name ?? '—'} · {contract.service_lines.join(' · ')} · started {fmtDate(contract.start_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input max-w-[10rem]" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="btn-primary inline-flex items-center gap-1" onClick={refreshSnapshot} disabled={refreshing}>
            {refreshing ? <><Loader2 size={14} className="animate-spin" /> Computing…</> : <><RefreshCw size={14} /> Refresh KPI snapshot</>}
          </button>
        </div>
      </div>

      {error && <div className="card border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}

      {/* Pricing for this month */}
      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Shield size={16} className="text-blue-400" /> Pricing — {month}</h2>
        {seasonalSlot ? (
          <div>
            <div className="text-2xl font-semibold">{fmtCAD(seasonalSlot.monthly_cad)}<span className="text-sm text-slate-500"> / mo · {seasonalSlot.label}</span></div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {(seasonalSlot.components ?? []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between border border-slate-800 rounded px-3 py-2">
                  <span className="text-slate-300">{c.label}</span>
                  <span className="font-medium">{fmtCAD(c.monthly_cad)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">+ GST 5% · billed monthly in arrears.</p>
          </div>
        ) : (
          <div className="text-sm">
            <div className="text-2xl font-semibold">{fmtCAD(contract.monthly_value_cad)}<span className="text-sm text-slate-500"> / mo · flat</span></div>
            <p className="text-xs text-slate-500 mt-1">+ GST 5% · billed monthly in arrears.</p>
          </div>
        )}
      </section>

      {/* Sites */}
      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin size={16} className="text-blue-400" /> Sites under this contract ({sites.length})</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {sites.map((s) => (
            <div key={s.id} className="border border-slate-800 rounded px-3 py-2">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-500">{s.suites ? `${s.suites} suites` : '—'}</div>
            </div>
          ))}
        </div>
      </section>

      {/* KPI buckets */}
      {!current ? (
        <div className="card text-center text-slate-500 text-sm">
          <p>No KPI snapshot for {month} yet.</p>
          <p className="mt-1">Click <strong>Refresh KPI snapshot</strong> to compute one from live data.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Bucket
            title="Patrol delivery"
            icon={<CheckCircle2 size={16} className="text-emerald-400" />}
            value={current.patrol_delivery.completion_pct == null ? '—' : `${current.patrol_delivery.completion_pct}%`}
            valueClass={current.patrol_delivery.completion_pct >= 100 ? 'text-emerald-300' : current.patrol_delivery.completion_pct >= 95 ? 'text-amber-300' : 'text-red-300'}
            sub={`${current.patrol_delivery.completed} of ${current.patrol_delivery.scheduled} completed · ${current.patrol_delivery.no_shows ?? 0} no-shows`}
          />
          <Bucket
            title="Asset protection"
            icon={<AlertTriangle size={16} className="text-amber-400" />}
            value={String(current.asset_protection.total ?? 0)}
            sub={`damage-related incidents · ${Object.entries(current.asset_protection.by_category ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}`}
          />
          <Bucket
            title="Incident response"
            icon={<AlertTriangle size={16} className="text-blue-400" />}
            value={current.incident_response.median_resolution_minutes != null ? `${current.incident_response.median_resolution_minutes} min` : '—'}
            sub={`${current.incident_response.resolved} of ${current.incident_response.total} resolved · ${current.incident_response.pct_resolved ?? 0}%`}
          />
          <Bucket
            title="Hotspot trends"
            icon={<MapPin size={16} className="text-blue-400" />}
            value={Object.entries(current.hotspot_trends.by_site ?? {}).length ? `${Object.entries(current.hotspot_trends.by_site).length} site(s)` : '—'}
            sub={Object.entries(current.hotspot_trends.by_band ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
          />
        </div>
      )}

      {/* Narrative summary */}
      {current?.summary_md && (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> Monthly review summary</h2>
          <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">{current.summary_md}</pre>
        </section>
      )}

      {/* Snapshot history */}
      {snapshots.length > 0 && (
        <section className="card">
          <h2 className="font-semibold mb-3">History</h2>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr><th className="py-1">Period</th><th>Completion</th><th>Incidents</th><th>Median resolution</th></tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="py-2">{s.period_start} → {s.period_end}</td>
                  <td className={s.patrol_delivery.completion_pct >= 100 ? 'text-emerald-300' : 'text-amber-300'}>
                    {s.patrol_delivery.completion_pct ?? '—'}%
                  </td>
                  <td>{s.incident_response.total ?? 0}</td>
                  <td>{s.incident_response.median_resolution_minutes ?? '—'} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Bucket({ title, icon, value, valueClass, sub }: { title: string; icon: React.ReactNode; value: string; valueClass?: string; sub: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider">
        {icon} <span>{title}</span>
      </div>
      <div className={`text-3xl font-semibold mt-2 ${valueClass ?? ''}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
