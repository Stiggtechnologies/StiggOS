import React, { useState } from 'react'
import { CheckCircle, AlertCircle, Clock, FileText, Plus, Upload, X } from 'lucide-react'

const DEMO_COMPLIANCE = [
  // Licensing
  { id: 1, title: 'Alberta Security Guard License (Company)', category: 'Licensing', dueDate: '2026-06-15', status: 'Current', progress: 100, issuer: 'Alberta PSISA' },
  { id: 2, title: 'Jemal Hassan - Security Level 1', category: 'Licensing', dueDate: '2026-08-10', status: 'Current', progress: 100, issuer: 'Alberta PSISA' },
  { id: 3, title: 'Solomon Abdi - Security Level 1', category: 'Licensing', dueDate: '2026-09-22', status: 'Current', progress: 100, issuer: 'Alberta PSISA' },
  { id: 4, title: 'Jean Marie - Security Level 2', category: 'Licensing', dueDate: '2026-07-05', status: 'Current', progress: 100, issuer: 'Alberta PSISA' },
  { id: 5, title: 'Kanwal Singh - Security Level 2', category: 'Licensing', dueDate: '2026-05-30', status: 'Expiring Soon', progress: 100, issuer: 'Alberta PSISA' },

  // Training
  { id: 6, title: 'First Aid - All Guards', category: 'Training', dueDate: '2026-12-15', status: 'Current', progress: 100, issuer: 'Red Cross' },
  { id: 7, title: 'CPR Certification - All Guards', category: 'Training', dueDate: '2026-10-20', status: 'Current', progress: 100, issuer: 'Heart & Stroke' },
  { id: 8, title: 'De-escalation Training', category: 'Training', dueDate: '2026-08-30', status: 'In Progress', progress: 75, issuer: 'Stigg Training' },
  { id: 9, title: 'Use of Force Certification', category: 'Training', dueDate: '2026-09-15', status: 'In Progress', progress: 60, issuer: 'Alberta Justice' },

  // Insurance
  { id: 10, title: 'General Liability Insurance', category: 'Insurance', dueDate: '2026-07-15', status: 'Current', progress: 100, issuer: 'Intact Insurance' },
  { id: 11, title: 'Errors & Omissions Insurance', category: 'Insurance', dueDate: '2026-06-30', status: 'Expiring Soon', progress: 100, issuer: 'AIG' },
  { id: 12, title: 'Workers Compensation - Alberta', category: 'Insurance', dueDate: '2026-12-31', status: 'Current', progress: 100, issuer: 'WCB Alberta' },

  // Documentation
  { id: 13, title: 'Guard Background Checks', category: 'Documentation', dueDate: '2026-10-15', status: 'Current', progress: 100, issuer: 'RCMP' },
  { id: 14, title: 'Incident Report Forms - Monthly Audit', category: 'Documentation', dueDate: '2026-05-30', status: 'Overdue', progress: 40, issuer: 'Stigg' },
  { id: 15, title: 'PSISA Compliance Documentation', category: 'Documentation', dueDate: '2026-06-30', status: 'In Progress', progress: 80, issuer: 'Alberta' },

  // Health & Safety
  { id: 16, title: 'WHMIS Training - All Staff', category: 'Health & Safety', dueDate: '2026-05-15', status: 'Current', progress: 100, issuer: 'WorkSafeAB' },
  { id: 17, title: 'Workplace Violence Prevention', category: 'Health & Safety', dueDate: '2026-07-20', status: 'In Progress', progress: 70, issuer: 'Alberta Justice' },
]

