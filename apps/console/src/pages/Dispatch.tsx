import { useEffect, useState } from 'react';
import { Radio, CheckCircle2 } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';

interface Event {
  id: string; rule_id: string | null; route_id: string | null;
  source_kind: string; source_id: string | null;
  fired_at: string; target: any; status: string;
  ack_at: string | null;
  payload: any;
}

interface Route { id: string; name: string; strategy: string; is_active: boolean }

export function Dispatch() {
  const [events, setEvents] = useState<Event[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending'|'all'>('pending');

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    let q = supabase.from('dispatch_events').select('*').order('fired_at', { ascending: false }).limit(200);
    if (filter === 'pending') q = q.in('status', ['pending', 'sent']);
    const [{ data: e }, { data: r }] = await Promise.all([
      q, supabase.from('dispatch_routes').select('*').order('name'),
    ]);
    setEvents((e ?? []) as Event[]);
    setRoutes((r ?? []) as Route[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('dispatch-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_events' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function ack(id: string) {
    await supabase.from('dispatch_events').update({ status: 'acknowledged', ack_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const cols: Column<Event>[] = [
    { key: 'fired', label: 'When', searchable: (e) => fmtDateTime(e.fired_at), render: (e) => <span className="text-xs text-slate-400">{fmtDateTime(e.fired_at)}</span> },
    { key: 'src', label: 'Source', render: (e) => <code className="text-xs">{e.source_kind}</code> },
    { key: 'rule', label: 'Rule', render: (e) => <span className="text-xs text-slate-400">{e.rule_id ? e.rule_id.slice(0, 8) : '—'}</span> },
    { key: 'route', label: 'Route', render: (e) => <span className="text-xs text-slate-400">{e.route_id ? routes.find((r) => r.id === e.route_id)?.name ?? e.route_id.slice(0,6) : '—'}</span> },
    { key: 'target', label: 'Target', render: (e) => <span className="text-xs">{e.target?.kind} {e.target?.address ? `· ${e.target.address}` : ''}</span> },
    { key: 'status', label: 'Status', render: (e) => (
      <span className={`text-[10px] px-2 py-0.5 rounded ${
        e.status === 'pending' ? 'bg-amber-500/15 text-amber-300' :
        e.status === 'acknowledged' ? 'bg-emerald-500/15 text-emerald-300' :
        e.status === 'failed' ? 'bg-red-500/15 text-red-300' :
        'bg-slate-500/15 text-slate-300'
      }`}>{e.status}</span>
    ) },
    { key: 'a', label: '', render: (e) => e.status === 'pending' || e.status === 'sent'
      ? <button onClick={() => ack(e.id)} className="text-xs text-blue-400 inline-flex items-center gap-1"><CheckCircle2 size={12} /> ack</button>
      : <span /> },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Radio /> Dispatch</h1>
        <p className="text-slate-400 mt-1">Live fan-out from arming-schedule + linkage rule evaluations.</p>
      </header>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded ${filter==='pending' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Pending</button>
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter==='all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>All</button>
      </div>
      <DataTable title="" rows={events} loading={loading} error={error} columns={cols} onRefresh={load} />
    </div>
  );
}
