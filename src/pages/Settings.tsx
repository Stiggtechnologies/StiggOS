import React, { useState } from 'react'
import { User, Shield, Zap, Bell, Save, CreditCard, LogOut, Eye, EyeOff, Plus, X, Copy, Check } from 'lucide-react'

const DEMO_USERS = [
  { id: 1, name: 'Preston Williams', email: 'preston@stigg.ca', role: 'admin', joinedDate: '2022-06-01' },
  { id: 2, name: 'Operations Manager', email: 'manager@stigg.ca', role: 'manager', joinedDate: '2023-01-15' },
  { id: 3, name: 'Dispatch Support', email: 'dispatch@stigg.ca', role: 'dispatcher', joinedDate: '2023-06-01' },
]

const DEMO_INTEGRATIONS = [
  { id: 'supabase', name: 'Supabase', status: 'connected', description: 'Database & authentication', icon: 'cube' },
  { id: 'maps', name: 'Google Maps', status: 'connected', description: 'Route planning & GPS tracking', icon: 'map' },
  { id: 'slack', name: 'Slack', status: 'notConnected', description: 'Team notifications', icon: 'chat' },
  { id: 'qb', name: 'QuickBooks', status: 'notConnected', description: 'Financial & billing', icon: 'document' },
]

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [showAddUser, setShowAddUser] = useState(false)
  const [copied, setCopied] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Organization', icon: User },
    { id: 'users', label: 'User Management', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-secondary mt-2">Manage organization, users, integrations, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-default overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-card rounded-lg p-6 border border-default space-y-6">
          <div>
            <label className="block text-primary font-medium mb-2">Organization Name</label>
            <input
              type="text"
              defaultValue="Stigg Security Inc."
              className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-primary font-medium mb-2">Business Number</label>
            <input
              type="text"
              defaultValue="123-456-7890"
              className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-primary font-medium mb-2">Email</label>
              <input
                type="email"
                defaultValue="admin@stigg.ca"
                className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-primary font-medium mb-2">Phone</label>
              <input
                type="tel"
                defaultValue="+1 (403) 555-0100"
                className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2">Address</label>
            <input
              type="text"
              defaultValue="123 Security Ave, Calgary, AB T2E 0K4"
              className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-primary font-medium mb-2">Logo</label>
            <div className="border-2 border-dashed border-default rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <p className="text-secondary text-sm">Drag and drop or click to upload</p>
              <p className="text-secondary text-xs mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
            <Save size={18} />
            Save Changes
          </button>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User List */}
          <div className="bg-card rounded-lg border border-default">
            <div className="p-6 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Team Members</h3>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Invite User
              </button>
            </div>

            <div className="divide-y divide-default">
              {DEMO_USERS.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div>
                    <p className="text-primary font-medium">{user.name}</p>
                    <p className="text-secondary text-sm">{user.email}</p>
                    <p className="text-secondary text-xs mt-1">Joined {new Date(user.joinedDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    <button className="text-secondary hover:text-red-400 text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-card rounded-lg p-6 border border-default">
            <h3 className="text-lg font-semibold text-primary mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded">
                <div>
                  <p className="text-primary font-medium">Two-Factor Authentication</p>
                  <p className="text-secondary text-sm text-xs mt-1">Add extra security layer to your account</p>
                </div>
                <button className="px-3 py-1.5 border border-blue-500 text-blue-400 hover:bg-blue-500/20 rounded text-sm font-medium transition-colors">
                  Enable 2FA
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded">
                <div>
                  <p className="text-primary font-medium">Session Management</p>
                  <p className="text-secondary text-sm text-xs mt-1">Active sessions: 2</p>
                </div>
                <button className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/20 rounded text-sm font-medium transition-colors">
                  Sign Out All
                </button>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-card rounded-lg p-6 border border-default">
            <h3 className="text-lg font-semibold text-primary mb-4">API Keys</h3>
            <p className="text-secondary text-sm mb-4">Manage API keys for programmatic access</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded border border-default/50">
                <div className="flex-1 min-w-0">
                  <p className="text-primary font-medium text-sm">Production API Key</p>
                  <p className="text-secondary text-xs mt-1">stigg_prod_sk_abc123def456ghi789jkl...</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('stigg_prod_sk_abc123def456ghi789jkl')
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 text-xs"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors">
              Generate New Key
            </button>
          </div>

          {/* Audit Log */}
          <div className="bg-card rounded-lg p-6 border border-default">
            <h3 className="text-lg font-semibold text-primary mb-4">Recent Activity</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[
                { action: 'Logged in', user: 'Preston Williams', time: '2 hours ago' },
                { action: 'Updated settings', user: 'Preston Williams', time: '5 hours ago' },
                { action: 'Added user', user: 'Preston Williams', time: '1 day ago' },
              ].map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 text-sm border-b border-default/30 last:border-0">
                  <div>
                    <p className="text-primary">{log.action}</p>
                    <p className="text-secondary text-xs">{log.user}</p>
                  </div>
                  <p className="text-secondary text-xs">{log.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          {DEMO_INTEGRATIONS.map(integration => (
            <div key={integration.id} className="bg-card rounded-lg p-6 border border-default flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">{integration.name}</h3>
                <p className="text-secondary text-sm">{integration.description}</p>
              </div>
              {integration.status === 'connected' ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    Connected
                  </div>
                  <button className="px-4 py-2 border border-default text-secondary hover:bg-secondary rounded font-medium text-sm transition-colors">
                    Manage
                  </button>
                </div>
              ) : (
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-card rounded-lg p-6 border border-default space-y-4">
          <div className="text-sm text-secondary mb-4">Configure notification preferences for different event types</div>

          {[
            { event: 'Critical Incidents', description: 'Security incidents requiring immediate attention', channels: ['Email', 'SMS', 'Push'] },
            { event: 'Shift Changes', description: 'Updates to guard scheduling', channels: ['Email', 'Push'] },
            { event: 'Guard Status Updates', description: 'Real-time patrol & checkpoint updates', channels: ['Email', 'Push'] },
            { event: 'Client Messages', description: 'Communications from clients', channels: ['Email', 'SMS', 'Push'] },
            { event: 'Compliance Alerts', description: 'License and certification expirations', channels: ['Email'] },
            { event: 'Weekly Reports', description: 'Scheduled summary reports', channels: ['Email'] },
          ].map((item, idx) => (
            <div key={idx} className="border border-default rounded p-4 space-y-3">
              <div>
                <p className="text-primary font-medium">{item.event}</p>
                <p className="text-secondary text-sm">{item.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {['Email', 'SMS', 'Push'].map(channel => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={item.channels.includes(channel)}
                      className="w-4 h-4"
                    />
                    <span className="text-secondary text-sm">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors mt-4">
            <Save size={18} />
            Save Preferences
          </button>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Current Plan</p>
                <p className="text-3xl font-bold mt-2">Professional</p>
                <p className="text-sm opacity-90 mt-2">$2,499/month • 10 guards • Unlimited sites</p>
              </div>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition-colors">
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg p-6 border border-default">
              <p className="text-secondary text-sm">Active Guards</p>
              <p className="text-2xl font-bold text-primary mt-2">8 / 10</p>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
                <div className="h-full bg-blue-500" style={{ width: '80%' }} />
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-default">
              <p className="text-secondary text-sm">Patrol Hours (This Month)</p>
              <p className="text-2xl font-bold text-primary mt-2">1,240 / 2,000</p>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
                <div className="h-full bg-green-500" style={{ width: '62%' }} />
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border border-default">
              <p className="text-secondary text-sm">API Calls (This Month)</p>
              <p className="text-2xl font-bold text-primary mt-2">45,230 / 100,000</p>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
                <div className="h-full bg-green-500" style={{ width: '45%' }} />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-lg p-6 border border-default">
            <h3 className="text-lg font-semibold text-primary mb-4">Payment Method</h3>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/20 rounded border border-default">
                <p className="text-primary font-medium">Visa ending in 4242</p>
                <p className="text-secondary text-sm">Expires 12/26</p>
              </div>
              <button className="px-4 py-2 border border-default text-primary hover:bg-secondary rounded font-medium transition-colors">
                Update Payment Method
              </button>
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-card rounded-lg p-6 border border-default">
            <h3 className="text-lg font-semibold text-primary mb-4">Billing History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="text-left py-2 px-2 text-secondary">Date</th>
                    <th className="text-left py-2 px-2 text-secondary">Description</th>
                    <th className="text-right py-2 px-2 text-secondary">Amount</th>
                    <th className="text-right py-2 px-2 text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-default">
                    <td className="py-2 px-2 text-primary">Apr 1, 2026</td>
                    <td className="py-2 px-2 text-primary">Monthly Subscription</td>
                    <td className="py-2 px-2 text-primary text-right">$2,499.00</td>
                    <td className="py-2 px-2 text-right"><span className="text-green-400 text-xs">Paid</span></td>
                  </tr>
                  <tr className="border-b border-default">
                    <td className="py-2 px-2 text-primary">Mar 1, 2026</td>
                    <td className="py-2 px-2 text-primary">Monthly Subscription</td>
                    <td className="py-2 px-2 text-primary text-right">$2,499.00</td>
                    <td className="py-2 px-2 text-right"><span className="text-green-400 text-xs">Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Invite User</h3>
              <button onClick={() => setShowAddUser(false)} className="p-1 hover:bg-secondary rounded">
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
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium">Send Invite</button>
                <button onClick={() => setShowAddUser(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
