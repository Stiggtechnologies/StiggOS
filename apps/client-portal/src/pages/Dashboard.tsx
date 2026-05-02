import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { AlertTriangle, Building2, Receipt, ChevronRight } from 'lucide-react';
import { WelcomeBanner } from '../components/WelcomeBanner';

interface Counts { sites: number; openIncidents: number; unpaidInvoices: number; }

export function Dashboard() {
  const [counts, setCounts] = useState<Counts>({ sites: 0, openIncidents: 0, unpaidInvoices: 0 });
  const [recent, setRecent] = useState<Array<{ id: string; title: string; severity: string; occurred_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setError('Portal not configured.'); setLoading(false); return; }
    Promise.all([
      supabase.from('sites').select('id', { count: 'exact', head: true }),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).in('status', ['open','investigating']),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['sent','overdue']),
      supabase.from('incidents').select('id, title, severity, occurred_at').order('occurred_at', { ascending: false }).limit(5),
    ]).then(([s, i, v, recents]) => {
      setCounts({ sites: s.count ?? 0, openIncidents: i.count ?? 0, unpaidInvoices: v.count ?? 0 });
      setRecent((recents.data ?? []) as any);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-slate-500 mt-1">Live overview of your sites, incidents, and invoices.</p>
      </header>

      <WelcomeBanner />

      {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <Link to="/sites" className="card hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">My sites</p>
            <p className="text-3xl font-semibold mt-1">{loading ? '…' : counts.sites}</p>
          </div>
          <Building2 className="text-blue-500" />
        </Link>
        <Link to="/incidents" className="card hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Open incidents</p>
            <p className="text-3xl font-semibold mt-1">{loading ? '…' : counts.openIncidents}</p>
          </div>
          <AlertTriangle className="text-amber-500" />
        </Link>
        <Link to="/invoices" className="card hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Unpaid invoices</p>
            <p className="text-3xl font-semibold mt-1">{loading ? '…' : counts.unpaidInvoices}</p>
          </div>
          <Receipt className="text-emerald-500" />
        </Link>
      </div>

      <section className="card">
        <h2 className="font-semibold mb-3">Recent incidents at your sites</h2>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && recent.length === 0 && <p className="text-sm text-slate-500">Nothing recent — quiet operations.</p>}
        {recent.map((i) => (
          <Link key={i.id} to="/incidents" className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 group">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                i.severity === 'critical' ? 'bg-red-100 text-red-700' :
                i.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                i.severity === 'medium'   ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
              }`}>{i.severity}</span>
              <span className="text-sm">{i.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {new Date(i.occurred_at).toLocaleString('en-CA')}
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
