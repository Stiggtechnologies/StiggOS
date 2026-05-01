import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  Wallet,
  Bell,
  FileBarChart,
  ScrollText,
  Package,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

function StiggWordmark({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="w-8 h-8 rounded flex items-center justify-center font-black text-lg" style={{ backgroundColor: '#DC2626', color: '#ffffff' }}>
        S
      </div>
    )
  }
  return (
    <svg viewBox="0 0 300 70" width={100} height={23} xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="58"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="68"
        fill="#DC2626"
        letterSpacing="-2"
      >
        stigg
      </text>
    </svg>
  )
}

interface LayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  path: string
  icon: React.ComponentType<{ size: number; className?: string }>
  label: string
  requiredRoles?: string[]
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut, role } = useAuth()

  const menuSections: MenuSection[] = [
    {
      title: 'Operations',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Command Center' },
        { path: '/clients', icon: Building2, label: 'Clients & Properties', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/guards', icon: ShieldCheck, label: 'Guards', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/scheduling', icon: CalendarDays, label: 'Scheduling', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/patrol-tracking', icon: MapPin, label: 'Patrol Tracking', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
        { path: '/route-planning', icon: Route, label: 'Route Planning', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/equipment-assets', icon: Package, label: 'Equipment & Assets', requiredRoles: ['admin', 'manager', 'supervisor'] },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { path: '/kpi-analytics', icon: BarChart3, label: 'KPI Analytics', requiredRoles: ['admin', 'manager'] },
        { path: '/financial-dashboard', icon: Wallet, label: 'Financial Dashboard', requiredRoles: ['admin', 'manager'] },
        { path: '/reporting', icon: FileBarChart, label: 'Reporting Engine', requiredRoles: ['admin', 'manager'] },
        { path: '/sales-pipeline', icon: TrendingUp, label: 'Sales Pipeline', requiredRoles: ['admin', 'manager'] },
        { path: '/ai-intelligence', icon: Brain, label: 'AI Intelligence', requiredRoles: ['admin', 'manager'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { path: '/contracts', icon: FileText, label: 'Contracts & Pricing', requiredRoles: ['admin', 'manager'] },
        { path: '/invoicing', icon: Receipt, label: 'Invoicing', requiredRoles: ['admin', 'manager'] },
        { path: '/hr-workforce', icon: Users, label: 'HR & Workforce', requiredRoles: ['admin', 'manager'] },
        { path: '/compliance', icon: ClipboardCheck, label: 'Compliance', requiredRoles: ['admin', 'manager'] },
        { path: '/communications', icon: MessageSquare, label: 'Communications', requiredRoles: ['admin', 'manager'] },
        { path: '/notifications', icon: Bell, label: 'Notifications', requiredRoles: ['admin', 'manager', 'supervisor'] },
        { path: '/audit-log', icon: ScrollText, label: 'Audit Log', requiredRoles: ['admin'] },
        { path: '/automation-rules', icon: Zap, label: 'Automation Rules', requiredRoles: ['admin'] },
        { path: '/client-portal', icon: Globe, label: 'Client Portal', requiredRoles: ['admin', 'manager'] },
        { path: '/settings', icon: Settings, label: 'Settings', requiredRoles: ['admin'] },
      ],
    },
  ]

  const isActive = (path: string) => location.pathname === path

  const canAccessItem = (requiredRoles?: string[]) => {
    if (!requiredRoles) return true
    return requiredRoles.includes(role || '')
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Filter menu items based on user role
  const visibleMenuSections = menuSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessItem(item.requiredRoles)),
  })).filter((section) => section.items.length > 0)

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
            <StiggWordmark collapsed={!sidebarOpen} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {visibleMenuSections.map((section) => (
            <div key={section.title}>
              {sidebarOpen && (
                <p className="px-3 py-2 text-xs font-semibold text-secondary uppercase opacity-70">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                        isActive(item.path)
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
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-2 border-t border-default">
          <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-card cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#DC2626', color: '#ffffff' }}>
              {profile?.full_name.charAt(0).toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.full_name || 'User'}</div>
                <div className="text-xs text-secondary truncate">{profile?.email || 'user@stigg.ca'}</div>
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
            <h1 className="text-xl font-semibold hidden sm:block" style={{ color: '#f8fafc' }}>
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
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-card rounded transition-colors"
              title="Log out"
            >
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
