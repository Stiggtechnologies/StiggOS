import { useEffect, useState } from 'react';
import { Truck, AlertTriangle } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';

interface VRow {
  id: string; unit_number: string; plate: string | null;
  vehicle_type: string; capabilities: string[];
  is_active: boolean; current_geo_at: string | null;
  current_geo: { coordinates?: [number, number] } | null;
}
interface AlertRow {
  id: string; vehicle_id: string;
  detected_at: string; alert_type: string; severity: string;
  speed_kmh: number | null; details: any; triage_status: string;
}

export function Vehicles() {
  const [vehicles, setVehicles] = useState<VRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const [{ data: v }, { data: a }] = await Promise.all([
      supabase.from('vehicles').select('id, unit_number, plate, vehicle_type, capabilities, is_active, current_geo_at, current_geo').order('unit_number'),
      supabase.from('vehicle_alerts').select('*').eq('triage_status', 'pending').order('detected_at', { ascending: false }).limit(50),
    ]);
    setVehicles((v ?? []) as VRow[]);
    setAlerts((a ?? []) as AlertRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const ch = supabase.channel('vehicles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_alerts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function ackAlert(id: string) {
    await supabase.from('vehicle_alerts').update({ triage_status: 'acknowledged' }).eq('id', id);
    load();
  }

  const vCols: Column<VRow>[] = [
    { key: 'unit', label: 'Unit', searchable: (v) => `${v.unit_number} ${v.plate ?? ''}`, render: (v) => (
      <div>
        <div className="font-medium">{v.unit_number}</div>
        <div className="text-xs text-slate-500">{v.plate ?? '—'} · {v.vehicle_type.replace(/_/g,' ')}</div>
      </div>
    ) },
    { key: 'caps', label: 'Capabilities', render: (v) => (
      <div className="flex flex-wrap gap-1">{v.capabilities.map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c}</span>)}</div>
    ) },
    { key: 'last', label: 'Last GPS', render: (v) => <span className="text-xs text-slate-400">{fmtDateTime(v.current_geo_at)}</span> },
    { key: 'alerts', label: 'Pending alerts', render: (v) => {
      const n = alerts.filter((a) => a.vehicle_id === v.id).length;
      return n > 0 ? <span className="text-amber-400 text-xs inline-flex items-center gap-1"><AlertTriangle size={12} /> {n}</span> : <span className="text-slate-500 text-xs">—</span>;
    } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Truck /> Vehicles & GPS</h1>
        <p className="text-slate-400 mt-1">Live position, speeding/idling/unauthorized-use alerts. Ingest via Traccar or OsmAnd.</p>
        <p className="text-xs text-slate-500 mt-1">
          Webhook: <code className="text-blue-300">{`${import.meta.env.VITE_SUPABASE_URL ?? 'https://<project>.supabase.co'}/functions/v1/vehicle-track?token=<TRACCAR_TOKEN>`}</code>
        </p>
      </div>

      <DataTable title="Fleet" rows={vehicles} loading={loading} error={error} columns={vCols} onRefresh={load} />

      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Pending alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">All clear. New alerts stream in realtime.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const v = vehicles.find((x) => x.id === a.vehicle_id);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      a.severity === 'critical' ? 'badge-critical' :
                      a.severity === 'high'     ? 'badge-high'     :
                      a.severity === 'medium'   ? 'badge-medium'   : 'badge-low'
                    }`}>{a.severity}</span>
                    <div>
                      <div className="text-sm">{a.alert_type.replace(/_/g,' ')} · {v?.unit_number ?? a.vehicle_id.slice(0,6)}</div>
                      <div className="text-xs text-slate-500">{fmtDateTime(a.detected_at)} {a.speed_kmh ? `· ${a.speed_kmh.toFixed(0)} km/h` : ''}</div>
                    </div>
                  </div>
                  <button onClick={() => ackAlert(a.id)} className="text-xs text-blue-400 hover:underline">acknowledge</button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
