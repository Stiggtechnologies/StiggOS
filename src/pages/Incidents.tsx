import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, AlertTriangle, Loader, Clock, MapPin, User, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Incident } from '../lib/types'

const DEMO_INCIDENTS: Incident[] = [
  { id: '1', org_id: '1', site_id: '1', guard_id: '1', description: 'Attempted breach at east entrance - unauthorized access attempt detected by motion sensor', severity: 'critical', incident_type: 'theft', status: 'open', reported_at: '2024-04-26T23:45:00', created_at: '2024-04-26', updated_at: '2024-04-26' },
  { id: '2', org_id: '1', site_id: '2', guard_id: '2', description: 'Unknown vehicle in parking lot - observed 2 suspicious individuals', severity: 'high', incident_type: 'trespass', status: 'investigating', reported_at: '2024-04-26T18:32:00', created_at: '2024-04-26', updated_at: '2024-04-26' },
  { id: '3', org_id: '1', site_id: '3', guard_id: '3', description: 'CCTV camera offline - west wing surveillance system down', severity: 'medium', incident_type: 'maintenance', status: 'open', reported_at: '2024-04-26T14:15:00', created_at: '2024-04-26', updated_at: '2024-04-26' },
  { id: '4', org_id: '1', site_id: '1', guard_id: '4', description: 'Lost key card - building B entrance access', severity: 'low', incident_type: 'maintenance', status: 'resolved', reported_at: '2024-04-25T09:20:00', resolved_at: '2024-04-25T12:00:00', created_at: '2024-04-25', updated_at: '2024-04-25' },
  { id: '5', org_id: '1', site_id: '2', guard_id: '5', description: 'Motion detected after hours - alarm triggered in building A', severity: 'critical', incident_type: 'vandalism', status: 'investigating', reported_at: '2024-04-24T02:15:00', created_at: '2024-04-24', updated_at: '2024-04-24' },
  { id: '6', org_id: '1', site_id: '4', guard_id: '6', description: 'Medical incident - guard feeling unwell during shift', severity: 'high', incident_type: 'medical', status: 'resolved', reported_at: '2024-04-23T16:45:00', resolved_at: '2024-04-23T18:30:00', created_at: '2024-04-23', updated_at: '2024-04-23' },
  { id: '7', org_id: '1', site_id: '1', guard_id: '1', description: 'Severe weather - heavy rain causing flooding in loading area', severity: 'medium', incident_type: 'weather', status: 'open', reported_at: '2024-04-22T08:00:00', created_at: '2024-04-22', updated_at: '2024-04-22' },
]

const DEMO_SITE_NAMES: Record<string, string> = {
  '1': 'Northview REIT #5',
  '2': 'Mainstreet Gardens',
  '3': 'Canadian Tire #2',
  '4': 'Beacon Plaza',
}

const DEMO_GUARD_NAMES: Record<string, string> = {
  '1': 'Jemal Hassan',
  '2': 'Solomon Abdi',
  '3': 'Jean Marie',
  '4': 'Kanwal Singh',
  '5': 'Preston Williams',
  '6': 'Sarah Johnson',
}

