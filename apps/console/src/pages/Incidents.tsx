import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Incident, IncidentSeverity, IncidentStatus } from '@stigg/shared';

export function Incidents() {
  const [rows, setRows] = useState<Incident[]>([]);
  const [search, setSearch] = useState('');
  const [sev, setSev] = useState<IncidentSeverity | 'all'>('all');
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Supabase not configured.'); setLoading(false); return; }
    supabase.from('incidents').select('*').order('occurred_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error) setError(error.message);
      setRows((data ?? []) as Incident[]);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) =>
    (sev === 'all' || r.severity === sev)
    && (status === 'all' || r.status === status)
    && (search === '' || (r.title + ' ' + (r.description ?? '')).toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-slate-400 mt-1">Track and resolve security incidents across all sites.</p>
        </div>
        <Link className="btn-primary inline-flex items-center gap-2" to="/incidents/copilot">
          <Plus size={16} /> New incident
        </Link>
      </div>

      <div className="card flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[10rem]" value={sev} onChange={(e) => setSev(e.target.value as any)}>
          <option value="all">All severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input max-w-[10rem]" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-200">
          <p className="font-medium">Cannot load incidents</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-slate-500">
          <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
          No incidents match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <div key={i.id} className="card hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{i.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      i.severity === 'critical' ? 'badge-critical' :
                      i.severity === 'high'     ? 'badge-high'     :
                      i.severity === 'medium'   ? 'badge-medium'   : 'badge-low'
                    }`}>{i.severity}</span>
                    {i.ai_confidence != null && (
                      <span className="text-[10px] text-blue-400">AI {Math.round(i.ai_confidence * 100)}%</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">{i.description}</p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <div>{new Date(i.occurred_at).toLocaleString()}</div>
                  <div className="mt-1 capitalize">{i.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
