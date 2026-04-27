import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CalendarDays,
  MapPin,
  AlertTriangle,
  BarChart3,
  FileText,
  Receipt,
  Globe,
  Brain,
  Route,
  ClipboardCheck,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Users,
  DollarSign,
  Bell,
  Printer,
  ScrollText,
  Wrench,
  Target,
  Zap,
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Command Center' },
    { path: '/clients', icon: Building2, label: 'Clients & Properties' },
    { path: '/guards', icon: ShieldCheck, label: 'Guards' },
    { path: '/scheduling', icon: CalendarDays, label: 'Scheduling' },
    { path: '/patrol-tracking', icon: MapPin, label: 'Patrol Tracking' },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
    { path: '/kpi-analytics', icon: BarChart3, label: 'KPI Analytics' },
    { path: '/contracts', icon: FileText, label: 'Contracts & Pricing' },
    { path: '/invoicing', icon: Receipt, label: 'Invoicing' },
    { path: '/client-portal', icon: Globe, label: 'Client Portal' },
    { path: '/ai-intelligence', icon: Brain, label: 'AI Intelligence' },
    { path: '/route-planning', icon: Route, label: 'Route Planning' },
    { path: '/compliance', icon: ClipboardCheck, label: 'Compliance' },
    { path: '/communications', icon: MessageSquare, label: 'Communications' },
    { type: 'divider', label: 'Phase 2' },
    { path: '/hr-workforce', icon: Users, label: 'HR & Workforce' },
    { path: '/financials', icon: DollarSign, label: 'Financials' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/reports', icon: Printer, label: 'Reporting Engine' },
    { path: '/audit-log', icon: ScrollText, label: 'Audit Log' },
    { path: '/equipment', icon: Wrench, label: 'Equipment & Assets' },
    { path: '/sales-pipeline', icon: Target, label: 'Sales Pipeline' },
    { path: '/automation', icon: Zap, label: 'Automation Rules' },
    { type: 'divider', label: 'System' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex h-screen bg-primary">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-secondary border-r border-default transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-b border-default">
          <div className="flex items-center justify-between">
            <div className={`font-bold text-accent ${!sidebarOpen && 'hidden'}`}>
              <span className="text-xl">STIGG</span>
            </div>
            {!sidebarOpen && (
              <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-secondary font-bold">
                S
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item, idx) => {
            if ((item as any).type === 'divider') {
              return (
                <div key={`divider-${idx}`} className="pt-3 pb-1 px-3">
                  {sidebarOpen && (
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  )}
                  {!sidebarOpen && <div className="border-t border-default" />}
                </div>
              )
            }
            const Icon = item.icon!
            return (
              <Link
                key={item.path}
                to={item.path!}
                className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                  isActive(item.path!)
                    ? 'bg-accent text-secondary font-semibold'
                    : 'text-secondary hover:bg-card'
                }`}
                title={item.label}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-2 border-t border-default">
          <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-card cursor-pointer transition-colors">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-secondary font-bold flex-shrink-0">
              A
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Admin User</div>
                <div className="text-xs text-secondary truncate">admin@stigg.ca</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-secondary border-b border-default px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-card rounded transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-semibold text-primary hidden sm:block">
              Stigg Security Operations
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-secondary">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <button className="p-2 hover:bg-card rounded transition-colors">
              <LogOut size={18} className="text-secondary" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-primary">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