export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'investigating' | 'resolved'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('incidents').select('*').limit(30).order('reported_at', { ascending: false })
      if (data && data.length > 0) {
        setIncidents(data)
      } else {
        setIncidents(DEMO_INCIDENTS)
      }
    } catch (error) {
      console.error('Error fetching incidents:', error)
      setIncidents(DEMO_INCIDENTS)
    } finally {
      setLoading(false)
    }
  }

  const filteredIncidents = incidents
    .filter(i => {
      const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           i.incident_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           i.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter
      return matchesSearch && matchesSeverity && matchesStatus
    })
    .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'badge-critical'
      case 'high':
        return 'badge-high'
      case 'medium':
        return 'badge-medium'
      case 'low':
        return 'badge-low'
      default:
        return 'badge-medium'
    }
  }

  const getSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'bg-amber-500/20 text-amber-400'
      case 'open':
        return 'bg-red-500/20 text-red-400'
      case 'resolved':
        return 'bg-green-500/20 text-green-400'
      default:
        return 'bg-secondary text-secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'Investigating'
      case 'open':
        return 'Open'
      case 'resolved':
        return 'Resolved'
      case 'closed':
        return 'Closed'
      default:
        return status
    }
  }

  const openCount = incidents.filter(i => i.status === 'open').length
  const investigatingCount = incidents.filter(i => i.status === 'investigating').length
  const criticalHighCount = incidents.filter(i => (i.severity === 'critical' || i.severity === 'high') && i.status !== 'resolved').length

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} className="text-accent animate-spin" />
          <p className="text-secondary">Loading incidents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Incidents</h1>
          <p className="text-secondary mt-2">Track and manage security incidents</p>
        </div>
        <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors">
          <Plus size={18} />
          Report Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-default">
          <p className="text-secondary text-sm">Total Incidents</p>
          <p className="text-2xl font-bold text-primary mt-2">{incidents.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-red-500/30">
          <p className="text-red-400 text-sm font-semibold">Critical/High</p>
          <p className="text-2xl font-bold text-red-500 mt-2">{criticalHighCount}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-amber-500/30">
          <p className="text-amber-400 text-sm font-semibold">Investigating</p>
          <p className="text-2xl font-bold text-amber-500 mt-2">{investigatingCount}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-accent/30">
          <p className="text-accent text-sm font-semibold">Open</p>
          <p className="text-2xl font-bold text-accent mt-2">{openCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-4 border border-default">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-secondary" />
              <input
                type="text"
                placeholder="Search incidents by ID, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incidents Cards */}
      <div className="space-y-3">
        {filteredIncidents.length > 0 ? (
          filteredIncidents.map(incident => (
            <div
              key={incident.id}
              onClick={() => handleIncidentClick(incident)}
              className="bg-card rounded-lg p-6 border border-default hover:border-accent cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary">Incident #{incident.id.slice(0, 8).toUpperCase()}</h3>
                  <p className="text-secondary text-sm mt-1">{incident.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(incident.severity)}`}>
                    {getSeverityLabel(incident.severity)}
                  </span>
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(incident.status)}`}>
                    {getStatusLabel(incident.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-default">
                <div className="flex items-center gap-2 text-secondary text-sm">
                  <MapPin size={14} className="text-accent" />
                  {DEMO_SITE_NAMES[incident.site_id] || 'Site ' + incident.site_id}
                </div>
                <div className="flex items-center gap-2 text-secondary text-sm">
                  <User size={14} className="text-accent" />
                  {incident.guard_id ? DEMO_GUARD_NAMES[incident.guard_id] || 'Guard' : 'Unassigned'}
                </div>
                <div className="flex items-center gap-2 text-secondary text-sm">
                  <Clock size={14} className="text-accent" />
                  {new Date(incident.reported_at).toLocaleDateString()}
                </div>
                <div className="text-secondary text-sm font-medium">
                  Type: {incident.incident_type}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-secondary">
            <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No incidents found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-2xl font-bold text-primary">Incident Report</h2>
              <button
                onClick={() => { setShowModal(false); setSelectedIncident(null) }}
                className="p-2 hover:bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Severity & Status */}
              <div className="flex gap-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getSeverityColor(selectedIncident.severity)}`}>
                  {getSeverityLabel(selectedIncident.severity)} Severity
                </span>
                <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getStatusColor(selectedIncident.status)}`}>
                  {getStatusLabel(selectedIncident.status)}
                </span>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
                <p className="text-secondary">{selectedIncident.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary rounded p-4">
                  <p className="text-secondary text-sm">Incident Type</p>
                  <p className="text-primary font-bold mt-1 capitalize">{selectedIncident.incident_type}</p>
                </div>
                <div className="bg-secondary rounded p-4">
                  <p className="text-secondary text-sm">Site</p>
                  <p className="text-primary font-bold mt-1">{DEMO_SITE_NAMES[selectedIncident.site_id] || 'Site ' + selectedIncident.site_id}</p>
                </div>
                <div className="bg-secondary rounded p-4">
                  <p className="text-secondary text-sm">Reported By</p>
                  <p className="text-primary font-bold mt-1">{selectedIncident.guard_id ? DEMO_GUARD_NAMES[selectedIncident.guard_id] || 'Guard' : 'System'}</p>
                </div>
                <div className="bg-secondary rounded p-4">
                  <p className="text-secondary text-sm">Reported At</p>
                  <p className="text-primary font-bold mt-1">{new Date(selectedIncident.reported_at).toLocaleString()}</p>
                </div>
                {selectedIncident.resolved_at && (
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Resolved At</p>
                    <p className="text-green-400 font-bold mt-1">{new Date(selectedIncident.resolved_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Timeline</h3>
                <div className="space-y-3 border-l-2 border-accent pl-4">
                  <div>
                    <p className="text-secondary text-sm">Reported</p>
                    <p className="text-primary font-medium">{new Date(selectedIncident.reported_at).toLocaleString()}</p>
                  </div>
                  {selectedIncident.resolved_at && (
                    <div>
                      <p className="text-secondary text-sm">Resolved</p>
                      <p className="text-green-400 font-medium">{new Date(selectedIncident.resolved_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-default flex gap-3">
              <button className="flex-1 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded font-medium transition-colors">
                Update Status
              </button>
              <button
                onClick={() => { setShowModal(false); setSelectedIncident(null) }}
                className="flex-1 px-4 py-2 border border-default hover:bg-secondary rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full">
            <div className="p-6 border-b border-default flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">Report New Incident</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-secondary text-sm mb-2">Severity</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-secondary text-sm mb-2">Category</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Theft</option>
                    <option>Trespass</option>
                    <option>Vandalism</option>
                    <option>Disturbance</option>
                    <option>Maintenance</option>
                    <option>Weather</option>
                    <option>Medical</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-secondary text-sm mb-2">Site</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Northview REIT #5</option>
                    <option>Northview REIT #12</option>
                    <option>Mainstreet Gardens</option>
                    <option>Canadian Tire #2</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-secondary text-sm mb-2">Description</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
                    placeholder="Describe the incident in detail..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-default flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false)
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors"
              >
                Submit Report
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-default hover:bg-secondary rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
