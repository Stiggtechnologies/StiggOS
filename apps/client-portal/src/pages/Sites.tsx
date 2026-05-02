import { useEffect, useState } from 'react';
import { Building2, MapPin } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Site } from '@stigg/shared';
import { SERVICE_LINE_LABEL } from '@stigg/shared';

export function Sites() {
  const [rows, setRows] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal not configured.'); setLoading(false); return; }
    supabase.from('sites').select('*').order('name').then(({ data, error }) => {
      if (error) setError(error.message);
      setRows((data ?? []) as Site[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">My sites</h1>
        <p className="text-slate-500 mt-1">Locations where Stigg currently delivers service for you.</p>
      </header>
      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}
      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((s) => (
            <article key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Building2 size={16} /> {s.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={11} /> {s.city ?? '—'}, {s.region ?? '—'}</p>
                </div>
                {!s.is_active && <span className="text-[10px] text-slate-500">inactive</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.service_lines.map((l) => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {SERVICE_LINE_LABEL[l]}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {rows.length === 0 && <p className="text-slate-500 text-sm col-span-2">No sites yet.</p>}
        </div>
      )}
    </div>
  );
}
