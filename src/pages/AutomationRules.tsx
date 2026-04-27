import { useState } from 'react'
import { Zap, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Play, Pause, History, Settings, ArrowRight, Bell, Mail, Shield, Users, FileText } from 'lucide-react'

type AutoTab = 'rules' | 'executions'

const rules = [
  { id: '1', name: 'Auto-Escalate Missed Patrol', trigger: 'patrol_missed', action: 'send_notification', description: 'When a patrol is not started within 15 minutes of scheduled time, notify supervisor and dispatch.', active: true, lastTriggered: '2026-04-26 10:15 PM', triggerCount: 12, cooldown: 30 },
  { id: '2', name: 'Checkpoint Miss Alert', trigger: 'checkpoint_missed', action: 'create_alert', description: 'When a guard misses a checkpoint during an active patrol, create a high-severity alert.', active: true, lastTriggered: '2026-04-27 11:39 PM', triggerCount: 8, cooldown: 15 },
  { id: '3', name: 'Guard No-Show Escalation', trigger: 'shift_no_show', action: 'assign_backup_guard', description: 'If a guard doesn\'t clock in within 30 minutes of shift start, auto-notify backup guard and supervisor.', active: true, lastTriggered: '2026-04-20 11:35 PM', triggerCount: 3, cooldown: 60 },
  { id: '4', name: 'Certificate Expiry Warning', trigger: 'cert_expiry_approaching', action: 'send_email', description: 'Send email reminder to guard and HR 30 days before any certification expires.', active: true, lastTriggered: '2026-04-15 09:00 AM', triggerCount: 5, cooldown: 10080 },
  { id: '5', name: 'Invoice Overdue Reminder', trigger: 'invoice_overdue', action: 'send_notification', description: 'When an invoice is 30 days past due, create notification for admin and send reminder email to client.', active: true, lastTriggered: '2026-04-25 09:00 AM', triggerCount: 7, cooldown: 10080 },
  { id: '6', name: 'Contract Renewal Alert', trigger: 'contract_expiring', action: 'create_task', description: 'Create a renewal task 60 days before contract expiry. Assign to account manager.', active: true, lastTriggered: '2026-03-28 09:00 AM', triggerCount: 2, cooldown: 10080 },
  { id: '7', name: 'Incident Auto-Escalation', trigger: 'incident_severity_high', action: 'escalate_incident', description: 'Automatically escalate high-severity incidents to senior management and trigger emergency protocol.', active: true, lastTriggered: '2026-04-27 02:15 PM', triggerCount: 4, cooldown: 5 },
  { id: '8', name: 'Overtime Threshold Alert', trigger: 'overtime_exceeded', action: 'send_notification', description: 'Alert managers when any guard exceeds 40 hours in a pay period to control labor costs.', active: true, lastTriggered: '2026-04-24 05:00 PM', triggerCount: 6, cooldown: 10080 },
  { id: '9', name: 'Equipment Maintenance Due', trigger: 'equipment_maintenance_due', action: 'create_task', description: 'Auto-create maintenance task when equipment reaches scheduled maintenance date.', active: true, lastTriggered: '2026-04-20 09:00 AM', triggerCount: 3, cooldown: 1440 },
  { id: '10', name: 'Weekly Client Report', trigger: 'report_scheduled', action: 'generate_report', description: 'Auto-generate and email weekly security summary to all active clients every Monday at 9 AM.', active: false, lastTriggered: '2026-04-21 09:00 AM', triggerCount: 15, cooldown: 10080 },
  { id: '11', name: 'Lead Follow-Up Reminder', trigger: 'lead_follow_up_due', action: 'send_notification', description: 'Remind sales team when a lead follow-up date arrives. Prevent prospects from going cold.', active: true, lastTriggered: '2026-04-26 09:00 AM', triggerCount: 9, cooldown: 1440 },
  { id: '12', name: 'Compliance Score Drop Alert', trigger: 'compliance_score_below_threshold', action: 'send_notification', description: 'Alert when any site\'s compliance score drops below 90%. Requires immediate attention.', active: true, lastTriggered: '', triggerCount: 0, cooldown: 1440 },
]

