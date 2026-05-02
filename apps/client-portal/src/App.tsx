// Client Portal — the surface customers actually use. RLS enforces that
// users with role='client' see only their bound client_id; this app simply
// queries normally and the database does the gating.

import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Shield, LayoutDashboard, AlertTriangle, FileText, Receipt, Search, LogOut, Building2 } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';
import { Dashboard } from './pages/Dashboard';
import { Sites } from './pages/Sites';
import { Incidents } from './pages/Incidents';
import { Invoices } from './pages/Invoices';
import { Ask } from './pages/Ask';
import { Login } from './pages/Login';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-6 max-w-6xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2">
        <Shield size={22} className="text-blue-600" />
        <div>
          <div className="font-bold tracking-tight">Stigg Client</div>
          <div className="text-xs text-slate-500">portal</div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {[
          { to: '/',          label: 'Dashboard',     icon: LayoutDashboard },
          { to: '/sites',     label: 'My sites',      icon: Building2      },
          { to: '/incidents', label: 'Incidents',     icon: AlertTriangle  },
          { to: '/invoices',  label: 'Invoices',      icon: Receipt        },
          { to: '/ask',       label: 'Ask in plain English', icon: Search  },
        ].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <n.icon size={16} /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-xs">
        <button className="flex items-center gap-2 text-slate-500 hover:text-red-500"
          onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
