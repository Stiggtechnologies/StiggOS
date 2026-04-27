import React, { useState } from 'react'
import { Eye, Settings, Share2, Lock, Download, Plus, Users, TrendingUp, X } from 'lucide-react'

const DEMO_CLIENTS = [
  { id: 1, name: 'Northview REIT', status: 'active', users: 3, properties: 6, avgScore: 94 },
  { id: 2, name: 'Mainstreet Equity', status: 'active', users: 2, properties: 4, avgScore: 87 },
  { id: 3, name: 'Canadian Tire', status: 'active', users: 1, properties: 2, avgScore: 91 },
]

const DEMO_PORTALS: Record<number, any> = {
  1: {
    properties: [
      { id: 'nv-5', name: 'Northview REIT #5', patrols: 12, incidents: 0, kpi: 96 },
      { id: 'nv-7', name: 'Northview REIT #7', patrols: 11, incidents: 1, kpi: 92 },
      { id: 'nv-12', name: 'Northview REIT #12', patrols: 13, incidents: 0, kpi: 98 },
      { id: 'nv-15', name: 'Northview REIT #15', patrols: 10, incidents: 2, kpi: 88 },
      { id: 'nv-20', name: 'Northview REIT #20', patrols: 12, incidents: 0, kpi: 94 },
      { id: 'nv-24', name: 'Northview REIT #24', patrols: 9, incidents: 1, kpi: 90 },
    ],
    incidents: [
      { date: '2026-04-24', property: 'Northview REIT #7', type: 'False Alarm', severity: 'low' },
      { date: '2026-04-22', property: 'Northview REIT #15', type: 'Unauthorized Access', severity: 'high' },
      { date: '2026-04-20', property: 'Northview REIT #15', type: 'Maintenance Issue', severity: 'medium' },
    ],
    portals: [
      { user: 'John Smith', role: 'Admin', email: 'john@northview.ca', lastAccess: '2 hours ago' },
      { user: 'Sarah Miller', role: 'Manager', email: 'sarah@northview.ca', lastAccess: '5 hours ago' },
      { user: 'Mike Johnson', role: 'Viewer', email: 'mike@northview.ca', lastAccess: '1 day ago' },
    ],
  },
  2: {
    properties: [
      { id: 'me-3', name: 'Mainstreet Equity #3', patrols: 10, incidents: 0, kpi: 89 },
      { id: 'me-8', name: 'Mainstreet Equity #8', patrols: 11, incidents: 1, kpi: 85 },
      { id: 'me-14', name: 'Mainstreet Equity #14', patrols: 9, incidents: 0, kpi: 88 },
      { id: 'me-19', name: 'Mainstreet Equity #19', patrols: 8, incidents: 0, kpi: 86 },
    ],
    incidents: [
      { date: '2026-04-23', property: 'Mainstreet Equity #8', type: 'Fire Alarm', severity: 'medium' },
    ],
    portals: [
      { user: 'Jennifer Lee', role: 'Admin', email: 'jen@mainstreet.ca', lastAccess: '3 hours ago' },
      { user: 'Robert Clark', role: 'Viewer', email: 'robert@mainstreet.ca', lastAccess: '2 days ago' },
    ],
  },
}