export function Compliance() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Current':
        return { bg: 'bg-green-900/30', text: 'text-green-400', icon: CheckCircle }
      case 'In Progress':
        return { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: Clock }
      case 'Expiring Soon':
        return { bg: 'bg-amber-900/30', text: 'text-amber-400', icon: AlertCircle }
      case 'Overdue':
        return { bg: 'bg-red-900/30', text: 'text-red-400', icon: AlertCircle }
      default:
        return { bg: 'bg-secondary/30', text: 'text-secondary', icon: Clock }
    }
  }

  const categories = ['Licensing', 'Training', 'Insurance', 'Documentation', 'Health & Safety']
  const filteredItems = selectedCategory
    ? DEMO_COMPLIANCE.filter(item => item.category === selectedCategory)
    : DEMO_COMPLIANCE

  const stats = {
    current: DEMO_COMPLIANCE.filter(i => i.status === 'Current').length,
    inProgress: DEMO_COMPLIANCE.filter(i => i.status === 'In Progress').length,
    expiringSoon: DEMO_COMPLIANCE.filter(i => i.status === 'Expiring Soon').length,
    overdue: DEMO_COMPLIANCE.filter(i => i.status === 'Overdue').length,
  }

  const complianceScore = Math.round(
    (DEMO_COMPLIANCE.reduce((sum, item) => sum + item.progress, 0) / DEMO_COMPLIANCE.length)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Compliance & Licensing</h1>
        <p className="text-secondary mt-2">Track certifications, licenses, insurance, and regulatory requirements (Alberta PSISA)</p>
      </div>

      {/* Compliance Score */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Overall Compliance Score</p>
            <p className="text-4xl font-bold mt-2">{complianceScore}%</p>
            <p className="text-sm opacity-90 mt-2">{stats.current} items current, {stats.overdue} overdue</p>
          </div>
          <CheckCircle size={56} className="opacity-40" />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-green-500/30">
          <p className="text-green-400 text-sm font-semibold">Current</p>
          <p className="text-2xl font-bold text-green-400 mt-2">{stats.current}</p>
          <p className="text-secondary text-xs mt-1">items</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-blue-500/30">
          <p className="text-blue-400 text-sm font-semibold">In Progress</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{stats.inProgress}</p>
          <p className="text-secondary text-xs mt-1">items</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-amber-500/30">
          <p className="text-amber-400 text-sm font-semibold">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{stats.expiringSoon}</p>
          <p className="text-secondary text-xs mt-1">in 90 days</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-red-500/30">
          <p className="text-red-400 text-sm font-semibold">Overdue</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{stats.overdue}</p>
          <p className="text-secondary text-xs mt-1">action needed</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-card rounded-lg p-4 border border-default overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-blue-500 text-white'
                : 'bg-secondary hover:bg-secondary/80 text-primary'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-secondary hover:bg-secondary/80 text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Compliance Items */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const statusColor = getStatusColor(item.status)
          const StatusIcon = statusColor.icon
          const daysUntilDue = Math.ceil((new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div key={item.id} className="bg-card p-6 rounded-lg border border-default hover:border-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
                  <div className="flex items-center gap-4 mt-1 flex-wrap text-sm">
                    <p className="text-secondary">{item.category}</p>
                    <p className="text-secondary">Issuer: {item.issuer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusIcon size={20} className={statusColor.text} />
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.status === 'Current' ? 'bg-green-500' :
                      item.status === 'Expiring Soon' ? 'bg-amber-500' :
                      item.status === 'Overdue' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="text-secondary text-xs mt-2">{item.progress}% complete</p>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className={`text-sm ${
                  daysUntilDue < 0 ? 'text-red-400 font-semibold' :
                  daysUntilDue < 30 ? 'text-amber-400 font-semibold' :
                  'text-secondary'
                }`}>
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                  {daysUntilDue >= 0 && daysUntilDue <= 90 && ` (${daysUntilDue} days)`}
                  {daysUntilDue < 0 && ` (${Math.abs(daysUntilDue)} days overdue)`}
                </p>
                <div className="flex gap-2">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View Details</button>
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">Upload Doc</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alberta PSISA Requirements */}
      <div className="bg-card rounded-lg p-6 border border-blue-500/30">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-400" />
          Alberta PSISA Compliance
        </h3>
        <p className="text-secondary text-sm mb-4">
          Private Security and Investigative Services Act (PSISA) requirements for Alberta
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-primary font-medium text-sm">Company License Required</p>
              <p className="text-secondary text-xs">Private Security License for operations</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-primary font-medium text-sm">Individual Guard Licensing</p>
              <p className="text-secondary text-xs">Security Level 1, 2, or 3 certifications</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-primary font-medium text-sm">Background Checks</p>
              <p className="text-secondary text-xs">Criminal record checks and RCMP verification</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-primary font-medium text-sm">Incident Reporting</p>
              <p className="text-secondary text-xs">Mandatory reporting of significant incidents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Management */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Document Management</h3>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>
        <p className="text-secondary text-sm mb-4">Upload and store compliance documents (licenses, certificates, insurance, training records)</p>
        <div className="border-2 border-dashed border-default rounded-lg p-8 text-center hover:border-accent transition-colors">
          <FileText size={40} className="text-secondary mx-auto mb-2 opacity-50" />
          <p className="text-secondary text-sm">Drag and drop documents here or click to browse</p>
          <p className="text-secondary text-xs mt-1">PDF, JPG, PNG up to 10MB</p>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Upload Compliance Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Compliance Item</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary">
                  {DEMO_COMPLIANCE.map(item => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Document File</label>
                <div className="border-2 border-dashed border-default rounded p-6 text-center">
                  <p className="text-secondary text-sm">Click to upload or drag and drop</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium">Upload</button>
                <button onClick={() => setShowUploadModal(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
