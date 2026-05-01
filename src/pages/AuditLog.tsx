import { ScrollText, Calendar, User, Activity } from 'lucide-react'

export function AuditLog() {
  const logs = [
    {
      id: 1,
      user: 'John Smith',
      action: 'Created incident report',
      timestamp: '2026-05-01 14:32',
      resource: 'INC-2026-001',
    },
    {
      id: 2,
      user: 'Sarah Johnson',
      action: 'Updated guard schedule',
      timestamp: '2026-05-01 13:15',
      resource: 'Schedule-May-2026',
    },
    {
      id: 3,
      user: 'Mike Chen',
      action: 'Modified client contract',
      timestamp: '2026-05-01 11:45',
      resource: 'CNT-2025-042',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <ScrollText size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Audit Log</h1>
              <p className="text-secondary mt-1">System activity and changes tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-secondary rounded-lg border border-default p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Date Range</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">User</label>
            <input
              type="text"
              placeholder="Filter by user..."
              className="w-full px-3 py-2 bg-primary border border-default rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Action Type</label>
            <select className="w-full px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
              <option>All Actions</option>
              <option>Created</option>
              <option>Updated</option>
              <option>Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-secondary rounded-lg border border-default overflow-hidden">
        <table className="w-full">
          <thead className="bg-card border-b border-default">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">User</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Action</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Resource</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-card transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent bg-opacity-20 rounded-full flex items-center justify-center">
                      <User size={16} className="text-accent" />
                    </div>
                    <span className="text-primary text-sm font-medium">{log.user}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-secondary" />
                    <span className="text-secondary text-sm">{log.action}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-primary font-mono">{log.resource}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Calendar size={16} />
                    {log.timestamp}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