export function ClientPortal() {
  const [selectedClient, setSelectedClient] = useState(1)
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showPortalModal, setShowPortalModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)

  const currentClient = DEMO_CLIENTS.find(c => c.id === selectedClient)!
  const currentPortal = DEMO_PORTALS[selectedClient]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Client Portal</h1>
        <p className="text-secondary mt-2">White-label portal for client access and self-service</p>
      </div>

      {/* Client Selector */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <label className="block text-primary font-medium mb-3">Select Client</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(Number(e.target.value))}
          className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
        >
          {DEMO_CLIENTS.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.properties} properties)
            </option>
          ))}
        </select>
      </div>

      {/* Portal Preview */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-6 border border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{currentClient.name} Portal Preview</h2>
            <p className="text-slate-400 text-sm mt-1">What your client sees in their portal</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-400 text-sm font-medium">Live</span>
          </div>
        </div>

        {/* Portal Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Properties</p>
            <p className="text-white text-2xl font-bold mt-1">{currentClient.properties}</p>
          </div>
          <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Avg KPI Score</p>
            <p className="text-white text-2xl font-bold mt-1">{currentClient.avgScore}%</p>
          </div>
          <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Active Users</p>
            <p className="text-white text-2xl font-bold mt-1">{currentClient.users}</p>
          </div>
          <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
            <p className="text-slate-400 text-xs">Total Patrols</p>
            <p className="text-white text-2xl font-bold mt-1">{currentPortal.properties.reduce((sum: number, p: any) => sum + p.patrols, 0)}</p>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Client Properties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentPortal.properties.map((prop: any) => (
            <div key={prop.id} className="bg-card rounded-lg p-4 border border-default">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-primary font-medium">{prop.name}</p>
                  <p className="text-secondary text-xs">KPI Score: <span className="text-green-400 font-semibold">{prop.kpi}%</span></p>
                </div>
                {prop.incidents === 0 ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                ) : (
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-secondary/30 rounded p-2">
                  <p className="text-secondary text-xs">Patrols (30d)</p>
                  <p className="text-primary font-semibold">{prop.patrols}</p>
                </div>
                <div className="bg-secondary/30 rounded p-2">
                  <p className="text-secondary text-xs">Incidents (30d)</p>
                  <p className={prop.incidents === 0 ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'}>{prop.incidents}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Generation */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Generate Reports</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            {(['daily', 'weekly', 'monthly'] as const).map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-2 rounded font-medium transition-colors capitalize ${
                  reportType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary hover:bg-secondary/80 text-primary'
                }`}
              >
                {type} Report
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
              <Download size={18} />
              PDF
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
              <Download size={18} />
              Excel
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 text-primary rounded font-medium transition-colors">
              <Share2 size={18} />
              Email
            </button>
          </div>
        </div>
      </div>

      {/* Incident Log */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Recent Incidents</h3>
        <div className="space-y-2">
          {currentPortal.incidents.length === 0 ? (
            <p className="text-secondary text-sm py-4">No incidents reported</p>
          ) : (
            currentPortal.incidents.map((inc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-default rounded hover:bg-secondary/20">
                <div className="flex-1">
                  <p className="text-primary font-medium">{inc.property}</p>
                  <p className="text-secondary text-sm">{inc.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    inc.severity === 'high' ? 'bg-red-900/30 text-red-400' :
                    inc.severity === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                  </span>
                  <p className="text-secondary text-xs">{inc.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Portal Access Management */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Portal Access Management</h3>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
        <div className="space-y-2">
          {currentPortal.portals.map((user: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-default rounded">
              <div>
                <p className="text-primary font-medium">{user.user}</p>
                <p className="text-secondary text-xs">{user.email}</p>
                <p className="text-secondary text-xs">Last access: {user.lastAccess}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
                  {user.role}
                </span>
                <button className="text-secondary hover:text-red-400 text-sm">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portal Customization */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Portal Customization</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-primary text-sm font-medium mb-2">Logo Upload</label>
            <div className="border-2 border-dashed border-default rounded-lg p-8 text-center hover:border-accent transition-colors">
              <p className="text-secondary text-sm">Drag and drop or click to upload</p>
              <p className="text-secondary text-xs mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>
          <div>
            <label className="block text-primary text-sm font-medium mb-2">Primary Color</label>
            <div className="flex gap-2">
              <input type="color" defaultValue="#3b82f6" className="w-12 h-10 rounded cursor-pointer" />
              <input type="text" defaultValue="#3b82f6" className="flex-1 px-3 py-2 bg-secondary rounded border border-default text-primary" />
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
            Save Customization
          </button>
        </div>
      </div>

      {/* Portal Preview Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full max-h-96 overflow-auto">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Portal Preview</h3>
              <button onClick={() => setShowPortalModal(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-secondary">
              <p>Full portal preview would display here with interactive dashboard, patrol maps, and incident reports.</p>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Add Portal User</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Email Address</label>
                <input type="email" placeholder="user@example.com" className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Role</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary">
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Viewer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium">Add User</button>
                <button onClick={() => setShowUserModal(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
