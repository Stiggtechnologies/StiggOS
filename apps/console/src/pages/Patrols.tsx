import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';
import { CheckCircle2, AlertCircle, Clock, AlertTriangle, MapPin, MapPinOff, Timer } from 'lucide-react';

interface TourRun {
  id: string; org_id: string; shift_id: string; route_id: string;
  started_at: string; completed_at: string | null;
  status: 'in_progress' | 'completed' | 'aborted' | 'partial';
  scan_count?: number;
}

interface RouteRow {
  id: string; name: string; expected_duration_min: number | null; site_id: string;
}

// Exceptions are flagged scans that failed validation (out of radius, no shift,
// unknown code, etc.) Surfacing them lets supervisors approve or convert
// genuine scans that the auto-validator rejected.
interface PatrolException {
  id: string;
  scanned_at: string;
  kind: string;
  status: string;
  checkpoint_code: string | null;
  checkpoint_label: string | null;
  site_id: string | null;
  site_name: string | null;
  guard_id: string | null;
  guard_name: string | null;
  distance_m: number | null;
  geo_accuracy_m: number | null;
  note: string | null;
}

interface OverdueRun {
  run_id: string;
  site_id: string | null;
  site_name: string | null;
  route_id: string;
  route_name: string;
  guard_id: string | null;
  guard_name: string | null;
  started_at: string;
  expected_duration_min: number;
  minutes_overdue: number;
  total_checkpoints: number;
  scanned_checkpoints: number;
  missed_checkpoints: number;
  alerted: boolean;
}

const EXCEPTION_LABELS: Record<string, { label: string; tone: 'warn' | 'bad' }> = {
  unknown_code:        { label: 'Unknown code',        tone: 'bad'  },
  inactive_checkpoint: { label: 'Inactive',            tone: 'warn' },
  no_active_shift:     { label: 'No active shift',     tone: 'warn' },
  wrong_site:          { label: 'Wrong site',          tone: 'bad'  },
  out_of_window:       { label: 'Outside shift hours', tone: 'warn' },
  out_of_range:        { label: 'Out of range',        tone: 'warn' },
  low_gps_accuracy:    { label: 'GPS too noisy',       tone: 'warn' },
  duplicate:           { label: 'Duplicate',           tone: 'warn' },
  no_guard_record:     { label: 'No guard record',     tone: 'bad'  },
  other:               { label: 'Other',               tone: 'warn' },
};

