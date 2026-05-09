// Dashboard — what the property manager sees on login. Driven by
// client_kpi_snapshot() + client_activity_feed() so a single roundtrip
// answers "is anything wrong?" and "what happened lately?".

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, UserCheck, AlertTriangle, ScanLine, TrendingUp, Clock,
  Wrench, Sparkles, FileText, MapPin, ArrowRight, Activity as ActivityIcon,
} from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { CAD, NUM, ago } from '../lib/format';
import { WelcomeBanner } from '../components/WelcomeBanner';

interface Kpi {
  sites_count: number;
  active_shifts: number;
  guards_on_duty: number;
  open_incidents: number;
  critical_incidents_24h: number;
  scans_24h: number;
  patrol_completion_30d: number | null;
  hours_delivered_30d: number;
  open_service_requests: number;
  ar_balance_cad: number;
}
interface FeedItem {
  occurred_at: string;
  kind: string;
  site_name: string | null;
  severity: string | null;
  title: string | null;
  detail: string | null;
}

export function Dashboard() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal is not configured.'); setLoading(false); return; }
    (async () => {
      const [k, f] = await Promise.all([
        supabase.rpc('client_kpi_snapshot'),
        supabase.rpc('client_activity_feed', { limit_n: 8 }),
      ]);
      if (k.error) setError(k.error.message);
      else setKpi((k.data ?? [])[0] ?? null);
      setFeed((f.data ?? []) as FeedItem[]);
      setLoading(false);
    })();

    const ch = supabase.channel('portal-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, async () => {
        const k = await supabase.rpc('client_kpi_snapshot');
        if (!k.error) setKpi((k.data ?? [])[0] ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">A real-time view of the assets, residents, and operating conditions we protect for you.</p>
      </div>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading && <div className="text-sm text-ink-500">Loading…</div>}

      {kpi && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <Stat icon={Building2}    label="Sites under coverage" value={NUM(kpi.sites_count)} />
            <Stat icon={UserCheck}    label="Guards on duty"       value={NUM(kpi.guards_on_duty)} accent={kpi.guards_on_duty > 0 ? 'ok' : undefined} />
            <Stat icon={AlertTriangle} label="Open incidents"      value={NUM(kpi.open_incidents)} accent={kpi.critical_incidents_24h > 0 ? 'crit' : kpi.open_incidents > 0 ? 'warn' : undefined} />
            <Stat icon={ScanLine}     label="Patrol scans / 24h"   value={NUM(kpi.scans_24h)} />
            <Stat icon={TrendingUp}   label="Patrol completion 30d" value={kpi.patrol_completion_30d == null ? '—' : `${kpi.patrol_completion_30d}%`} accent={kpi.patrol_completion_30d != null && kpi.patrol_completion_30d < 90 ? 'warn' : 'ok'} />
            <Stat icon={Clock}        label="Hours delivered 30d"  value={NUM(Math.round(kpi.hours_delivered_30d))} />
            <Stat icon={Wrench}       label="Open requests"        value={NUM(kpi.open_service_requests)} />
            <Stat icon={FileText}     label="AR balance"           value={CAD(kpi.ar_balance_cad)} />
          </div>

          {kpi.critical_incidents_24h > 0 && (
            <div className="card border-red-300 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                <div className="flex-1">
                  <div className="font-semibold text-red-800">{kpi.critical_incidents_24h} critical incident{kpi.critical_incidents_24h > 1 ? 's' : ''} in the last 24 hours</div>
                  <p className="text-sm text-red-700 mt-1">Open the Incidents page for full details and supervisor follow-up.</p>
                </div>
                <Link to="/incidents" className="btn-sm-primary">Review</Link>
              </div>
            </div>
          )}
        </>
      )}

      <WelcomeBanner />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><ActivityIcon size={16} className="text-stigg-600" /> Recent activity</h2>
            <Link to="/activity" className="text-xs text-stigg-600 hover:underline inline-flex items-center gap-1">view all <ArrowRight size={11} /></Link>
          </div>
          {feed.length === 0
            ? <p className="text-sm text-ink-500">Nothing yet — activity will show here as our guards work on your sites.</p>
            : <ul className="divide-y divide-ink-100 -my-2">
                {feed.map((f, i) => <FeedRow key={i} item={f} />)}
              </ul>}
        </div>

        <QuickActions />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: 'ok' | 'warn' | 'crit' | undefined }) {
  const ring = accent === 'crit' ? 'border-red-500/30 bg-red-500/10' :
               accent === 'warn' ? 'border-amber-500/30 bg-amber-500/10' :
               accent === 'ok'   ? 'border-emerald-500/30 bg-emerald-500/10' :
                                   'border-slate-800 bg-slate-900/60';
  const iconColor = accent === 'crit' ? 'text-red-600' : accent === 'warn' ? 'text-amber-600' : accent === 'ok' ? 'text-emerald-600' : 'text-ink-400';
  return (
    <div className={`rounded-xl border ${ring} px-4 py-3 shadow-glass-light flex items-start justify-between gap-2`}>
      <div className="min-w-0">
        <div className="stat-label truncate">{label}</div>
        <div className="stat-value mt-1 truncate">{value}</div>
      </div>
      <Icon className={`${iconColor} shrink-0`} size={18} />
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const [Icon, color] =
    item.kind === 'incident'        ? [AlertTriangle, item.severity === 'critical' ? 'text-red-600' : item.severity === 'high' ? 'text-orange-600' : 'text-amber-600'] :
    item.kind === 'shift_started'   ? [UserCheck, 'text-blue-600'] :
    item.kind === 'shift_completed' ? [UserCheck, 'text-emerald-600'] :
    item.kind === 'service_request' ? [Wrench, 'text-stigg-600'] :
                                       [Clock, 'text-ink-400'];
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-800 truncate">{item.title ?? item.kind.replace('_', ' ')}</div>
        <div className="text-[11px] text-ink-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><MapPin size={10} />{item.site_name ?? '—'}</span>
          <span>·</span>
          <span>{ago(item.occurred_at)}</span>
        </div>
      </div>
    </li>
  );
}

function QuickActions() {
  return (
    <div className="space-y-3">
      <Link to="/advisor" className="block card hover:border-stigg-300 hover:shadow-md transition-all group">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white"><Sparkles size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900">Risk advisor</div>
            <div className="text-xs text-ink-500 mt-0.5">AI read-out of your 90-day picture, on demand.</div>
          </div>
          <ArrowRight size={14} className="text-ink-400 group-hover:text-stigg-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
      <Link to="/requests?new=1" className="block card hover:border-stigg-300 hover:shadow-md transition-all group">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 grid place-items-center text-blue-700"><Wrench size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900">Request additional coverage</div>
            <div className="text-xs text-ink-500 mt-0.5">Extra patrol, change of scope, ad-hoc service.</div>
          </div>
          <ArrowRight size={14} className="text-ink-400 group-hover:text-stigg-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
      <Link to="/statements" className="block card hover:border-stigg-300 hover:shadow-md transition-all group">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 grid place-items-center text-emerald-700"><FileText size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900">This month's statement</div>
            <div className="text-xs text-ink-500 mt-0.5">One-click invoice + activity packet PDF.</div>
          </div>
          <ArrowRight size={14} className="text-ink-400 group-hover:text-stigg-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
    </div>
  );
}
