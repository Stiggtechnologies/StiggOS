import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, Users, Building2, Calendar, Map, AlertTriangle, BarChart3,
  FileText, Receipt, Brain, Shield, MessageSquare, Settings, Truck, Cpu, ScrollText,
  Camera, LogOut, Radio, Tag,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { to: '/',                  label: 'Command Center',     icon: LayoutDashboard },
  { to: '/incidents',         label: 'Incidents',          icon: AlertTriangle  },
  { to: '/ai',                label: 'AI Intelligence',    icon: Brain          },
  { to: '/scheduling',        label: 'Scheduling',         icon: Calendar       },
  { to: '/guards',            label: 'Guards',             icon: Users          },
  { to: '/sites',             label: 'Sites & Posts',      icon: Building2      },
  { to: '/patrols',           label: 'Patrols',            icon: Map            },
  { to: '/cameras',           label: 'Cameras & Automation', icon: Camera       },
  { to: '/vehicles',          label: 'Vehicles & GPS',     icon: Truck          },
  { to: '/assets',            label: 'Asset trackers',     icon: Tag            },
  { to: '/dispatch',          label: 'Dispatch',           icon: Radio          },
  { to: '/monitoring',        label: 'Virtual Guarding',   icon: Camera         },
  { to: '/transport',         label: 'Secure Transport',   icon: Truck          },
  { to: '/it',                label: 'IT & Cyber',         icon: Cpu            },
  { to: '/clients',           label: 'Clients',            icon: Building2      },
  { to: '/leads',             label: 'Sales Pipeline',     icon: BarChart3      },
  { to: '/contracts',         label: 'Contracts',          icon: FileText       },
  { to: '/invoices',          label: 'Invoices',           icon: Receipt        },
  { to: '/compliance',        label: 'Compliance',         icon: Shield         },
  { to: '/audit',             label: 'Audit Log',          icon: ScrollText     },
  { to: '/messages',          label: 'Messages',           icon: MessageSquare  },
  { to: '/settings',          label: 'Settings',           icon: Settings       },
];

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-slate-800 bg-slate-950/95 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-blue-500" />
            <div>
              <div className="font-bold tracking-tight">Stigg OS</div>
              <div className="text-xs text-slate-500">{profile?.org_id?.slice(0, 8) ?? '—'}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                  isActive ? 'bg-blue-600/15 text-blue-300 border-r-2 border-blue-500' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-5 py-4 text-xs">
          <div className="text-slate-300 truncate">{profile?.email ?? '—'}</div>
          <div className="text-slate-500">{profile?.role ?? '—'}</div>
          <button
            className="mt-3 flex items-center gap-2 text-slate-400 hover:text-red-400"
            onClick={async () => { await signOut(); navigate('/login'); }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
