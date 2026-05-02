import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';

interface Notif {
  id: string; topic: string; channel: string; status: string;
  created_at: string; read_at: string | null;
  payload: Record<string, unknown>;
}

export function Messages() {
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) setError(error.message);
    setRows((data ?? []) as Notif[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ status: 'read', read_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  const columns: Column<Notif>[] = [
    { key: 'topic', label: 'Topic', searchable: (r) => `${r.topic} ${JSON.stringify(r.payload).slice(0, 200)}`, render: (r) => (
      <div>
        <div className="font-medium">{r.topic}</div>
        <div className="text-xs text-slate-500 truncate max-w-md">{JSON.stringify(r.payload).slice(0, 120)}</div>
      </div>
    ) },
    { key: 'channel', label: 'Channel', render: (r) => <code className="text-xs">{r.channel}</code> },
    { key: 'status', label: 'Status', render: (r) => <span className={r.status === 'read' ? 'text-slate-500 text-xs' : 'text-blue-300 text-xs'}>{r.status}</span> },
    { key: 'when', label: 'Received', render: (r) => <span className="text-xs text-slate-400">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'actions', label: '',
      render: (r) => r.status !== 'read'
        ? <button onClick={(e) => { e.stopPropagation(); markRead(r.id); }} className="text-xs text-blue-400 hover:underline">mark read</button>
        : <span />,
    },
  ];

  return (
    <DataTable
      title="Messages" description="Inbox of system + agent notifications."
      rows={rows} loading={loading} error={error} columns={columns} onRefresh={load}
      emptyMessage="No notifications yet."
    />
  );
}
