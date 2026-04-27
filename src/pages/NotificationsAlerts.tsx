import { useState } from 'react'
import { Bell, AlertTriangle, CheckCircle, Clock, Shield, DollarSign, Users, Settings, X, Filter, BellRing, Zap } from 'lucide-react'

type AlertTab = 'all' | 'operations' | 'compliance' | 'financial' | 'hr'

const notifications = [
  { id: '1', title: 'Missed Checkpoint Alert', message: 'Guard Marcus Thompson missed checkpoint B-3 at Northview REIT #5 during patrol route A-2.', severity: 'high', category: 'operations', time: '2 min ago', read: false, action: 'View Patrol' },
  { id: '2', title: 'Certificate Expiring Soon', message: 'Jemal Abera\'s Standard First Aid + CPR certification expired on April 1, 2026. Renewal required immediately.', severity: 'critical', category: 'compliance', time: '15 min ago', read: false, action: 'View Training' },
  { id: '3', title: 'Invoice Overdue - 45 Days', message: 'Invoice #INV-2026-018 for Mainstreet Equity ($12,400) is now 45 days overdue.', severity: 'high', category: 'financial', time: '1 hr ago', read: false, action: 'View Invoice' },
  { id: '4', title: 'Shift Coverage Gap Detected', message: 'No guard assigned for overnight shift (11PM-7AM) at Avenue Living #8 on April 28, 2026.', severity: 'high', category: 'operations', time: '2 hrs ago', read: false, action: 'Assign Guard' },
  { id: '5', title: 'Patrol Completed Successfully', message: 'Sarah Chen completed patrol route C-1 at Avenue Living #8. All 8 checkpoints verified. Compliance: 100%.', severity: 'info', category: 'operations', time: '3 hrs ago', read: true },
  { id: '6', title: 'Leave Request Pending', message: 'Marcus Thompson has submitted a vacation request for May 15-22. Awaiting approval.', severity: 'low', category: 'hr', time: '4 hrs ago', read: true, action: 'Review Request' },
  { id: '7', title: 'New Incident Reported', message: 'Unauthorized access attempt detected at Northview REIT #12 parking structure. Guard Daniel Okafor responding.', severity: 'high', category: 'operations', time: '5 hrs ago', read: true, action: 'View Incident' },
  { id: '8', title: 'Contract Renewal Due', message: 'Northview Residential REIT contract expires in 30 days (May 27, 2026). Auto-renewal is enabled.', severity: 'medium', category: 'financial', time: '6 hrs ago', read: true },
  { id: '9', title: 'Equipment Maintenance Due', message: 'Patrol vehicle Unit 1 is due for scheduled maintenance (oil change, brake inspection).', severity: 'medium', category: 'operations', time: '8 hrs ago', read: true, action: 'Schedule Service' },
  { id: '10', title: 'Compliance Score Updated', message: 'Monthly compliance score for Avenue Living portfolio: 98.5% (+0.3% from March). Target: 95%.', severity: 'info', category: 'compliance', time: '1 day ago', read: true },
  { id: '11', title: 'Payroll Processing Complete', message: 'Payroll for period Apr 1-14 has been processed. Total net: $21,618. 7 employees paid.', severity: 'info', category: 'financial', time: '1 day ago', read: true },
  { id: '12', title: 'Guard Performance Alert', message: 'Daniel Okafor patrol completion rate dropped to 82% this week (target: 95%). Review recommended.', severity: 'medium', category: 'hr', time: '2 days ago', read: true, action: 'View Performance' },
]

const alertRules = [
  { name: 'Missed Checkpoint', trigger: 'missed_checkpoint', severity: 'high', active: true, cooldown: 30 },
  { name: 'Late Patrol Start', trigger: 'late_patrol_start', severity: 'medium', active: true, cooldown: 60 },
  { name: 'Guard No-Show', trigger: 'guard_no_show', severity: 'critical', active: true, cooldown: 15 },
  { name: 'Certificate Expiring (30 days)', trigger: 'cert_expiring', severity: 'high', active: true, cooldown: 1440 },
  { name: 'Invoice Overdue (30+ days)', trigger: 'invoice_overdue', severity: 'high', active: true, cooldown: 1440 },
  { name: 'Shift Coverage Gap', trigger: 'shift_coverage_gap', severity: 'high', active: true, cooldown: 120 },
  { name: 'Overtime Threshold (>40hrs)', trigger: 'overtime_threshold', severity: 'medium', active: true, cooldown: 10080 },
  { name: 'Incident Auto-Escalation', trigger: 'incident_escalation', severity: 'critical', active: true, cooldown: 5 },
  { name: 'Contract Expiring (30 days)', trigger: 'contract_expiring', severity: 'medium', active: true, cooldown: 10080 },
  { name: 'Compliance Score Drop', trigger: 'compliance_score_drop', severity: 'medium', active: false, cooldown: 10080 },
]

