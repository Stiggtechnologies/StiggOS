// Live ops dashboard. Subscribes to Supabase Realtime channels for shifts +
// incidents so the floor manager sees activity within ~1s of the event,
// not on the next page reload.

import { useEffect, useMemo, useState } from 'react';
import { Users, Clock, AlertTriangle, Building2, Brain, Zap } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Guard, Incident, Shift, Client, AIInsight } from '@stigg/shared';

interface Counts { guards: number; shifts: number; incidents: number; clients: number }

export function CommandCenter() {
  const [counts, setCounts] = useState<Counts>({ guards: 0, shifts: 0, incidents: 0, clients: 0 });
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [topInsights, setTopInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) {
      setError('Supabase is not configured. The Command Center has nothing to display.');
      setLoading(false);
      return;
    }
    try {
      const [{ count: gc }, { count: sc }, { count: ic }, { count: cc }, shifts, incidents, insights] = await Promise.all([
        supabase.from('guards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shifts').select('*').order('updated_at', { ascending: false }).limit(8),
        supabase.from('incidents').select('*').order('occurred_at', { ascending: false }).limit(6),
        supabase.from('ai_insights').select('*').is('dismissed_at', null).order('created_at', { ascending: false }).limit(5),
      ]);
      setCounts({ guards: gc ?? 0, shifts: sc ?? 0, incidents: ic ?? 0, clients: cc ?? 0 });
      setRecentShifts((shifts.data ?? []) as Shift[]);
      setRecentIncidents((incidents.data ?? []) as Incident[]);
      setTopInsights((insights.data ?? []) as AIInsight[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Live subscriptions: any change to shifts/incidents triggers a refresh.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase
      .channel('command-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_insights' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => [
    { label: 'Active Guards',    value: counts.guards,    icon: Users,          color: 'text-blue-400' },
    { label: 'Active Shifts',    value: counts.shifts,    icon: Clock,          color: 'text-amber-400' },
    { label: 'Open Incidents',   value: counts.incidents, icon: AlertTriangle,  color: 'text-red-400' },
    { label: 'Active Clients',   value: counts.clients,   icon: Building2,      color: 'text-emerald-400' },
  ], [counts]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-slate-400 mt-1">Live operations across all service lines.</p>
        </div>
        {loading && <span className="text-xs text-slate-500">refreshing…</span>}
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-200">
          <p className="font-medium">Cannot load live data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">{s.label}</div>
              <div className="text-3xl font-semibold mt-1">{s.value}</div>
            </div>
            <s.icon className={s.color} size={28} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Zap size={16} className="text-blue-400" /> Live activity</h2>
          {recentShifts.length === 0 && recentIncidents.length === 0 && (
            <p className="text-sm text-slate-500">No recent activity. New shifts and incidents will appear here as they happen.</p>
          )}
          {recentIncidents.map((i) => (
            <div key={i.id} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                i.severity === 'critical' ? 'badge-critical' :
                i.severity === 'high'     ? 'badge-high'     :
                i.severity === 'medium'   ? 'badge-medium'   : 'badge-low'
              }`}>{i.severity}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{i.title}</div>
                <div className="text-xs text-slate-500">{new Date(i.occurred_at).toLocaleString()}</div>
              </div>
              <span className="text-xs text-slate-500">{i.status}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Brain size={16} className="text-blue-400" /> Top AI insights</h2>
          {topInsights.length === 0 && (
            <p className="text-sm text-slate-500">
              No insights yet. The Compliance Co-pilot scan generates these — run it from Compliance → Scan now.
            </p>
          )}
          {topInsights.map((insight) => (
            <div key={insight.id} className="py-2 border-b border-slate-800 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  insight.severity === 'critical' ? 'badge-critical' :
                  insight.severity === 'high'     ? 'badge-high'     :
                  insight.severity === 'medium'   ? 'badge-medium'   : 'badge-low'
                }`}>{insight.severity}</span>
                <div className="text-xs text-slate-500">{insight.surface}</div>
              </div>
              <div className="text-sm mt-1">{insight.title}</div>
              {insight.recommended_action && (
                <div className="text-xs text-slate-500 mt-1">→ {insight.recommended_action}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
