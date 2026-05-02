import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtCAD, fmtDateTime, statusBadge } from '../lib/format';

interface Run {
  id: string; run_number: string | null; client_id: string;
  cargo_type: string | null; cargo_value_cad: number | null;
  scheduled_pickup: string; scheduled_dropoff: string;
  status: 'scheduled' | 'en_route_pickup' | 'at_pickup' | 'in_transit' | 'at_dropoff' | 'completed' | 'cancelled' | 'exception';
}

export function SecureTransport() {
  const [rows, setRows] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const { data, error } = await supabase.from('transport_runs').select('*').order('scheduled_pickup', { ascending: false }).limit(200);
    if (error) setError(error.message);
    setRows((data ?? []) as Run[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('transport')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_runs' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const columns: Column<Run>[] = [
    { key: 'num', label: 'Run', searchable: (r) => r.run_number ?? '', render: (r) => (
      <div>
        <div className="font-medium font-mono">{r.run_number ?? r.id.slice(0, 8)}</div>
        <div className="text-xs text-slate-500">{r.cargo_type ?? '—'}</div>
      </div>
    ) },
    { key: 'value', label: 'Value', render: (r) => <span>{fmtCAD(r.cargo_value_cad)}</span> },
    { key: 'pickup', label: 'Pickup', render: (r) => <span className="text-xs text-slate-400">{fmtDateTime(r.scheduled_pickup)}</span> },
    { key: 'drop', label: 'Drop-off', render: (r) => <span className="text-xs text-slate-400">{fmtDateTime(r.scheduled_dropoff)}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(r.status)}`}>{r.status.replace(/_/g,' ')}</span> },
  ];

  return (
    <DataTable
      title="Secure Transport"
      description="Marked-vehicle cargo runs with chain-of-custody events. Updates stream live."
      rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
    />
  );
}