export default function NotificationsAlerts() {
  const [activeTab, setActiveTab] = useState<AlertTab>('all')
  const [showRules, setShowRules] = useState(false)

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.category === activeTab)

  const unreadCount = notifications.filter(n => !n.read).length

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'high': return <BellRing className="w-4 h-4 text-orange-400" />
      case 'medium': return <Bell className="w-4 h-4 text-yellow-400" />
      case 'low': return <Bell className="w-4 h-4 text-blue-400" />
      default: return <CheckCircle className="w-4 h-4 text-green-400" />
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-500/5'
      case 'high': return 'border-l-orange-500 bg-orange-500/5'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-blue-500'
      default: return 'border-l-green-500'
    }
  }

  const categoryIcon = (category: string) => {
    switch (category) {
      case 'operations': return <Shield className="w-3.5 h-3.5" />
      case 'compliance': return <CheckCircle className="w-3.5 h-3.5" />
      case 'financial': return <DollarSign className="w-3.5 h-3.5" />
      case 'hr': return <Users className="w-3.5 h-3.5" />
      default: return <Bell className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications & Alerts</h1>
          <p className="text-slate-400 mt-1">Real-time operational alerts and notification center</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Alert Rules
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <CheckCircle className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Unread', count: unreadCount, color: 'text-white', bg: 'bg-blue-500/20' },
          { label: 'Critical', count: notifications.filter(n => n.severity === 'critical').length, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'High', count: notifications.filter(n => n.severity === 'high').length, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { label: 'Medium', count: notifications.filter(n => n.severity === 'medium').length, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Info', count: notifications.filter(n => n.severity === 'info').length, color: 'text-green-400', bg: 'bg-green-500/20' },
        ].map(item => (
          <div key={item.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-slate-400 text-xs mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Alert Rules Panel */}
      {showRules && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Alert Rules Configuration</h3>
            <button onClick={() => setShowRules(false)}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
          </div>
          <div className="space-y-2">
            {alertRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {severityIcon(rule.severity)}
                  <div>
                    <p className="text-white text-sm">{rule.name}</p>
                    <p className="text-slate-500 text-xs">Trigger: {rule.trigger} · Cooldown: {rule.cooldown >= 1440 ? `${rule.cooldown / 1440}d` : rule.cooldown >= 60 ? `${rule.cooldown / 60}h` : `${rule.cooldown}m`}</p>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full flex items-center cursor-pointer transition-colors ${rule.active ? 'bg-blue-500 justify-end' : 'bg-slate-600 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'all' as AlertTab, label: 'All', count: notifications.length },
          { id: 'operations' as AlertTab, label: 'Operations', count: notifications.filter(n => n.category === 'operations').length },
          { id: 'compliance' as AlertTab, label: 'Compliance', count: notifications.filter(n => n.category === 'compliance').length },
          { id: 'financial' as AlertTab, label: 'Financial', count: notifications.filter(n => n.category === 'financial').length },
          { id: 'hr' as AlertTab, label: 'HR', count: notifications.filter(n => n.category === 'hr').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.map(n => (
          <div
            key={n.id}
            className={`bg-slate-800 rounded-xl border border-slate-700 p-4 border-l-4 ${severityColor(n.severity)} ${!n.read ? 'ring-1 ring-blue-500/30' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {severityIcon(n.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-medium ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h4>
                    {!n.read && <div className="w-2 h-2 bg-blue-400 rounded-full" />}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {categoryIcon(n.category)}
                      {n.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {n.time}
                    </span>
                  </div>
                </div>
              </div>
              {n.action && (
                <button className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 whitespace-nowrap ml-4">
                  {n.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
