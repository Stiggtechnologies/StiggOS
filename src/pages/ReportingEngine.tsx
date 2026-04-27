import { useState } from 'react'
import { FileText, Calendar, Download, Send, Plus, Clock, CheckCircle, BarChart3, Shield, Users, DollarSign, Wrench } from 'lucide-react'

type ReportTab = 'reports' | 'templates' | 'scheduled'

const reportRuns = [
  { id: '1', title: 'Northview REIT — Monthly Security Summary', type: 'client_security_summary', client: 'Northview Residential REIT', period: 'March 2026', status: 'completed', generated: '2026-04-02', sentTo: ['john.miller@northview.ca'], pages: 12 },
  { id: '2', title: 'Avenue Living — Patrol Completion Report', type: 'patrol_completion', client: 'Avenue Living', period: 'March 2026', status: 'completed', generated: '2026-04-01', sentTo: ['ops@avenueliving.com'], pages: 8 },
  { id: '3', title: 'Q1 2026 Guard Performance Review', type: 'guard_performance', client: 'All', period: 'Q1 2026', status: 'completed', generated: '2026-04-05', sentTo: [], pages: 15 },
  { id: '4', title: 'Mainstreet Equity — Incident Summary', type: 'incident_summary', client: 'Mainstreet Equity', period: 'March 2026', status: 'completed', generated: '2026-04-03', sentTo: ['security@mainstreet.ca'], pages: 6 },
  { id: '5', title: 'Compliance Scorecard — All Sites', type: 'compliance_scorecard', client: 'All', period: 'March 2026', status: 'completed', generated: '2026-04-01', sentTo: [], pages: 10 },
  { id: '6', title: 'April 2026 Financial Summary', type: 'financial_summary', client: 'Internal', period: 'April 2026', status: 'generating', generated: '', sentTo: [], pages: 0 },
]

const templates = [
  { id: '1', name: 'Client Security Summary', type: 'client_security_summary', description: 'Monthly overview of patrol completions, incidents, compliance scores, and guard activity for a specific client.', schedule: '1st of each month', icon: Shield, active: true },
  { id: '2', name: 'Patrol Completion Report', type: 'patrol_completion', description: 'Detailed patrol route completion rates, checkpoint verification, and timing analysis.', schedule: '1st of each month', icon: CheckCircle, active: true },
  { id: '3', name: 'Incident Summary', type: 'incident_summary', description: 'All incidents by type, severity, response time, and resolution status for a given period.', schedule: '1st of each month', icon: FileText, active: true },
  { id: '4', name: 'Guard Performance', type: 'guard_performance', description: 'Individual guard metrics: attendance, patrol quality, incident handling, training status.', schedule: 'Quarterly', icon: Users, active: true },
  { id: '5', name: 'Compliance Scorecard', type: 'compliance_scorecard', description: 'PSISA compliance tracking, licensing status, training completions, and audit readiness.', schedule: 'Monthly', icon: Shield, active: true },
  { id: '6', name: 'Financial Summary', type: 'financial_summary', description: 'Revenue, expenses, AR aging, profitability by client, and cash flow analysis.', schedule: 'Monthly', icon: DollarSign, active: true },
  { id: '7', name: 'Equipment Status', type: 'equipment_status', description: 'Asset inventory, assignment tracking, maintenance due, and condition assessments.', schedule: 'Quarterly', icon: Wrench, active: false },
  { id: '8', name: 'Shift Coverage Analysis', type: 'shift_coverage', description: 'Coverage gaps, overtime trends, staffing utilization, and scheduling efficiency.', schedule: 'Weekly', icon: Calendar, active: true },
  { id: '9', name: 'KPI Dashboard', type: 'kpi_dashboard', description: 'Executive dashboard of all key performance indicators across operations.', schedule: 'Monthly', icon: BarChart3, active: true },
]

export default function ReportingEngine() {
  const [activeTab, setActiveTab] = useState<ReportTab>('reports')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reporting Engine</h1>
          <p className="text-slate-400 mt-1">Auto-generated client reports, performance analytics, and compliance scorecards</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Reports This Month</p>
          <p className="text-2xl font-bold text-white mt-1">{reportRuns.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Auto-Scheduled</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{templates.filter(t => t.active).length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Reports Sent</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{reportRuns.filter(r => r.sentTo.length > 0).length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Generating</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{reportRuns.filter(r => r.status === 'generating').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'reports' as ReportTab, label: 'Recent Reports', icon: FileText },
          { id: 'templates' as ReportTab, label: 'Templates', icon: BarChart3 },
          { id: 'scheduled' as ReportTab, label: 'Scheduled', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reportRuns.map(r => (
            <div key={r.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:bg-slate-800/80">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    r.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">{r.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">{r.period}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-400">{r.client}</span>
                      {r.pages > 0 && (
                        <>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-400">{r.pages} pages</span>
                        </>
                      )}
                    </div>
                    {r.sentTo.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Send className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">Sent to {r.sentTo.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'completed' ? (
                    <>
                      <button className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-1">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                      <button className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 flex items-center gap-1">
                        <Send className="w-3 h-3" /> Send
                      </button>
                    </>
                  ) : (
                    <span className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> Generating...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className={`bg-slate-800 rounded-xl border border-slate-700 p-5 ${!t.active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                  <t.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${t.active ? 'bg-green-400/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                  {t.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h4 className="text-white font-medium text-sm">{t.name}</h4>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{t.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {t.schedule}
                </span>
                <button className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30">
                  Generate Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-white font-semibold mb-4">Scheduled Report Deliveries</h3>
          <div className="space-y-3">
            {templates.filter(t => t.active).map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400">
                    <t.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">Schedule: {t.schedule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Next: May 1, 2026</span>
                  <div className="w-10 h-5 rounded-full bg-blue-500 flex items-center justify-end cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
