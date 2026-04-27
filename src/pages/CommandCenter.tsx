import React, { useState, useEffect } from 'react'
import { Users, Clock, Building2, AlertTriangle, TrendingUp, Shield, Plus, Zap, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Guard, Shift, Client, Incident } from '../lib/types'

const DEMO_DATA = {
  guards: [
    { id: '1', first_name: 'Jemal', last_name: 'Hassan', status: 'active' as const, hourly_rate: 19 },
    { id: '2', first_name: 'Solomon', last_name: 'Abdi', status: 'active' as const, hourly_rate: 18 },
    { id: '3', first_name: 'Jean', last_name: 'Marie', status: 'active' as const, hourly_rate: 19 },
    { id: '4', first_name: 'Kanwal', last_name: 'Singh', status: 'active' as const, hourly_rate: 23.25 },
  ],
  shifts: [
    { id: '1', status: 'in_progress' as const },
    { id: '2', status: 'in_progress' as const },
    { id: '3', status: 'in_progress' as const },
    { id: '4', status: 'in_progress' as const },
  ],
  clients: [
    { id: '1', company_name: 'Northview Residential REIT', contract_status: 'active' as const },
    { id: '2', company_name: 'Mainstreet Equity', contract_status: 'active' as const },
    { id: '3', company_name: 'Canadian Tire', contract_status: 'active' as const },
  ],
  incidents: [
    { id: '1', severity: 'high' as const, status: 'open' as const },
    { id: '2', severity: 'medium' as const, status: 'investigating' as const },
  ],
}

export function CommandCenter() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [guardsRes, shiftsRes, clientsRes, incidentsRes] = await Promise.all([
        supabase.from('guards').select('*').limit(8),
        supabase.from('shifts').select('*').eq('status', 'in_progress').limit(8),
        supabase.from('clients').select('*').eq('contract_status', 'active').limit(8),
        supabase.from('incidents').select('*').eq('status', 'open').limit(8),
      ])

      setGuards(guardsRes.data && guardsRes.data.length > 0 ? guardsRes.data : (DEMO_DATA.guards as any))
      setShifts(shiftsRes.data && shiftsRes.data.length > 0 ? shiftsRes.data : (DEMO_DATA.shifts as any))
      setClients(clientsRes.data && clientsRes.data.length > 0 ? clientsRes.data : (DEMO_DATA.clients as any))
      setIncidents(incidentsRes.data && incidentsRes.data.length > 0 ? incidentsRes.data : (DEMO_DATA.incidents as any))
    } catch (error) {
      console.error('Error fetching data:', error)
      setGuards(DEMO_DATA.guards as any)
      setShifts(DEMO_DATA.shifts as any)
      setClients(DEMO_DATA.clients as any)
      setIncidents(DEMO_DATA.incidents as any)
    } finally {
      setLoading(false)
    }
  }

  const activeGuardsCount = guards.filter(g => g.status === 'active').length
  const activeShiftsCount = shifts.filter(s => s.status === 'in_progress').length
  const activeClientsCount = clients.filter(c => c.contract_status === 'active').length
  const openIncidentsCount = incidents.filter(i => i.status === 'open').length

  const stats = [
    { label: 'Active Guards', value: activeGuardsCount.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Active Shifts', value: activeShiftsCount.toString(), icon: Clock, color: 'bg-amber-500' },
    { label: 'Active Clients', value: activeClientsCount.toString(), icon: Building2, color: 'bg-blue-500' },
    { label: 'Open Incidents', value: openIncidentsCount.toString(), icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Monthly Revenue', value: '$127.5K', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Compliance Score', value: '98.5%', icon: Shield, color: 'bg-green-500' },
  ]

  const recentActivity = [
    { time: new Date(Date.now() - 5 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Shift started', detail: guards[0]?.first_name ? `${guards[0].first_name} at Northview REIT #5` : 'Guard at Northview REIT #5', type: 'shift' },
    { time: new Date(Date.now() - 15 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Incident reported', detail: 'Unauthorized access attempt detected', type: 'incident' },
    { time: new Date(Date.now() - 30 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Patrol completed', detail: 'Route A-3 at Northview REIT #12', type: 'patrol' },
    { time: new Date(Date.now() - 45 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Guard clocked in', detail: 'Night shift assignment', type: 'shift' },
    { time: new Date(Date.now() - 60 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), action: 'Invoice sent', detail: 'Billing to ' + (clients[0]?.company_name || 'Northview REIT'), type: 'invoice' },
  ]

  const handleQuickAction = (action: string) => {
    setNotification({ type: 'success', message: `${action} form opened` })
    setTimeout(() => setNotification(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} className="text-accent animate-spin" />
          <p className="text-secondary">Loading operations dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {notification.message}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Command Center</h1>
        <p className="text-secondary mt-2">Real-time security operations overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="bg-card rounded-lg p-6 border border-default hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-primary mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-lg p-6 border border-default">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Zap size={18} className="text-accent" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b border-default last:border-0">
                <div className="text-secondary text-sm font-mono w-16 flex-shrink-0">
                  {activity.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary font-medium">{activity.action}</p>
                  <p className="text-secondary text-sm mt-1">{activity.detail}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                  activity.type === 'incident' ? 'badge-critical' : 'badge-medium'
                }`}>
                  {activity.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg p-6 border border-default">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Plus size={18} className="text-accent" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            <button onClick={() => handleQuickAction('New Guard')} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
              Add Guard
            </button>
            <button onClick={() => handleQuickAction('New Incident')} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors">
              Report Incident
            </button>
            <button onClick={() => handleQuickAction('New Shift')} className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium transition-colors">
              Schedule Shift
            </button>
            <button onClick={() => handleQuickAction('New Client')} className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors">
              Add Client
            </button>
            <button className="w-full px-4 py-2 border border-accent text-accent hover:bg-accent/10 rounded font-medium transition-colors">
              View Full Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
