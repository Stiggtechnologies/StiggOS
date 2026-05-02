import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface TourRun {
  id: string; org_id: string; shift_id: string; route_id: string;
  started_at: string; completed_at: string | null;
  status: 'in_progress' | 'completed' | 'aborted' | 'partial';
  scan_count?: number;
}

interface RouteRow {
  id: string; name: string; expected_duration_min: number | null; site_id: string;
}

export function Patrols() {
  const [runs, setRuns] = useState<TourRun[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [{ data: r }, { data: rt }, { data: scans }] = await Promise.all([
      supabase.from('tour_runs').select('*').order('started_at', { ascending: false }).limit(100),
      supabase.from('tour_routes').select('id, name, expected_duration_min, site_id'),
      supabase.from('tour_scans').select('run_id'),
    ]);
    const counts = new Map<string, number>();
    for (const s of (scans ?? [])) counts.set((s as any).run_id, (counts.get((s as any).run_id) ?? 0) + 1);
    setRuns((r ?? []).map((row: any) => ({ ...row, scan_count: counts.get(row.id) ?? 0 })));
    setRoutes((rt ?? []) as RouteRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Realtime so the dashboard moves as scans happen.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('patrols')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_runs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_scans' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const routeName = (id: string) => routes.find((r) => r.id === id)?.name ?? id.slice(0, 6);

  const columns: Column<TourRun>[] = [
    { key: 'route', label: 'Route', searchable: (r) => routeName(r.route_id), render: (r) => <span className="font-medium">{routeName(r.route_id)}</span> },
    { key: 'started', label: 'Started', render: (r) => <span className="text-xs text-slate-400">{fmtDateTime(r.started_at)}</span> },
    { key: 'completed', label: 'Completed', render: (r) => r.completed_at ? <span className="text-xs text-slate-400">{fmtDateTime(r.completed_at)}</span> : <span className="text-xs text-slate-500">—</span> },
    { key: 'scans', label: 'Scans', render: (r) => <span className="text-xs">{r.scan_count}</span> },
    {
      key: 'status', label: 'Status',
      render: (r) => r.status === 'completed' ? <span className="text-emerald-400 text-xs inline-flex items-center gap-1"><CheckCircle2 size={12} /> completed</span>
                    : r.status === 'in_progress' ? <span className="text-blue-400 text-xs inline-flex items-center gap-1"><Clock size={12} /> in progress</span>
                    : r.status === 'aborted' ? <span className="text-red-400 text-xs inline-flex items-center gap-1"><AlertCircle size={12} /> aborted</span>
                    : <span className="text-amber-400 text-xs">partial</span>,
    },
  ];

  return (
    <DataTable
      title="Patrols"
      description="Tour runs across all sites. Scans append in realtime — no refresh needed."
      rows={runs} loading={loading} error={error} columns={columns} onRefresh={load}
      emptyMessage="No patrols logged yet. Guards generate tour runs by scanning checkpoints in the field app."
    />
  );
}
