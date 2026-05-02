import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime, statusBadge } from '../lib/format';

interface Asset {
  id: string; hostname: string; asset_type: string; os: string | null;
  status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'offline';
  last_check_in: string | null;
}

interface Ticket {
  id: string; ticket_number: string | null; title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  sla_due_at: string | null;
}

export function ITCyber() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('it_assets').select('id, hostname, asset_type, os, status, last_check_in').order('hostname'),
      supabase.from('it_tickets').select('id, ticket_number, title, priority, status, sla_due_at').order('created_at', { ascending: false }).limit(100),
    ]);
    setAssets((a ?? []) as Asset[]);
    setTickets((t ?? []) as Ticket[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const assetCols: Column<Asset>[] = [
    { key: 'host', label: 'Hostname', searchable: (a) => `${a.hostname} ${a.os ?? ''}`, render: (a) => (
      <div>
        <div className="font-medium">{a.hostname}</div>
        <div className="text-xs text-slate-500">{a.os ?? '—'}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (a) => <code className="text-xs">{a.asset_type}</code> },
    { key: 'status', label: 'Status', render: (a) => <span className={`text-[10px] px-2 py-0.5 rounded ${
      a.status === 'critical' ? 'badge-critical' :
      a.status === 'warning'  ? 'badge-medium'   :
      a.status === 'healthy'  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
      'badge-low'
    }`}>{a.status}</span> },
    { key: 'check', label: 'Last check-in', render: (a) => <span className="text-xs text-slate-400">{fmtDateTime(a.last_check_in)}</span> },
  ];

  const ticketCols: Column<Ticket>[] = [
    { key: 'num', label: 'Ticket', searchable: (t) => `${t.ticket_number ?? ''} ${t.title}`, render: (t) => (
      <div>
        <div className="text-xs text-slate-500 font-mono">{t.ticket_number ?? '—'}</div>
        <div className="font-medium">{t.title}</div>
      </div>
    ) },
    { key: 'pri', label: 'Priority', render: (t) => <span className={`text-[10px] px-2 py-0.5 rounded ${
      t.priority === 'urgent' ? 'badge-critical' :
      t.priority === 'high'   ? 'badge-high'     :
      t.priority === 'medium' ? 'badge-medium'   : 'badge-low'
    }`}>{t.priority}</span> },
    { key: 'status', label: 'Status', render: (t) => <span className={`text-[10px] px-2 py-0.5 rounded ${statusBadge(t.status)}`}>{t.status.replace('_', ' ')}</span> },
    { key: 'sla', label: 'SLA due', render: (t) => <span className="text-xs text-slate-400">{fmtDateTime(t.sla_due_at)}</span> },
  ];

  return (
    <div className="space-y-8">
      <DataTable
        title="IT & Cyber" description="Managed assets and the open ticket queue. PIPEDA breach register lives under Compliance."
        rows={assets} loading={loading} error={error} columns={assetCols} onRefresh={load}
        emptyMessage="No managed assets yet. Onboard a client by adding their endpoints."
      />
      <DataTable
        title="Tickets" description="Active IT/Cyber service tickets, SLA-tracked."
        rows={tickets} loading={loading} error={null} columns={ticketCols}
      />
    </div>
  );
}
