import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';

interface AuditRow {
  id: number;
  org_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  row_pk: string | null;
  before_data: any;
  after_data: any;
  ip: string | null;
  request_id: string | null;
  created_at: string;
}

export function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<AuditRow | null>(null);

  async function load() {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    setRows(((data ?? []) as AuditRow[]).map((r) => ({ ...r, id: r.id })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const columns: Column<AuditRow & { id: any }>[] = [
    { key: 'when', label: 'When', searchable: (r) => fmtDateTime(r.created_at), render: (r) => <span className="text-xs text-slate-400">{fmtDateTime(r.created_at)}</span> },
    { key: 'action', label: 'Action', render: (r) => (
      <span className={`text-[10px] px-2 py-0.5 rounded ${
        r.action === 'INSERT' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
        r.action === 'UPDATE' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
        'bg-red-500/15 text-red-300 border border-red-500/30'
      }`}>{r.action}</span>
    ) },
    { key: 'table', label: 'Table', render: (r) => <code className="text-xs text-slate-300">{r.table_name}</code> },
    { key: 'row', label: 'Row', render: (r) => <code className="text-xs text-slate-500">{r.row_pk?.slice(0, 8) ?? '—'}</code> },
    { key: 'actor', label: 'Actor', render: (r) => <span className="text-xs text-slate-400">{r.actor_role ?? '—'} {r.actor_user_id ? '· ' + r.actor_user_id.slice(0,6) : ''}</span> },
    { key: 'ip', label: 'IP', render: (r) => <span className="text-xs text-slate-500">{r.ip ?? '—'}</span> },
  ];

  return (
    <>
      <DataTable
        title="Audit log"
        description="Every mutation on tenant tables. Append-only, RLS-scoped to org admins."
        rows={rows} loading={loading} error={error}
        columns={columns as any} onRefresh={load}
        onRowClick={(r) => setOpen(r as any)}
        emptyMessage="No audit events yet. Mutations will appear here as soon as anything is created or updated."
      />
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.action} on ${open.table_name}` : ''} width="xl">
        {open && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 grid grid-cols-2 gap-3">
              <div>When: <span className="text-slate-200">{fmtDateTime(open.created_at)}</span></div>
              <div>Actor: <span className="text-slate-200">{open.actor_role ?? '—'} ({open.actor_user_id?.slice(0,12) ?? '—'})</span></div>
              <div>Row: <code className="text-slate-200">{open.row_pk}</code></div>
              <div>Request: <code className="text-slate-200">{open.request_id ?? '—'}</code></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Before</div>
                <pre className="text-xs bg-slate-900 p-3 rounded border border-slate-800 overflow-auto max-h-96">
{open.before_data ? JSON.stringify(open.before_data, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">After</div>
                <pre className="text-xs bg-slate-900 p-3 rounded border border-slate-800 overflow-auto max-h-96">
{open.after_data ? JSON.stringify(open.after_data, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