export function Patrols() {
  const [runs, setRuns] = useState<TourRun[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [exceptions, setExceptions] = useState<PatrolException[]>([]);
  const [overdue, setOverdue] = useState<OverdueRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const [{ data: r }, { data: rt }, { data: scans }, { data: ex }, { data: ov }] = await Promise.all([
      supabase.from('tour_runs').select('*').order('started_at', { ascending: false }).limit(100),
      supabase.from('tour_routes').select('id, name, expected_duration_min, site_id'),
      supabase.from('tour_scans').select('run_id'),
      supabase.rpc('patrol_exceptions_pending', { p_limit: 50 }),
      supabase.rpc('patrol_overdue_runs_for_org'),
    ]);
    const counts = new Map<string, number>();
    for (const s of (scans ?? [])) counts.set((s as any).run_id, (counts.get((s as any).run_id) ?? 0) + 1);
    setRuns((r ?? []).map((row: any) => ({ ...row, scan_count: counts.get(row.id) ?? 0 })));
    setRoutes((rt ?? []) as RouteRow[]);
    setExceptions((ex ?? []) as PatrolException[]);
    setOverdue((ov ?? []) as OverdueRun[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Realtime so the dashboard moves as scans happen.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('patrols')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_runs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_scans' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_exceptions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function resolve(id: string, decision: 'approved' | 'rejected' | 'converted', note?: string) {
    const { data, error: rpcErr } = await supabase.rpc('resolve_patrol_exception', {
      p_exception_id: id, p_decision: decision, p_note: note ?? null,
    });
    if (rpcErr) { alert(`Could not resolve: ${rpcErr.message}`); return; }
    if ((data as any)?.status !== 'ok') { alert((data as any)?.message ?? 'Resolve failed.'); return; }
    void load();
  }

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
    <div className="space-y-6">
      {overdue.length > 0    && <OverduePanel rows={overdue} />}
      {exceptions.length > 0 && <ExceptionsPanel rows={exceptions} onResolve={resolve} />}
      <DataTable
        title="Patrols"
        description="Tour runs across all sites. Scans append in realtime — no refresh needed."
        rows={runs} loading={loading} error={error} columns={columns} onRefresh={load}
        emptyMessage="No patrols logged yet. Guards generate tour runs by scanning checkpoints in the field app."
      />
    </div>
  );
}

function OverduePanel({ rows }: { rows: OverdueRun[] }) {
  return (
    <section className="rounded-lg border border-red-500/30 bg-red-500/5">
      <header className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2">
        <Timer size={16} className="text-red-400" />
        <h2 className="font-semibold text-red-200">Overdue runs · {rows.length}</h2>
        <span className="text-xs text-red-300/70 ml-2">
          In-progress tours past expected duration with checkpoints unscanned. The cron has notified ops staff.
        </span>
      </header>
      <ul className="divide-y divide-red-500/10">
        {rows.map((r) => (
          <li key={r.run_id} className="px-4 py-3 flex items-center gap-3">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${r.minutes_overdue > 60 ? 'bg-red-500/30 text-red-200' : 'bg-amber-500/20 text-amber-200'}`}>
              +{Math.round(r.minutes_overdue)}m
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {r.route_name}
                {r.site_name && <span className="text-slate-400"> · {r.site_name}</span>}
              </div>
              <div className="text-xs text-slate-400">
                {r.guard_name ?? <span className="italic">unassigned</span>} · started {fmtDateTime(r.started_at)} ·
                {' '}{r.scanned_checkpoints} of {r.total_checkpoints} scanned ·
                {' '}<span className="text-red-300">{r.missed_checkpoints} missed</span>
              </div>
            </div>
            {r.alerted && <span className="text-[10px] uppercase tracking-wider text-slate-500">Notified</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExceptionsPanel({
  rows, onResolve,
}: {
  rows: PatrolException[];
  onResolve: (id: string, decision: 'approved' | 'rejected' | 'converted', note?: string) => void;
}) {
  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5">
      <header className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-400" />
        <h2 className="font-semibold text-amber-200">Flagged scans · {rows.length}</h2>
        <span className="text-xs text-amber-300/70 ml-2">
          Taps that failed auto-validation. Approve a real scan, convert it to a tour run, or reject if fraudulent.
        </span>
      </header>
      <ul className="divide-y divide-amber-500/10">
        {rows.map((r) => {
          const meta = EXCEPTION_LABELS[r.kind] ?? EXCEPTION_LABELS.other!;
          return (
            <li key={r.id} className="px-4 py-3 grid gap-3 grid-cols-[1fr,auto] items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${meta.tone === 'bad' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-200'}`}>
                    {meta.label}
                  </span>
                  <span className="text-sm font-medium">
                    {r.guard_name ?? <span className="text-slate-400">unknown guard</span>}
                  </span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-xs text-slate-300">
                    {r.checkpoint_label ?? r.checkpoint_code ?? '—'}
                    {r.site_name && <> · {r.site_name}</>}
                  </span>
                  <span className="text-xs text-slate-500">{fmtDateTime(r.scanned_at)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-x-4">
                  {r.distance_m != null && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinOff size={11} /> {Math.round(r.distance_m)}m from checkpoint
                    </span>
                  )}
                  {r.geo_accuracy_m != null && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> ±{Math.round(r.geo_accuracy_m)}m GPS
                    </span>
                  )}
                  {r.note && <span className="italic text-slate-300">"{r.note}"</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onResolve(r.id, 'converted')}
                  className="text-xs px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 font-medium"
                  disabled={!r.checkpoint_label} title="Promote to a real tour scan">
                  Approve
                </button>
                <button onClick={() => onResolve(r.id, 'rejected')}
                  className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700">
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