const executions = [
  { rule: 'Checkpoint Miss Alert', time: '2026-04-27 11:39 PM', status: 'success', trigger: 'Marcus Thompson missed checkpoint B-3', action: 'Created alert #ALT-042', duration: 45 },
  { rule: 'Incident Auto-Escalation', time: '2026-04-27 02:15 PM', status: 'success', trigger: 'INC-2026-042 severity: high', action: 'Escalated to senior management, sent 3 notifications', duration: 120 },
  { rule: 'Overtime Threshold Alert', time: '2026-04-27 09:00 AM', status: 'success', trigger: 'Sarah Chen: 42.5 hours (pay period)', action: 'Notified manager', duration: 30 },
  { rule: 'Lead Follow-Up Reminder', time: '2026-04-26 09:00 AM', status: 'success', trigger: '3 follow-ups due today', action: 'Sent 3 notifications', duration: 55 },
  { rule: 'Auto-Escalate Missed Patrol', time: '2026-04-26 10:15 PM', status: 'success', trigger: 'Route B-1 not started at Mainstreet #2', action: 'Notified supervisor + dispatch', duration: 38 },
  { rule: 'Invoice Overdue Reminder', time: '2026-04-25 09:00 AM', status: 'success', trigger: 'INV-2026-018: 45 days overdue', action: 'Created notification, sent client email', duration: 210 },
  { rule: 'Certificate Expiry Warning', time: '2026-04-15 09:00 AM', status: 'success', trigger: 'Jemal Abera First Aid expires in 30 days', action: 'Emailed guard + HR', duration: 180 },
  { rule: 'Weekly Client Report', time: '2026-04-21 09:00 AM', status: 'failed', trigger: 'Scheduled weekly run', action: 'Error: template not found', duration: 500 },
  { rule: 'Guard No-Show Escalation', time: '2026-04-20 11:35 PM', status: 'success', trigger: 'Daniel Okafor: 30 min past shift start', action: 'Notified backup (Marcus T.), alerted supervisor', duration: 65 },
  { rule: 'Equipment Maintenance Due', time: '2026-04-20 09:00 AM', status: 'success', trigger: 'VEH-001 oil change due', action: 'Created maintenance task', duration: 25 },
]

const actionIcon = (action: string) => {
  switch (action) {
    case 'send_notification': return <Bell className="w-4 h-4 text-blue-400" />
    case 'send_email': return <Mail className="w-4 h-4 text-purple-400" />
    case 'create_alert': return <AlertTriangle className="w-4 h-4 text-orange-400" />
    case 'create_task': return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'escalate_incident': return <Shield className="w-4 h-4 text-red-400" />
    case 'assign_backup_guard': return <Users className="w-4 h-4 text-cyan-400" />
    case 'generate_report': return <FileText className="w-4 h-4 text-yellow-400" />
    default: return <Zap className="w-4 h-4 text-slate-400" />
  }
}

export default function AutomationRules() {
  const [activeTab, setActiveTab] = useState<AutoTab>('rules')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automation Rules</h1>
          <p className="text-slate-400 mt-1">If-this-then-that automation for operations, compliance, and alerts</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Active Rules</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{rules.filter(r => r.active).length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Executions</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{rules.reduce((s, r) => s + r.triggerCount, 0)}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Success Rate</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)}%</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Avg Response</p>
          <p className="text-2xl font-bold text-white mt-1">{Math.round(executions.reduce((s, e) => s + e.duration, 0) / executions.length)}ms</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'rules' as AutoTab, label: 'Rules', icon: Zap },
          { id: 'executions' as AutoTab, label: 'Execution History', icon: History },
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

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${!rule.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{actionIcon(rule.action)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium text-sm">{rule.name}</h4>
                      {rule.active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 flex items-center gap-1">
                          <Play className="w-2.5 h-2.5" /> Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" /> Paused
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {rule.trigger.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        {rule.action.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cooldown: {rule.cooldown >= 10080 ? `${rule.cooldown / 10080}w` : rule.cooldown >= 1440 ? `${rule.cooldown / 1440}d` : rule.cooldown >= 60 ? `${rule.cooldown / 60}h` : `${rule.cooldown}m`}
                      </span>
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Triggered {rule.triggerCount}x
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button className="p-1.5 bg-slate-700 rounded hover:bg-slate-600">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <div className={`w-10 h-5 rounded-full flex items-center cursor-pointer transition-colors ${rule.active ? 'bg-blue-500 justify-end' : 'bg-slate-600 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full mx-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Rule</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Time</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Trigger</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Action Taken</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                <th className="text-right text-xs text-slate-400 font-medium p-4">Duration</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e, i) => (
                <tr key={i} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${e.status === 'failed' ? 'bg-red-500/5' : ''}`}>
                  <td className="p-4 text-sm text-white font-medium">{e.rule}</td>
                  <td className="p-4 text-xs text-slate-400 whitespace-nowrap">{e.time}</td>
                  <td className="p-4 text-sm text-slate-300">{e.trigger}</td>
                  <td className="p-4 text-sm text-slate-300">{e.action}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${
                      e.status === 'success' ? 'bg-green-400/10 text-green-400' :
                      e.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                      'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {e.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {e.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400 text-right">{e.duration}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
