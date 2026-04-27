import { useState } from 'react'
import { Target, Users, DollarSign, Phone, Mail, Calendar, Plus, ArrowRight, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, Building2, Globe, Briefcase, Tag, FileText, Upload } from 'lucide-react'

type PipeTab = 'pipeline' | 'leads' | 'activities'

const pipelineStages = [
  { name: 'New Lead', count: 6, value: 45500, color: 'bg-slate-500', probability: 10 },
  { name: 'Contacted', count: 4, value: 56000, color: 'bg-blue-500', probability: 25 },
  { name: 'Qualified', count: 5, value: 81000, color: 'bg-cyan-500', probability: 50 },
  { name: 'Proposal Sent', count: 4, value: 53000, color: 'bg-purple-500', probability: 70 },
  { name: 'Negotiation', count: 1, value: 48000, color: 'bg-yellow-500', probability: 85 },
  { name: 'Won', count: 3, value: 127500, color: 'bg-green-500', probability: 100 },
  { name: 'Lost', count: 2, value: 28000, color: 'bg-red-500', probability: 0 },
]

interface Lead {
  id: string
  company: string
  contact: string
  email: string
  phone: string
  source: string
  properties: number
  value: number
  stage: string
  nextFollowUp: string
  assignee: string
  notes: string
  industry?: string
  segment?: string
  companyRevenue?: string
  employeeCount?: string
  importedFrom?: string
}

