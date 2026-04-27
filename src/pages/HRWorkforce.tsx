import { useState } from 'react'
import { Users, GraduationCap, ClipboardCheck, Calendar, DollarSign, Star, Plus, Search, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

type HRTab = 'employees' | 'training' | 'onboarding' | 'leave' | 'payroll' | 'reviews'

const employees = [
  { id: '1', name: 'Marcus Thompson', role: 'guard', type: 'full_time', status: 'active', hire_date: '2024-03-15', rate: 22.50, site: 'Northview REIT #5', certs: 3, expiring: 0 },
  { id: '2', name: 'Jemal Abera', role: 'guard', type: 'full_time', status: 'active', hire_date: '2024-06-01', rate: 21.00, site: 'Mainstreet Equity #2', certs: 2, expiring: 1 },
  { id: '3', name: 'Sarah Chen', role: 'supervisor', type: 'full_time', status: 'active', hire_date: '2023-11-20', rate: 28.00, site: 'Avenue Living #8', certs: 5, expiring: 0 },
  { id: '4', name: 'Daniel Okafor', role: 'guard', type: 'part_time', status: 'active', hire_date: '2025-01-10', rate: 20.00, site: 'Northview REIT #12', certs: 2, expiring: 0 },
  { id: '5', name: 'Priya Sharma', role: 'guard', type: 'full_time', status: 'on_leave', hire_date: '2024-09-05', rate: 21.50, site: 'Unassigned', certs: 3, expiring: 1 },
  { id: '6', name: 'Tyler Brooks', role: 'guard', type: 'casual', status: 'applicant', hire_date: '', rate: 0, site: 'N/A', certs: 0, expiring: 0 },
  { id: '7', name: 'Ahmed Hassan', role: 'trainer', type: 'full_time', status: 'active', hire_date: '2023-08-15', rate: 30.00, site: 'HQ', certs: 6, expiring: 0 },
  { id: '8', name: 'Lisa Fontaine', role: 'dispatcher', type: 'full_time', status: 'active', hire_date: '2024-02-01', rate: 25.00, site: 'HQ', certs: 2, expiring: 0 },
]

const trainingRecords = [
  { employee: 'Marcus Thompson', training: 'Alberta Security License', category: 'security_license', status: 'completed', expiry: '2026-03-15', score: 92 },
  { employee: 'Marcus Thompson', training: 'Standard First Aid + CPR', category: 'first_aid', status: 'completed', expiry: '2027-01-10', score: 88 },
  { employee: 'Marcus Thompson', training: 'Use of Force', category: 'use_of_force', status: 'completed', expiry: '2026-08-20', score: 95 },
  { employee: 'Jemal Abera', training: 'Alberta Security License', category: 'security_license', status: 'completed', expiry: '2026-06-01', score: 85 },
  { employee: 'Jemal Abera', training: 'Standard First Aid + CPR', category: 'first_aid', status: 'expired', expiry: '2026-04-01', score: 80 },
  { employee: 'Sarah Chen', training: 'Alberta Security License', category: 'security_license', status: 'completed', expiry: '2027-11-20', score: 97 },
  { employee: 'Sarah Chen', training: 'De-Escalation Techniques', category: 'de_escalation', status: 'completed', expiry: '2027-05-15', score: 94 },
  { employee: 'Priya Sharma', training: 'Fire Safety', category: 'fire_safety', status: 'completed', expiry: '2026-05-10', score: 90 },
  { employee: 'Daniel Okafor', training: 'Alberta Security License', category: 'security_license', status: 'in_progress', expiry: '', score: 0 },
  { employee: 'Tyler Brooks', training: 'Alberta Security License', category: 'security_license', status: 'pending', expiry: '', score: 0 },
]

const onboardingItems = [
  { employee: 'Tyler Brooks', items: [
    { name: 'Background Check', category: 'background_check', completed: false, due: '2026-05-05' },
    { name: 'Security License Application', category: 'documentation', completed: false, due: '2026-05-10' },
    { name: 'Uniform Fitting', category: 'uniform', completed: false, due: '2026-05-12' },
    { name: 'Site Orientation - Northview', category: 'orientation', completed: false, due: '2026-05-15' },
    { name: 'Radio Training', category: 'equipment', completed: false, due: '2026-05-15' },
    { name: 'Policy Manual Review', category: 'documentation', completed: false, due: '2026-05-08' },
  ]},
]

const leaveRequests = [
  { employee: 'Priya Sharma', type: 'sick', start: '2026-04-20', end: '2026-04-30', hours: 80, status: 'approved' },
  { employee: 'Marcus Thompson', type: 'vacation', start: '2026-05-15', end: '2026-05-22', hours: 56, status: 'pending' },
  { employee: 'Sarah Chen', type: 'personal', start: '2026-05-02', end: '2026-05-02', hours: 8, status: 'approved' },
  { employee: 'Daniel Okafor', type: 'statutory_holiday', start: '2026-05-18', end: '2026-05-18', hours: 8, status: 'approved' },
]

const payrollSummary = {
  currentPeriod: 'Apr 14 - Apr 27, 2026',
  status: 'processing',
  totalGross: 28450.00,
  totalDeductions: 6832.00,
  totalNet: 21618.00,
  employeeCount: 7,
  totalHours: 1120,
  overtimeHours: 24,
}

export default function HRWorkforce() {
  const [activeTab, setActiveTab] = useState<HRTab>('employees')
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = [
    { id: 'employees' as HRTab, label: 'Employees', icon: Users, count: employees.length },
    { id: 'training' as HRTab, label: 'Training', icon: GraduationCap, count: trainingRecords.length },
    { id: 'onboarding' as HRTab, label: 'Onboarding', icon: ClipboardCheck, count: 1 },
    { id: 'leave' as HRTab, label: 'Leave', icon: Calendar, count: leaveRequests.filter(l => l.status === 'pending').length },
    { id: 'payroll' as HRTab, label: 'Payroll', icon: DollarSign },
    { id: 'reviews' as HRTab, label: 'Reviews', icon: Star },
  ]

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': case 'completed': case 'approved': case 'paid': return 'text-green-400 bg-green-400/10'
      case 'applicant': case 'pending': case 'in_progress': case 'processing': return 'text-yellow-400 bg-yellow-400/10'
      case 'on_leave': case 'expiring': return 'text-blue-400 bg-blue-400/10'
      case 'expired': case 'denied': case 'terminated': case 'failed': return 'text-red-400 bg-red-400/10'
      default: return 'text-slate-400 bg-slate-400/10'
    }
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'supervisor': return 'text-purple-400 bg-purple-400/10'
      case 'manager': return 'text-blue-400 bg-blue-400/10'
      case 'trainer': return 'text-cyan-400 bg-cyan-400/10'
      case 'dispatcher': return 'text-orange-400 bg-orange-400/10'
      case 'admin': return 'text-red-400 bg-red-400/10'
      default: return 'text-slate-400 bg-slate-400/10'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">HR &amp; Workforce</h1>
          <p className="text-slate-400 mt-1">Employee management, training, payroll, and performance</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Employees</p>
          <p className="text-2xl font-bold text-white mt-1">{employees.length}</p>
          <p className="text-green-400 text-xs mt-1">{employees.filter(e => e.status === 'active').length} active</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Certs Expiring</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{trainingRecords.filter(t => t.status === 'expired').length}</p>
          <p className="text-yellow-400 text-xs mt-1">Needs renewal</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">On Leave</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{employees.filter(e => e.status === 'on_leave').length}</p>
          <p className="text-slate-400 text-xs mt-1">{leaveRequests.filter(l => l.status === 'pending').length} pending requests</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Applicants</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{employees.filter(e => e.status === 'applicant').length}</p>
          <p className="text-slate-400 text-xs mt-1">In pipeline</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees, training records..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Employee</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Role</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Type</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Site</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Rate</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Certs</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).map(emp => (
                <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-medium">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{emp.name}</p>
                        <p className="text-slate-500 text-xs">{emp.hire_date ? `Since ${emp.hire_date}` : 'Not hired'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${roleColor(emp.role)}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{emp.type.replace('_', ' ')}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(emp.status)}`}>
                      {emp.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{emp.site}</td>
                  <td className="p-4 text-sm text-white font-medium">{emp.rate > 0 ? `$${emp.rate.toFixed(2)}/hr` : '\u2014'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white">{emp.certs}</span>
                      {emp.expiring > 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Employee</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Training</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Category</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Expiry</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {trainingRecords.map((t, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4 text-sm text-white">{t.employee}</td>
                  <td className="p-4 text-sm text-slate-300">{t.training}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                      {t.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${statusColor(t.status)}`}>
                      {t.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {t.status === 'expired' && <XCircle className="w-3 h-3" />}
                      {t.status === 'in_progress' && <Clock className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </td>
                  <td className={`p-4 text-sm ${t.status === 'expired' ? 'text-red-400' : 'text-slate-300'}`}>
                    {t.expiry || '\u2014'}
                  </td>
                  <td className="p-4 text-sm text-white font-medium">{t.score > 0 ? `${t.score}%` : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-4">
          {onboardingItems.map((ob, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{ob.employee}</h3>
                  <p className="text-slate-400 text-sm">New hire onboarding \u2014 {ob.items.filter(item => item.completed).length}/{ob.items.length} complete</p>
                </div>
                <div className="text-right">
                  <div className="w-32 h-2 bg-slate-700 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(ob.items.filter(item => item.completed).length / ob.items.length) * 100}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{Math.round((ob.items.filter(item => item.completed).length / ob.items.length) * 100)}%</p>
                </div>
              </div>
              <div className="space-y-2">
                {ob.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-slate-600'}`}>
                        {item.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-white'}`}>{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Due: {item.due}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave Tab */}
      {activeTab === 'leave' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Employee</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Type</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Dates</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Hours</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((lr, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4 text-sm text-white">{lr.employee}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                      {lr.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{lr.start} \u2192 {lr.end}</td>
                  <td className="p-4 text-sm text-white">{lr.hours}h</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(lr.status)}`}>
                      {lr.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {lr.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30">Approve</button>
                        <button className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Deny</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Current Period: {payrollSummary.currentPeriod}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor(payrollSummary.status)}`}>{payrollSummary.status}</span>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Process Payroll
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Gross Pay</p>
                <p className="text-white text-lg font-bold">${payrollSummary.totalGross.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Deductions</p>
                <p className="text-red-400 text-lg font-bold">-${payrollSummary.totalDeductions.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Net Pay</p>
                <p className="text-green-400 text-lg font-bold">${payrollSummary.totalNet.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Total Hours</p>
                <p className="text-white text-lg font-bold">{payrollSummary.totalHours}h <span className="text-xs text-yellow-400">({payrollSummary.overtimeHours}h OT)</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Performance Reviews</h3>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
              <Plus className="w-3.5 h-3.5" />
              New Review Cycle
            </button>
          </div>
          <div className="space-y-3">
            {employees.filter(e => e.status === 'active').slice(0, 4).map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-medium">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{emp.name}</p>
                    <p className="text-slate-400 text-xs">{emp.role} \u2014 Last review: N/A</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                    ))}
                  </div>
                  <button className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">Start Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
