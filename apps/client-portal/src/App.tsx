// Client Portal — the customer-facing surface. Every query is RLS-scoped to
// the caller's client_id; the database does the gating, the UI just renders.

import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { HelpLauncher } from '@stigg/help';
import {
  LayoutDashboard, AlertTriangle, Receipt, Search, LogOut, Building2, MapPin,
  Activity, FileBarChart, FileText, Wrench, ShieldCheck, Users, Sparkles, Settings as SettingsIcon,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';
import { Logo } from '@stigg/brand';
import { Dashboard } from './pages/Dashboard';
import { Sites } from './pages/Sites';
import { Coverage } from './pages/Coverage';
import { ActivityPage } from './pages/Activity';
import { Incidents } from './pages/Incidents';
import { Reports } from './pages/Reports';
import { Statements } from './pages/Statements';
import { Invoices } from './pages/Invoices';
import { ServiceRequests } from './pages/ServiceRequests';
import { Compliance } from './pages/Compliance';
import { GuardsOnAccount } from './pages/GuardsOnAccount';
import { Advisor } from './pages/Advisor';
import { Settings } from './pages/Settings';
import { Ask } from './pages/Ask';
import { Login } from './pages/Login';
import { Apply } from './pages/Apply';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Public routes that bypass auth (the careers application page).
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/apply')) {
    return (
      <Routes>
        <Route path="/apply/:slug" element={<Apply />} />
        <Route path="/apply"       element={<PublicCareersIndex />} />
      </Routes>
    );
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-ink-400">Loading…</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <PortalHelp />
      <main className="flex-1 overflow-x-hidden min-w-0">
        <div className="px-8 py-6 max-w-[1600px] animate-fade-in">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/coverage"  element={<Coverage />} />
            <Route path="/activity"  element={<ActivityPage />} />
            <Route path="/sites"     element={<Sites />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/reports"   element={<Reports />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/invoices"  element={<Invoices />} />
            <Route path="/requests"  element={<ServiceRequests />} />
            <Route path="/guards"    element={<GuardsOnAccount />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/advisor"   element={<Advisor />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="/ask"       element={<Ask />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function PublicCareersIndex() {
  const [postings, setPostings] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('job_postings').select('slug, title, role_target, location_city, location_region, employment_type, pay_range_low, pay_range_high')
      .eq('status', 'published').order('published_at', { ascending: false })
      .then(({ data }) => setPostings(data ?? []));
  }, []);
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white font-bold">S</div>
          <div>
            <div className="font-semibold text-ink-900">Stigg Security</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-semibold">Careers</div>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-ink-900">Open positions</h1>
          <p className="text-ink-600 mt-1">Join a tech-forward security operator. We hire across Alberta, with national expansion underway.</p>
        </div>
        {postings.length === 0
          ? <div className="card text-ink-500 text-sm">No open positions right now. Check back soon — or email <a className="text-stigg-600 hover:underline" href="mailto:admin@stigg.ca">admin@stigg.ca</a> with your resume and we'll keep you on file.</div>
          : <div className="space-y-2">
              {postings.map((p) => (
                <a key={p.slug} href={`/apply/${p.slug}`} className="card flex items-center justify-between gap-4 hover:border-stigg-300 transition-colors">
                  <div>
                    <div className="font-semibold text-ink-900">{p.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{p.location_city ?? ''}{p.location_region ? `, ${p.location_region}` : ''} · {p.employment_type.replace('_',' ')}{p.pay_range_low && p.pay_range_high ? ` · $${p.pay_range_low}–${p.pay_range_high}/h` : ''}</div>
                  </div>
                  <span className="text-stigg-600 text-sm">Apply →</span>
                </a>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

function PortalHelp() {
  const navigate = useNavigate();
  // The portal is *primarily* a customer surface, but Stigg staff occasionally
  // sign in to verify what a customer is seeing. Resolve the actual role from
  // user_profiles so the staff member doesn't get the customer onboarding tour.
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setRole(null); return; }
      const { data: prof } = await supabase.from('user_profiles')
        .select('role').eq('auth_user_id', u.user.id).maybeSingle();
      setRole(prof?.role ?? null);
    })();
  }, []);
  if (!role) return null;
  return <HelpLauncher app="portal" role={role as any} supabase={supabase} navigate={navigate} />;
}

const NAV = [
  { group: 'live',     label: 'Live',
    items: [
      { to: '/',         label: 'Dashboard',   icon: LayoutDashboard },
      { to: '/coverage', label: 'Coverage map',icon: MapPin },
      { to: '/activity', label: 'Activity',    icon: Activity },
    ],
  },
  { group: 'records',  label: 'Records',
    items: [
      { to: '/sites',     label: 'My sites',     icon: Building2 },
      { to: '/incidents', label: 'Incidents',    icon: AlertTriangle },
      { to: '/guards',    label: 'Guards',       icon: Users },
    ],
  },
  { group: 'business', label: 'Business',
    items: [
      { to: '/statements', label: 'Statements',   icon: FileText },
      { to: '/invoices',   label: 'Invoices',     icon: Receipt },
      { to: '/reports',    label: 'Reports',      icon: FileBarChart },
      { to: '/requests',   label: 'Service requests', icon: Wrench },
    ],
  },
  { group: 'trust',    label: 'Trust',
    items: [
      { to: '/compliance', label: 'Compliance pack', icon: ShieldCheck },
      { to: '/advisor',    label: 'Risk advisor',    icon: Sparkles },
    ],
  },
  { group: 'tools',    label: 'Tools',
    items: [
      { to: '/ask',      label: 'Ask in plain English', icon: Search },
      { to: '/settings', label: 'Settings',             icon: SettingsIcon },
    ],
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);

  return (
    <aside className="w-72 shrink-0 border-r border-white/[0.06] bg-ink-950/80 backdrop-blur-glass flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <a href="https://stigg.ca" target="_blank" rel="noopener noreferrer" title="Stigg Security · stigg.ca">
            <Logo height={26} />
          </a>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-semibold">Asset Protection</div>
          </div>
        </div>
        {email && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Nav, grouped — matches console pattern */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-5 mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-600 font-semibold">{g.label}</div>
            {g.items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-5 py-2 text-sm transition-all duration-150 relative ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-stigg-600/15 to-transparent'
                      : 'text-ink-400 hover:text-ink-50 hover:bg-white/[0.03]'
                  }`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-stigg-600 shadow-glow" />}
                    <n.icon size={15} className={isActive ? 'text-stigg-400' : 'text-ink-500 group-hover:text-ink-300'} />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / user — matches console */}
      <div className="border-t border-white/[0.06] px-5 py-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-stigg-500 to-stigg-700 grid place-items-center text-white font-semibold text-[11px]">
            {(email ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 truncate text-ink-200">{email ?? '—'}</div>
          <button
            className="text-ink-500 hover:text-stigg-400 p-1 transition-colors"
            onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