const leads: Lead[] = [
  // Existing Stigg OS leads
  { id: '1', company: 'Boardwalk REIT', contact: 'James Walker', email: 'j.walker@boardwalk.com', phone: '403-555-0142', source: 'referral', properties: 8, value: 48000, stage: 'Negotiation', nextFollowUp: '2026-04-28', assignee: 'Orville Davis', notes: 'Hot lead — ready to sign. Need final pricing confirmation.', industry: 'Real Estate', segment: 'Enterprise', companyRevenue: '$4.2B', employeeCount: '1000+' },
  { id: '2', company: 'Brookfield Properties', contact: 'Amanda Liu', email: 'a.liu@brookfield.com', phone: '403-555-0198', source: 'cold_call', properties: 12, value: 36000, stage: 'Proposal Sent', nextFollowUp: '2026-04-30', assignee: 'Orville Davis', notes: 'Sent Enhanced tier proposal. Awaiting feedback.', industry: 'Real Estate', segment: 'Enterprise', companyRevenue: '$98B', employeeCount: '1000+' },
  { id: '3', company: 'Killam Apartment REIT', contact: 'David Morrison', email: 'd.morrison@killam.com', phone: '403-555-0231', source: 'website', properties: 5, value: 32000, stage: 'Qualified', nextFollowUp: '2026-05-02', assignee: 'Orville Davis', notes: 'Site visit completed. Interested in summer season coverage.', industry: 'Real Estate', segment: 'Enterprise', companyRevenue: '$5.1B', employeeCount: '500+' },
  { id: '4', company: 'InterRent REIT', contact: 'Sophie Tremblay', email: 's.tremblay@interrent.com', phone: '403-555-0167', source: 'referral', properties: 6, value: 33000, stage: 'Qualified', nextFollowUp: '2026-05-05', assignee: 'Orville Davis', notes: 'Referred by Northview. Need 24/7 coverage for 3 properties.', industry: 'Real Estate', segment: 'Enterprise', companyRevenue: '$3.8B', employeeCount: '200+' },
  { id: '5', company: 'Skyline Group', contact: 'Michael Park', email: 'm.park@skyline.com', phone: '403-555-0203', source: 'event', properties: 3, value: 18000, stage: 'Contacted', nextFollowUp: '2026-05-01', assignee: 'Orville Davis', notes: 'Met at Alberta Security Assoc event. Follow up with capabilities deck.', industry: 'Real Estate', segment: 'Mid-Market' },
  { id: '6', company: 'Tricon Residential', contact: 'Karen Singh', email: 'k.singh@tricon.ca', phone: '403-555-0189', source: 'advertisement', properties: 4, value: 24000, stage: 'Contacted', nextFollowUp: '2026-05-03', assignee: 'Orville Davis', notes: 'Responded to Google Ad. Currently unhappy with existing security provider.', industry: 'Real Estate', segment: 'Mid-Market' },
  { id: '7', company: 'CAPREIT', contact: 'Robert Chen', email: 'r.chen@capreit.net', phone: '403-555-0222', source: 'website', properties: 2, value: 12000, stage: 'New Lead', nextFollowUp: '2026-04-28', assignee: '', notes: 'Web form submission. Small portfolio, 2 properties in SE Calgary.', industry: 'Real Estate', segment: 'SMB' },
  { id: '8', company: 'Starlight Investments', contact: 'Nicole Adams', email: 'n.adams@starlight.ca', phone: '403-555-0245', source: 'referral', properties: 3, value: 8500, stage: 'New Lead', nextFollowUp: '2026-04-29', assignee: '', notes: 'Referral from existing client.', industry: 'Real Estate', segment: 'Mid-Market' },
  { id: '9', company: 'Realstar Management', contact: 'Chris Johnson', email: 'c.johnson@realstar.ca', phone: '403-555-0178', source: 'cold_call', properties: 2, value: 8000, stage: 'New Lead', nextFollowUp: '2026-04-30', assignee: '', notes: 'Cold outreach. Left voicemail.', industry: 'Real Estate', segment: 'SMB' },
  { id: '10', company: 'Dream Unlimited', contact: 'Patricia Lee', email: 'p.lee@dream.ca', phone: '403-555-0256', source: 'event', properties: 5, value: 18000, stage: 'Lost', assignee: 'Orville Davis', nextFollowUp: '', notes: 'Went with competitor. Price was main concern.', industry: 'Real Estate', segment: 'Enterprise' },

  // Imported from ClickUp CRM — 12 leads from Accounts & Opportunities
  { id: 'cu-1', company: 'CP Services', contact: 'Lisa Swenson', email: '', phone: '', source: 'clickup_import', properties: 1, value: 2000, stage: 'Proposal Sent', nextFollowUp: '2026-05-01', assignee: 'Orville Davis', notes: 'Arrange meeting with Conor for facility walk down and install assessment.', industry: 'Engineering', segment: 'Enterprise', companyRevenue: '$5B', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-2', company: 'Snow Clearing Contract', contact: '', email: '', phone: '', source: 'clickup_import', properties: 1, value: 2000, stage: 'New Lead', nextFollowUp: '2026-05-02', assignee: '', notes: 'New prospect — snow clearing services needed. Property photos uploaded. Needs contact info and site assessment.', industry: 'Property Management', segment: 'SMB', importedFrom: 'ClickUp CRM' },
  { id: 'cu-3', company: 'Client 10', contact: 'Clarissa Lee', email: '', phone: '', source: 'clickup_import', properties: 4, value: 7000, stage: 'New Lead', nextFollowUp: '2026-05-03', assignee: '', notes: 'Follow up with Clarissa. 200-unit account, high priority prospect.', industry: 'Hospitality', segment: 'Enterprise', companyRevenue: '$11B', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-4', company: 'Client 11', contact: 'Juanita Holmes', email: '', phone: '', source: 'clickup_import', properties: 5, value: 5000, stage: 'New Lead', nextFollowUp: '2026-05-04', assignee: '', notes: 'Second follow up needed. 250-unit account in hospitality sector.', industry: 'Hospitality', segment: 'Mid-Market', companyRevenue: '$148M', employeeCount: '26-100', importedFrom: 'ClickUp CRM' },
  { id: 'cu-5', company: 'Client 9', contact: 'Asia Paltrow', email: '', phone: '', source: 'clickup_import', properties: 3, value: 5000, stage: 'Contacted', nextFollowUp: '2026-05-05', assignee: 'Orville Davis', notes: 'Check in call scheduled. 150-unit engineering account, high value prospect.', industry: 'Engineering', segment: 'Enterprise', companyRevenue: '$49B', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-6', company: 'Client 3', contact: 'Jessie Thompson', email: '', phone: '', source: 'clickup_import', properties: 7, value: 5000, stage: 'Proposal Sent', nextFollowUp: '2026-05-06', assignee: 'Orville Davis', notes: 'Send proposal. 330-unit retail account, normal priority.', industry: 'Retail', segment: 'Enterprise', companyRevenue: '$1B', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-7', company: 'Client 8', contact: 'Jenna Lee', email: 'jenna@example.com', phone: '', source: 'clickup_import', properties: 4, value: 5000, stage: 'Qualified', nextFollowUp: '2026-05-07', assignee: 'Orville Davis', notes: 'Check in call pending. VP of Operations contact. 200-unit retail account, bank wire payment.', industry: 'Retail', segment: 'SMB', companyRevenue: '$5M', employeeCount: '0-25', importedFrom: 'ClickUp CRM' },
  { id: 'cu-8', company: 'Client 7', contact: 'Rick James', email: 'rick@example.com', phone: '', source: 'clickup_import', properties: 7, value: 10000, stage: 'Qualified', nextFollowUp: '2026-05-08', assignee: 'Orville Davis', notes: 'Check in needed. 350-unit retail account, credit card payment, unlimited plan.', industry: 'Retail', segment: 'Mid-Market', companyRevenue: '$50M', employeeCount: '0-25', importedFrom: 'ClickUp CRM' },
  { id: 'cu-9', company: 'Client 2', contact: 'Lawrence Beck', email: 'lawrence@example.com', phone: '', source: 'clickup_import', properties: 8, value: 10000, stage: 'Lost', nextFollowUp: '', assignee: '', notes: 'Lost — send promo email for re-engagement. 400-unit hospitality account, enterprise segment. Payment request sent.', industry: 'Hospitality', segment: 'Enterprise', companyRevenue: '$8B', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-10', company: 'Client 5', contact: 'Mark Bernard', email: 'mark@example.com', phone: '', source: 'clickup_import', properties: 5, value: 9000, stage: 'Contacted', nextFollowUp: '2026-05-09', assignee: 'Orville Davis', notes: 'Doing demo on 11/2. 234-unit engineering account, quote sent, bank wire payment.', industry: 'Engineering', segment: 'Enterprise', companyRevenue: '$20M', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
  { id: 'cu-11', company: 'Client 4', contact: 'Melanie Morris', email: 'melanie@example.com', phone: '', source: 'clickup_import', properties: 10, value: 10000, stage: 'Proposal Sent', nextFollowUp: '2026-05-10', assignee: '', notes: 'Send proposal. 500-unit retail account, low priority. Payment request sent, credit card.', industry: 'Retail', segment: 'Enterprise', companyRevenue: '$100M', employeeCount: '26-100', importedFrom: 'ClickUp CRM' },
  { id: 'cu-12', company: 'Client 6', contact: 'Luis Bernard', email: 'luis@example.com', phone: '', source: 'clickup_import', properties: 2, value: 1000, stage: 'Qualified', nextFollowUp: '2026-05-11', assignee: 'Orville Davis', notes: 'Setting up demo account for call 11/1. 100-unit retail account, urgent priority. Enterprise plan.', industry: 'Retail', segment: 'Mid-Market', companyRevenue: '$80M', employeeCount: '101+', importedFrom: 'ClickUp CRM' },
]

const activities = [
  { lead: 'ClickUp CRM Import', type: 'import', description: 'Bulk import: 12 commercial leads imported from ClickUp CRM Accounts & Opportunities. Industries: Engineering, Retail, Hospitality, Property Management. Pipeline stages mapped to Stigg OS.', date: '2026-04-27', outcome: 'All 12 leads imported and mapped' },
  { lead: 'CP Services', type: 'import', description: 'Lead imported from ClickUp CRM. Original status: Proposal. Facility walkdown pending with Conor. $5B revenue, Engineering sector.', date: '2026-04-27', outcome: 'Imported — needs follow-up scheduling' },
  { lead: 'Client 10', type: 'import', description: 'Imported from ClickUp CRM. Qualified Prospect. $11B hospitality company, 200-unit account. Contact: Clarissa Lee.', date: '2026-04-27', outcome: 'Imported — follow up with Clarissa' },
  { lead: 'Client 9', type: 'import', description: 'Imported from ClickUp CRM. Intro Call stage. $49B engineering company, 150-unit account. Contact: Asia Paltrow.', date: '2026-04-27', outcome: 'Imported — check in call scheduled' },
  { lead: 'Client 6', type: 'import', description: 'Imported from ClickUp CRM. Demo stage, URGENT priority. $80M retail company. Setting up demo account for call. Contact: Luis Bernard.', date: '2026-04-27', outcome: 'Imported — urgent demo setup needed' },
  { lead: 'Client 2', type: 'import', description: 'Imported from ClickUp CRM. Closed/Lost. $8B hospitality company, 400-unit enterprise account. Contact: Lawrence Beck.', date: '2026-04-27', outcome: 'Imported as Lost — send promo for re-engagement' },
  { lead: 'Boardwalk REIT', type: 'meeting', description: 'In-person meeting to finalize contract terms. Discussed Premium tier add-ons.', date: '2026-04-25', outcome: 'Positive — verbal agreement on Enhanced tier' },
  { lead: 'Brookfield Properties', type: 'proposal', description: 'Sent formal proposal: Enhanced tier, 12 properties, $36K/mo. PDF + pricing breakdown.', date: '2026-04-22', outcome: 'Awaiting response' },
  { lead: 'Killam Apartment REIT', type: 'site_visit', description: 'Toured 3 of 5 properties with David Morrison. Assessed security needs, lighting, access points.', date: '2026-04-20', outcome: 'Strong interest — wants proposal by May 5' },
  { lead: 'Skyline Group', type: 'call', description: 'Follow-up call after networking event. Discussed Stigg capabilities and tech-forward approach.', date: '2026-04-18', outcome: 'Interested — requested capabilities deck' },
  { lead: 'Tricon Residential', type: 'email', description: 'Sent intro email with company overview, case studies, and pricing tiers PDF.', date: '2026-04-17', outcome: 'Opened email, clicked pricing link' },
  { lead: 'Dream Unlimited', type: 'follow_up', description: 'Final follow-up after proposal. Client chose competitor (Guard Pro) due to lower pricing.', date: '2026-04-15', outcome: 'Lost — price sensitivity' },
]

const sourceLabel = (s: string) => {
  switch (s) {
    case 'referral': return 'Referral'
    case 'cold_call': return 'Cold Call'
    case 'website': return 'Website'
    case 'event': return 'Event'
    case 'advertisement': return 'Ad'
    case 'clickup_import': return 'ClickUp'
    default: return s
  }
}

const sourceColor = (s: string) => {
  switch (s) {
    case 'referral': return 'bg-green-500/20 text-green-400'
    case 'cold_call': return 'bg-blue-500/20 text-blue-400'
    case 'website': return 'bg-purple-500/20 text-purple-400'
    case 'event': return 'bg-cyan-500/20 text-cyan-400'
    case 'advertisement': return 'bg-yellow-500/20 text-yellow-400'
    case 'clickup_import': return 'bg-orange-500/20 text-orange-400'
    default: return 'bg-slate-700 text-slate-300'
  }
}

export default function SalesPipeline() {
  const [activeTab, setActiveTab] = useState<PipeTab>('pipeline')

  const activeLeads = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost')
  const totalPipelineValue = activeLeads.reduce((s, l) => s + l.value, 0)
  const weightedValue = activeLeads.reduce((s, l) => {
    const stage = pipelineStages.find(p => p.name === l.stage)
    return s + (l.value * (stage?.probability || 0) / 100)
  }, 0)
  const importedCount = leads.filter(l => l.importedFrom).length

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
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Upload className="w-3 h-3" />
            {importedCount} from ClickUp
          </span>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Active Leads</p>
          <p className="text-2xl font-bold text-white mt-1">{activeLeads.length}</p>
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
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Sources</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {['referral', 'cold_call', 'website', 'event', 'advertisement', 'clickup_import'].map(s => {
              const count = leads.filter(l => l.source === s).length
              return count > 0 ? (
                <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${sourceColor(s)}`}>
                  {sourceLabel(s)} {count}
                </span>
              ) : null
            })}
          </div>
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
          {pipelineStages.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.name)
            return (
              <div key={stage.name} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className={`h-1 ${stage.color}`} />
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white text-xs font-medium">{stage.name}</h4>
                    <span className="text-xs text-slate-500">{stageLeads.length}</span>
                  </div>
                  <p className="text-sm text-white font-bold">${(stageLeads.reduce((s, l) => s + l.value, 0) / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-slate-500">{stage.probability}% prob</p>
                </div>
                <div className="px-3 pb-3 space-y-2">
                  {stageLeads.slice(0, 4).map(lead => (
                    <div key={lead.id} className="bg-slate-700/50 rounded-lg p-2 cursor-pointer hover:bg-slate-700">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-white font-medium truncate flex-1">{lead.company}</p>
                        {lead.importedFrom && <Upload className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-400">${(lead.value / 1000).toFixed(0)}K/mo</p>
                      {lead.industry && <p className="text-[10px] text-slate-500">{lead.industry}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Leads List */}
      {activeTab === 'leads' && (
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.id} className={`bg-slate-800 rounded-xl border border-slate-700 p-4 hover:bg-slate-800/80 cursor-pointer ${lead.importedFrom ? 'border-l-2 border-l-orange-500/50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="text-white font-medium">{lead.company}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${stageColor(lead.stage)}`}>{lead.stage}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColor(lead.source)}`}>{sourceLabel(lead.source)}</span>
                    {lead.industry && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5" />
                        {lead.industry}
                      </span>
                    )}
                    {lead.segment && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{lead.segment}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                    {lead.contact && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {lead.contact}</span>}
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>}
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.phone}</span>}
                    {lead.companyRevenue && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Rev: {lead.companyRevenue}</span>}
                    {lead.employeeCount && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {lead.employeeCount} employees</span>}
                  </div>
                  {lead.notes && <p className="text-xs text-slate-500 mt-2">{lead.notes}</p>}
                  {lead.importedFrom && (
                    <p className="text-[10px] text-orange-400/70 mt-1 flex items-center gap-1">
                      <Upload className="w-2.5 h-2.5" /> Imported from {lead.importedFrom}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-white font-bold">${(lead.value / 1000).toFixed(0)}K<span className="text-slate-500 text-xs font-normal">/mo</span></p>
                  <p className="text-xs text-slate-400">{lead.properties} {lead.properties === 1 ? 'property' : 'properties'}</p>
                  {lead.assignee && <p className="text-xs text-slate-500 mt-1">{lead.assignee}</p>}
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
            <div key={i} className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${a.type === 'import' ? 'border-l-2 border-l-orange-500/50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  a.type === 'call' ? 'bg-blue-500/20 text-blue-400' :
                  a.type === 'email' ? 'bg-purple-500/20 text-purple-400' :
                  a.type === 'meeting' ? 'bg-green-500/20 text-green-400' :
                  a.type === 'site_visit' ? 'bg-cyan-500/20 text-cyan-400' :
                  a.type === 'proposal' ? 'bg-yellow-500/20 text-yellow-400' :
                  a.type === 'import' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {a.type === 'call' ? <Phone className="w-4 h-4" /> :
                   a.type === 'email' ? <Mail className="w-4 h-4" /> :
                   a.type === 'meeting' ? <Users className="w-4 h-4" /> :
                   a.type === 'import' ? <Upload className="w-4 h-4" /> :
                   <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white text-sm font-medium">{a.lead}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.type === 'import' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'}`}>{a.type.replace('_', ' ')}</span>
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
