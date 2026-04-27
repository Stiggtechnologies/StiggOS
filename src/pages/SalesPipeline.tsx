import { useState } from 'react'
import { Target, Users, DollarSign, Phone, Mail, Calendar, Plus, ArrowRight, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'

type PipeTab = 'pipeline' | 'leads' | 'activities'

const pipelineStages = [
  { name: 'New Lead', count: 3, value: 28500, color: 'bg-slate-500', probability: 10 },
  { name: 'Contacted', count: 2, value: 42000, color: 'bg-blue-500', probability: 25 },
  { name: 'Qualified', count: 2, value: 65000, color: 'bg-cyan-500', probability: 50 },
  { name: 'Proposal Sent', count: 1, value: 36000, color: 'bg-purple-500', probability: 70 },
  { name: 'Negotiation', count: 1, value: 48000, color: 'bg-yellow-500', probability: 85 },
  { name: 'Won', count: 3, value: 127500, color: 'bg-green-500', probability: 100 },
  { name: 'Lost', count: 1, value: 18000, color: 'bg-red-500', probability: 0 },
]

const leads = [
  { id: '1', company: 'Boardwalk REIT', contact: 'James Walker', email: 'j.walker@boardwalk.com', phone: '403-555-0142', source: 'referral', properties: 8, value: 48000, stage: 'Negotiation', nextFollowUp: '2026-04-28', assignee: 'Orville Davis', notes: 'Hot lead — ready to sign. Need final pricing confirmation.' },
  { id: '2', company: 'Brookfield Properties', contact: 'Amanda Liu', email: 'a.liu@brookfield.com', phone: '403-555-0198', source: 'cold_call', properties: 12, value: 36000, stage: 'Proposal Sent', assignee: 'Orville Davis', nextFollowUp: '2026-04-30', notes: 'Sent Enhanced tier proposal. Awaiting feedback.' },
  { id: '3', company: 'Killam Apartment REIT', contact: 'David Morrison', email: 'd.morrison@killam.com', phone: '403-555-0231', source: 'website', properties: 5, value: 32000, stage: 'Qualified', assignee: 'Orville Davis', nextFollowUp: '2026-05-02', notes: 'Site visit completed. Interested in summer season coverage.' },
  { id: '4', company: 'InterRent REIT', contact: 'Sophie Tremblay', email: 's.tremblay@interrent.com', phone: '403-555-0167', source: 'referral', properties: 6, value: 33000, stage: 'Qualified', assignee: 'Orville Davis', nextFollowUp: '2026-05-05', notes: 'Referred by Northview. Need 24/7 coverage for 3 properties.' },
  { id: '5', company: 'Skyline Group', contact: 'Michael Park', email: 'm.park@skyline.com', phone: '403-555-0203', source: 'event', properties: 3, value: 18000, stage: 'Contacted', assignee: 'Orville Davis', nextFollowUp: '2026-05-01', notes: 'Met at Alberta Security Assoc event. Follow up with capabilities deck.' },
  { id: '6', company: 'Tricon Residential', contact: 'Karen Singh', email: 'k.singh@tricon.ca', phone: '403-555-0189', source: 'advertisement', properties: 4, value: 24000, stage: 'Contacted', assignee: 'Orville Davis', nextFollowUp: '2026-05-03', notes: 'Responded to Google Ad. Currently unhappy with existing security provider.' },
  { id: '7', company: 'CAPREIT', contact: 'Robert Chen', email: 'r.chen@capreit.net', phone: '403-555-0222', source: 'website', properties: 2, value: 12000, stage: 'New Lead', assignee: '', nextFollowUp: '2026-04-28', notes: 'Web form submission. Small portfolio, 2 properties in SE Calgary.' },
  { id: '8', company: 'Starlight Investments', contact: 'Nicole Adams', email: 'n.adams@starlight.ca', phone: '403-555-0245', source: 'referral', properties: 3, value: 8500, stage: 'New Lead', assignee: '', nextFollowUp: '2026-04-29', notes: 'Referral from existing client.' },
  { id: '9', company: 'Realstar Management', contact: 'Chris Johnson', email: 'c.johnson@realstar.ca', phone: '403-555-0178', source: 'cold_call', properties: 2, value: 8000, stage: 'New Lead', assignee: '', nextFollowUp: '2026-04-30', notes: 'Cold outreach. Left voicemail.' },
  { id: '10', company: 'Dream Unlimited', contact: 'Patricia Lee', email: 'p.lee@dream.ca', phone: '403-555-0256', source: 'event', properties: 5, value: 18000, stage: 'Lost', assignee: 'Orville Davis', nextFollowUp: '', notes: 'Went with competitor. Price was main concern.' },
]

const activities = [
  { lead: 'Boardwalk REIT', type: 'meeting', description: 'In-person meeting to finalize contract terms. Discussed Premium tier add-ons.', date: '2026-04-25', outcome: 'Positive — verbal agreement on Enhanced tier' },
  { lead: 'Brookfield Properties', type: 'proposal', description: 'Sent formal proposal: Enhanced tier, 12 properties, $36K/mo. PDF + pricing breakdown.', date: '2026-04-22', outcome: 'Awaiting response' },
  { lead: 'Killam Apartment REIT', type: 'site_visit', description: 'Toured 3 of 5 properties with David Morrison. Assessed security needs, lighting, access points.', date: '2026-04-20', outcome: 'Strong interest — wants proposal by May 5' },
  { lead: 'Skyline Group', type: 'call', description: 'Follow-up call after networking event. Discussed Stigg capabilities and tech-forward approach.', date: '2026-04-18', outcome: 'Interested — requested capabilities deck' },
  { lead: 'Tricon Residential', type: 'email', description: 'Sent intro email with company overview, case studies, and pricing tiers PDF.', date: '2026-04-17', outcome: 'Opened email, clicked pricing link' },
  { lead: 'Dream Unlimited', type: 'follow_up', description: 'Final follow-up after proposal. Client chose competitor (Guard Pro) due to lower pricing.', date: '2026-04-15', outcome: 'Lost — price sensitivity' },
]

export default function SalesPipeline() {
  const [activeTab, setActiveTab] = useState<PipeTab>('pipeline')

  const totalPipelineValue = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').reduce((s, l) => s + l.value, 0)
  const weightedValue = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').reduce((s, l) => {
    const stage = pipelineStages.find(p => p.name === l.stage)
    return s + (l.value * (stage?.probability || 0) / 100)
  }, 0)

  const stageColor = (stage: string) => {
    const s = pipelineStages.find(p => p.name === stage)
    return s?.color || 'bg-slate-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Pipeline & CRM</h1>
          <p className="text-slate-400 mt-1">Lead tracking, prospect management, and deal pipeline</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Active Leads</p>
          <p className="text-2xl font-bold text-white mt-1">{leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Pipeline Value</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">${(totalPipelineValue / 1000).toFixed(0)}K</p>
          <p className="text-slate-500 text-xs mt-1">/month potential</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Weighted Forecast</p>
          <p className="text-2xl font-bold text-green-400 mt-1">${(weightedValue / 1000).toFixed(0)}K</p>
          <p className="text-slate-500 text-xs mt-1">probability-adjusted</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Win Rate</p>
          <p className="text-2xl font-bold text-green-400 mt-1">75%</p>
          <p className="text-slate-500 text-xs mt-1">3 won / 1 lost</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'pipeline' as PipeTab, label: 'Pipeline View', icon: Target },
          { id: 'leads' as PipeTab, label: 'All Leads', icon: Users },
          { id: 'activities' as PipeTab, label: 'Activities', icon: MessageSquare },
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

      {/* Pipeline View */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {pipelineStages.map(stage => (
            <div key={stage.name} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className={`h-1 ${stage.color}`} />
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white text-xs font-medium">{stage.name}</h4>
                  <span className="text-xs text-slate-500">{stage.count}</span>
                </div>
                <p className="text-sm text-white font-bold">${(stage.value / 1000).toFixed(0)}K</p>
                <p className="text-xs text-slate-500">{stage.probability}% prob</p>
              </div>
              <div className="px-3 pb-3 space-y-2">
                {leads.filter(l => l.stage === stage.name).slice(0, 3).map(lead => (
                  <div key={lead.id} className="bg-slate-700/50 rounded-lg p-2 cursor-pointer hover:bg-slate-700">
                    <p className="text-xs text-white font-medium truncate">{lead.company}</p>
                    <p className="text-xs text-slate-400">${(lead.value / 1000).toFixed(0)}K/mo</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads List */}
      {activeTab === 'leads' && (
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:bg-slate-800/80 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-medium">{lead.company}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${stageColor(lead.stage)}`}>{lead.stage}</span>
                    {lead.source && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{lead.source.replace('_', ' ')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {lead.contact}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>}
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</span>}
                  </div>
                  {lead.notes && <p className="text-xs text-slate-500 mt-2">{lead.notes}</p>}
                </div>
                <div className="text-right ml-4">
                  <p className="text-white font-bold">${(lead.value / 1000).toFixed(0)}K<span className="text-slate-500 text-xs font-normal">/mo</span></p>
                  <p className="text-xs text-slate-400">{lead.properties} properties</p>
                  {lead.nextFollowUp && (
                    <p className="text-xs text-blue-400 mt-1 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {lead.nextFollowUp}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div className="space-y-3">
          {activities.map((a, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  a.type === 'call' ? 'bg-blue-500/20 text-blue-400' :
                  a.type === 'email' ? 'bg-purple-500/20 text-purple-400' :
                  a.type === 'meeting' ? 'bg-green-500/20 text-green-400' :
                  a.type === 'site_visit' ? 'bg-cyan-500/20 text-cyan-400' :
                  a.type === 'proposal' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {a.type === 'call' ? <Phone className="w-4 h-4" /> :
                   a.type === 'email' ? <Mail className="w-4 h-4" /> :
                   a.type === 'meeting' ? <Users className="w-4 h-4" /> :
                   <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white text-sm font-medium">{a.lead}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{a.type.replace('_', ' ')}</span>
                    <span className="text-xs text-slate-500">{a.date}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{a.description}</p>
                  {a.outcome && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Outcome: {a.outcome}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
