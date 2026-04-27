import { useState } from 'react'
import { Shield, Search, Filter, Clock, User, Eye, Edit, Trash2, LogIn, LogOut, ArrowUpCircle, CheckCircle } from 'lucide-react'

const auditEntries = [
  { id: '1', user: 'admin@stigg.ca', action: 'create', entity_type: 'incident', entity_name: 'INC-2026-042 — Unauthorized Access', severity: 'warning', ip: '174.6.42.118', time: '2026-04-27 11:39 PM' },
  { id: '2', user: 'sarah.chen@stigg.ca', action: 'complete', entity_type: 'patrol', entity_name: 'Route C-1 at Avenue Living #8', severity: 'info', ip: '174.6.42.205', time: '2026-04-27 11:24 PM' },
  { id: '3', user: 'admin@stigg.ca', action: 'approve', entity_type: 'leave_request', entity_name: 'Priya Sharma — Sick Leave', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 10:15 PM' },
  { id: '4', user: 'admin@stigg.ca', action: 'update', entity_type: 'contract', entity_name: 'Northview REIT — Enhanced Tier', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 09:45 PM', changes: { monthly_value: { from: 48000, to: 52000 }, tier: { from: 'Essential', to: 'Enhanced' } } },
  { id: '5', user: 'marcus.t@stigg.ca', action: 'start', entity_type: 'patrol', entity_name: 'Route A-2 at Northview REIT #5', severity: 'info', ip: '174.6.42.190', time: '2026-04-27 09:00 PM' },
  { id: '6', user: 'admin@stigg.ca', action: 'create', entity_type: 'invoice', entity_name: 'INV-2026-024 — Mainstreet Equity', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 04:30 PM' },
  { id: '7', user: 'admin@stigg.ca', action: 'escalate', entity_type: 'incident', entity_name: 'INC-2026-041 — Property Damage', severity: 'critical', ip: '174.6.42.118', time: '2026-04-27 02:15 PM' },
  { id: '8', user: 'admin@stigg.ca', action: 'assign', entity_type: 'shift', entity_name: 'Night Shift — Daniel Okafor → Northview #12', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 01:00 PM' },
  { id: '9', user: 'admin@stigg.ca', action: 'export', entity_type: 'report', entity_name: 'March 2026 Security Summary — Northview', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 11:30 AM' },
  { id: '10', user: 'admin@stigg.ca', action: 'login', entity_type: 'session', entity_name: 'Web Dashboard', severity: 'info', ip: '174.6.42.118', time: '2026-04-27 09:00 AM' },
  { id: '11', user: 'jemal.a@stigg.ca', action: 'view', entity_type: 'schedule', entity_name: 'Weekly Schedule — Week 17', severity: 'info', ip: '174.6.42.210', time: '2026-04-26 08:45 PM' },
  { id: '12', user: 'admin@stigg.ca', action: 'delete', entity_type: 'proposal', entity_name: 'Draft Proposal — ABC Property Mgmt', severity: 'warning', ip: '174.6.42.118', time: '2026-04-26 05:00 PM' },
  { id: '13', user: 'admin@stigg.ca', action: 'update', entity_type: 'guard', entity_name: 'Daniel Okafor — Rate Change', severity: 'info', ip: '174.6.42.118', time: '2026-04-26 03:30 PM', changes: { hourly_rate: { from: 19.00, to: 20.00 } } },
  { id: '14', user: 'admin@stigg.ca', action: 'deny', entity_type: 'expense', entity_name: 'Mileage Claim — Marcus Thompson ($85.40)', severity: 'info', ip: '174.6.42.118', time: '2026-04-26 02:00 PM' },
  { id: '15', user: 'admin@stigg.ca', action: 'create', entity_type: 'alert_rule', entity_name: 'Missed Checkpoint — High Severity', severity: 'info', ip: '174.6.42.118', time: '2026-04-26 10:00 AM' },
]

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const actionIcon = (action: string) => {
    switch (action) {
      case 'create': return <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center"><Edit className="w-3 h-3 text-green-400" /></div>
      case 'update': return <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center"><Edit className="w-3 h-3 text-blue-400" /></div>
      case 'delete': return <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-400" /></div>
      case 'login': return <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center"><LogIn className="w-3 h-3 text-cyan-400" /></div>
      case 'logout': return <div className="w-6 h-6 rounded bg-slate-500/20 flex items-center justify-center"><LogOut className="w-3 h-3 text-slate-400" /></div>
      case 'view': return <div className="w-6 h-6 rounded bg-slate-500/20 flex items-center justify-center"><Eye className="w-3 h-3 text-slate-400" /></div>
      case 'export': return <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center"><ArrowUpCircle className="w-3 h-3 text-purple-400" /></div>
      case 'approve': case 'complete': return <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-green-400" /></div>
      case 'escalate': return <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center"><ArrowUpCircle className="w-3 h-3 text-red-400" /></div>
      default: return <div className="w-6 h-6 rounded bg-slate-500/20 flex items-center justify-center"><Clock className="w-3 h-3 text-slate-400" /></div>
    }
  }

  const filtered = auditEntries.filter(e => {
    if (searchQuery && !e.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.user.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterAction !== 'all' && e.action !== filterAction) return false
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-slate-400 mt-1">Immutable, tamper-proof activity trail for all system actions</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span>Append-only · Updates and deletes blocked</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Entries</p>
          <p className="text-2xl font-bold text-white mt-1">{auditEntries.length}</p>
          <p className="text-slate-400 text-xs mt-1">Last 48 hours</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Critical Actions</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{auditEntries.filter(e => e.severity === 'critical').length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Unique Users</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{new Set(auditEntries.map(e => e.user)).size}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Data Changes</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{auditEntries.filter(e => ['create', 'update', 'delete'].includes(e.action)).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="approve">Approve</option>
          <option value="escalate">Escalate</option>
          <option value="export">Export</option>
          <option value="view">View</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Audit Trail */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs text-slate-400 font-medium p-4">Time</th>
              <th className="text-left text-xs text-slate-400 font-medium p-4">User</th>
              <th className="text-left text-xs text-slate-400 font-medium p-4">Action</th>
              <th className="text-left text-xs text-slate-400 font-medium p-4">Entity</th>
              <th className="text-left text-xs text-slate-400 font-medium p-4">IP Address</th>
              <th className="text-left text-xs text-slate-400 font-medium p-4">Severity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${entry.severity === 'critical' ? 'bg-red-500/5' : entry.severity === 'warning' ? 'bg-yellow-500/5' : ''}`}>
                <td className="p-4">
                  <p className="text-xs text-slate-400 whitespace-nowrap">{entry.time}</p>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-sm text-white">{entry.user}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {actionIcon(entry.action)}
                    <span className="text-sm text-slate-300">{entry.action}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-sm text-white">{entry.entity_name}</p>
                    <p className="text-xs text-slate-500">{entry.entity_type}</p>
                  </div>
                </td>
                <td className="p-4">
                  <code className="text-xs text-slate-400 font-mono">{entry.ip}</code>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    entry.severity === 'critical' ? 'bg-red-400/10 text-red-400' :
                    entry.severity === 'warning' ? 'bg-yellow-400/10 text-yellow-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {entry.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
