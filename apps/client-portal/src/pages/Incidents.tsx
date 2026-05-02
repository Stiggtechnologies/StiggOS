import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Incident } from '@stigg/shared';

export function Incidents() {
  const [rows, setRows] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal not configured.'); setLoading(false); return; }
    supabase.from('incidents').select('*').order('occurred_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error) setError(error.message);
      setRows((data ?? []) as Incident[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Incidents</h1>
        <p className="text-slate-500 mt-1">All incidents logged at your sites. Critical and high are highlighted.</p>
      </header>
      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}
      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-slate-500 text-sm">No incidents logged. Quiet operations.</p>}
          {rows.map((i) => (
            <article key={i.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      i.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      i.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                      i.severity === 'medium'   ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                    }`}>{i.severity}</span>
                    <h3 className="font-medium">{i.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{i.description}</p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <div>{new Date(i.occurred_at).toLocaleString('en-CA')}</div>
                  <div className="mt-1 capitalize">{i.status}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
