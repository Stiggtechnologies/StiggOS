import React, { useState, useEffect } from 'react'
import {
  Shield, Camera, AlertTriangle, Activity, Users, Clock, MapPin,
  ChevronRight, Eye, Download, FileText, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Radio, Zap, Bell, Search, Filter, Calendar,
  BarChart3, Crosshair, Car, User, RefreshCw, ArrowUpRight, ArrowDownRight,
  Wifi, WifiOff, Sun, Moon, ChevronDown, X, ExternalLink, Play, Pause
} from 'lucide-react'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface AIDetectionEvent {
  id: string
  timestamp: string
  camera: string
  type: 'person' | 'vehicle' | 'loitering' | 'zone_breach' | 'plate_read'
  confidence: number
  zone: string
  status: 'active' | 'resolved' | 'dismissed'
  thumbnail?: string
  details: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

interface PatrolCheckpoint {
  id: string
  name: string
  scheduledTime: string
  actualTime: string | null
  status: 'completed' | 'missed' | 'upcoming' | 'late'
  guard: string
  gpsVerified: boolean
}

interface IncidentRecord {
  id: string
  timestamp: string
  type: string
  location: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  assignedGuard: string
  responseTime: string
  description: string
  hasVideo: boolean
  hasSnapshot: boolean
}

interface GuardActivity {
  id: string
  name: string
  status: 'on_patrol' | 'stationed' | 'responding' | 'off_duty'
  currentLocation: string
  shiftStart: string
  shiftEnd: string
  checkpointsCompleted: number
  checkpointsTotal: number
  responseTimeAvg: string
  lastCheckIn: string
}

interface CameraStatus {
  id: string
  name: string
  location: string
  status: 'online' | 'offline' | 'degraded'
  aiEnabled: boolean
  lastDetection: string
  detections24h: number
}

interface DailyMetrics {
  date: string
  detections: number
  incidents: number
  patrols: number
  responseTime: number
}

// ─── DEMO DATA ──────────────────────────────────────────────────────────────

const PROPERTIES = [
  { id: 'nv-5', name: 'Northview Tower 5', address: '10205 101 St NW', cameras: 12, guards: 2 },
  { id: 'nv-7', name: 'Northview Tower 7', address: '10425 100 Ave NW', cameras: 8, guards: 1 },
  { id: 'nv-12', name: 'Northview Tower 12', address: '11215 Jasper Ave', cameras: 10, guards: 2 },
]

const AI_DETECTIONS: AIDetectionEvent[] = [
  { id: 'det-1', timestamp: '2026-05-01T02:47:00', camera: 'Parking Cam 4', type: 'person', confidence: 94.2, zone: 'Parking Zone B', status: 'resolved', details: 'Individual detected loitering >5 min. Guard dispatched — tenant guest verified.', severity: 'high' },
  { id: 'det-2', timestamp: '2026-05-01T02:31:00', camera: 'Lobby Cam 1', type: 'person', confidence: 98.7, zone: 'Main Entrance', status: 'resolved', details: 'Authorized tenant entry. Face matched to resident database.', severity: 'info' },
  { id: 'det-3', timestamp: '2026-05-01T01:52:00', camera: 'Perimeter Cam N', type: 'zone_breach', confidence: 91.5, zone: 'North Fence Line', status: 'resolved', details: 'Motion at fence line — animal (coyote) confirmed via AI classification.', severity: 'low' },
  { id: 'det-4', timestamp: '2026-05-01T01:30:00', camera: 'Parking Cam 2', type: 'plate_read', confidence: 99.1, zone: 'Parking Entry', status: 'active', details: 'Plate ABC-1234 (Black SUV) — NOT in tenant database. Flagged for review.', severity: 'medium' },
  { id: 'det-5', timestamp: '2026-05-01T00:45:00', camera: 'Loading Dock', type: 'vehicle', confidence: 96.8, zone: 'Service Area', status: 'dismissed', details: 'Delivery vehicle detected at loading dock. Scheduled delivery confirmed.', severity: 'info' },
  { id: 'det-6', timestamp: '2026-04-30T23:15:00', camera: 'Parking Cam 3', type: 'loitering', confidence: 88.3, zone: 'Parking Zone A', status: 'resolved', details: 'Person in Zone A >3 min threshold. Guard responded — maintenance worker on authorized overtime.', severity: 'medium' },
  { id: 'det-7', timestamp: '2026-04-30T22:30:00', camera: 'Stairwell B', type: 'person', confidence: 95.1, zone: 'Stairwell Access', status: 'resolved', details: 'Unauthorized access attempt to mechanical room. Door remained locked. Guard alerted.', severity: 'high' },
  { id: 'det-8', timestamp: '2026-04-30T21:08:00', camera: 'Parking Cam 2', type: 'plate_read', confidence: 99.4, zone: 'Parking Entry', status: 'resolved', details: 'Plate XYZ-5678 (White Van) — tenant registered vehicle confirmed.', severity: 'info' },
]

const PATROL_CHECKPOINTS: PatrolCheckpoint[] = [
  { id: 'cp-1', name: 'Main Lobby', scheduledTime: '23:00', actualTime: '23:02', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-2', name: 'Parking Level 1', scheduledTime: '23:30', actualTime: '23:28', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-3', name: 'Perimeter North', scheduledTime: '00:00', actualTime: '00:04', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-4', name: 'Perimeter East', scheduledTime: '00:30', actualTime: '00:31', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-5', name: 'Loading Dock', scheduledTime: '01:00', actualTime: '01:03', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-6', name: 'Mechanical Room', scheduledTime: '01:30', actualTime: '01:29', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-7', name: 'Parking Level 2', scheduledTime: '02:00', actualTime: '02:05', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-8', name: 'Rooftop Access', scheduledTime: '02:30', actualTime: '02:33', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-9', name: 'Main Lobby', scheduledTime: '03:00', actualTime: '02:58', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-10', name: 'Perimeter South', scheduledTime: '03:30', actualTime: '03:34', status: 'completed', guard: 'J. Smith', gpsVerified: true },
  { id: 'cp-11', name: 'Parking Level 1', scheduledTime: '04:00', actualTime: null, status: 'upcoming', guard: 'J. Smith', gpsVerified: false },
  { id: 'cp-12', name: 'Perimeter West', scheduledTime: '04:30', actualTime: null, status: 'upcoming', guard: 'J. Smith', gpsVerified: false },
]

const INCIDENTS: IncidentRecord[] = [
  { id: 'inc-1', timestamp: '2026-05-01T02:47:00', type: 'Suspicious Person', location: 'Parking Zone B', severity: 'high', status: 'resolved', assignedGuard: 'J. Smith', responseTime: '2m 14s', description: 'Unknown individual loitering in parking zone. Guard dispatched — verified as tenant guest.', hasVideo: true, hasSnapshot: true },
  { id: 'inc-2', timestamp: '2026-04-30T22:30:00', type: 'Unauthorized Access Attempt', location: 'Stairwell B', severity: 'high', status: 'closed', assignedGuard: 'J. Smith', responseTime: '1m 48s', description: 'Attempted access to mechanical room via stairwell. Door secured. Individual could not be located.', hasVideo: true, hasSnapshot: true },
  { id: 'inc-3', timestamp: '2026-04-29T14:20:00', type: 'Maintenance Issue', location: 'Parking Level 1', severity: 'low', status: 'open', assignedGuard: 'K. Osei', responseTime: '—', description: 'Broken light fixture in parking level 1, section C. Reported to property management.', hasVideo: false, hasSnapshot: true },
]

const GUARD_ACTIVITY: GuardActivity[] = [
  { id: 'g-1', name: 'J. Smith', status: 'on_patrol', currentLocation: 'Perimeter South', shiftStart: '23:00', shiftEnd: '07:00', checkpointsCompleted: 10, checkpointsTotal: 12, responseTimeAvg: '2m 01s', lastCheckIn: '3 min ago' },
]

const CAMERAS: CameraStatus[] = [
  { id: 'cam-1', name: 'Lobby Cam 1', location: 'Main Entrance', status: 'online', aiEnabled: true, lastDetection: '31 min ago', detections24h: 47 },
  { id: 'cam-2', name: 'Parking Cam 2', location: 'Parking Entry', status: 'online', aiEnabled: true, lastDetection: '12 min ago', detections24h: 83 },
  { id: 'cam-3', name: 'Parking Cam 3', location: 'Parking Zone A', status: 'online', aiEnabled: true, lastDetection: '1h ago', detections24h: 31 },
  { id: 'cam-4', name: 'Parking Cam 4', location: 'Parking Zone B', status: 'online', aiEnabled: true, lastDetection: '5 min ago', detections24h: 29 },
  { id: 'cam-5', name: 'Perimeter Cam N', location: 'North Fence', status: 'online', aiEnabled: true, lastDetection: '2h ago', detections24h: 8 },
  { id: 'cam-6', name: 'Perimeter Cam S', location: 'South Fence', status: 'online', aiEnabled: true, lastDetection: '45 min ago', detections24h: 12 },
  { id: 'cam-7', name: 'Loading Dock', location: 'Service Area', status: 'online', aiEnabled: true, lastDetection: '3h ago', detections24h: 6 },
  { id: 'cam-8', name: 'Stairwell B', location: 'Interior Access', status: 'online', aiEnabled: true, lastDetection: '1.5h ago', detections24h: 4 },
]

const DAILY_METRICS: DailyMetrics[] = [
  { date: 'Apr 25', detections: 156, incidents: 1, patrols: 12, responseTime: 2.8 },
  { date: 'Apr 26', detections: 189, incidents: 0, patrols: 12, responseTime: 0 },
  { date: 'Apr 27', detections: 142, incidents: 2, patrols: 12, responseTime: 3.1 },
  { date: 'Apr 28', detections: 203, incidents: 0, patrols: 12, responseTime: 0 },
  { date: 'Apr 29', detections: 178, incidents: 1, patrols: 12, responseTime: 2.4 },
  { date: 'Apr 30', detections: 165, incidents: 2, patrols: 12, responseTime: 1.9 },
  { date: 'May 1', detections: 47, incidents: 1, patrols: 10, responseTime: 2.2 },
]

const FLAGGED_VEHICLES = [
  { plate: 'ABC-1234', type: 'Black SUV', time: '1:30 AM', status: 'Under Review', inDatabase: false },
  { plate: 'XYZ-5678', type: 'White Van', time: '9:08 PM', status: 'Verified', inDatabase: true },
  { plate: 'DEF-9012', type: 'Silver Sedan', time: '4:15 AM', status: 'Flagged', inDatabase: false },
]

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────

function MiniBarChart({ data, height = 48, color = '#3b82f6' }: { data: number[], height?: number, color?: string }) {
  const max = Math.max(...data, 1)
  const barWidth = 100 / data.length
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {data.map((val, i) => {
        const barH = (val / max) * (height - 4)
        return (
          <rect
            key={i}
            x={i * barWidth + 1}
            y={height - barH - 2}
            width={barWidth - 2}
            height={barH}
            fill={color}
            opacity={0.8}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

function MiniLineChart({ data, height = 48, color = '#22c55e' }: { data: number[], height?: number, color?: string }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - 4 - ((val - min) / range) * (height - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = height - 4 - ((val - min) / range) * (height - 8)
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />
      })}
    </svg>
  )
}

function CircularProgress({ value, size = 72, strokeWidth = 6, color = '#3b82f6' }: { value: number, size?: number, strokeWidth?: number, color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#f8fafc" fontSize={size * 0.22} fontWeight="bold">
        {value}%
      </text>
    </svg>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    info: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[severity] || styles.low}`}>
      {severity}
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-amber-500',
    active: 'bg-green-500',
    resolved: 'bg-slate-500',
    dismissed: 'bg-slate-600',
    on_patrol: 'bg-green-500',
    stationed: 'bg-blue-500',
    responding: 'bg-amber-500',
    off_duty: 'bg-slate-500',
    completed: 'bg-green-500',
    missed: 'bg-red-500',
    upcoming: 'bg-slate-500',
    late: 'bg-amber-500',
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {['online', 'active', 'on_patrol', 'responding'].includes(status) && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status] || 'bg-slate-500'} opacity-40`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status] || 'bg-slate-500'}`} />
    </span>
  )
}

function DetectionIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    person: <User size={14} />,
    vehicle: <Car size={14} />,
    loitering: <Clock size={14} />,
    zone_breach: <Crosshair size={14} />,
    plate_read: <Car size={14} />,
  }
  return <>{iconMap[type] || <Eye size={14} />}</>
}

function formatTime(timestamp: string) {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDateTime(timestamp: string) {
  const d = new Date(timestamp)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function ClientPortal() {
  const [selectedProperty, setSelectedProperty] = useState('nv-5')
  const [activeTab, setActiveTab] = useState<'overview' | 'detections' | 'patrols' | 'incidents' | 'cameras' | 'vehicles'>('overview')
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today')
  const [showReportModal, setShowReportModal] = useState(false)
  const [liveMode, setLiveMode] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [detectionFilter, setDetectionFilter] = useState<string>('all')

  // Simulate live updates
  useEffect(() => {
    if (!liveMode) return
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [liveMode])

  const completedCheckpoints = PATROL_CHECKPOINTS.filter(cp => cp.status === 'completed').length
  const totalCheckpoints = PATROL_CHECKPOINTS.length
  const patrolComplianceRate = Math.round((completedCheckpoints / totalCheckpoints) * 100)
  const onlineCameras = CAMERAS.filter(c => c.status === 'online').length
  const totalDetections24h = CAMERAS.reduce((sum, c) => sum + c.detections24h, 0)
  const avgResponseTime = '2m 01s'
  const currentProperty = PROPERTIES.find(p => p.id === selectedProperty) || PROPERTIES[0]

  const filteredDetections = AI_DETECTIONS.filter(d => {
    if (detectionFilter !== 'all' && d.type !== detectionFilter) return false
    if (searchQuery && !d.details.toLowerCase().includes(searchQuery.toLowerCase()) && !d.camera.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-5">
      {/* ═══ HEADER BAR ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Security Command Portal</h1>
              <p className="text-secondary text-sm">Northview REIT — AI-Powered Monitoring & Reporting</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live indicator */}
          <button onClick={() => setLiveMode(!liveMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${liveMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600'}`}>
            {liveMode ? <><Radio size={12} className="animate-pulse" /> LIVE</> : <><Pause size={12} /> PAUSED</>}
          </button>
          {/* Time range */}
          <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-default">
            {(['today', '7d', '30d'] as const).map(range => (
              <button key={range} onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${timeRange === range ? 'bg-blue-500 text-white' : 'text-secondary hover:text-primary'}`}>
                {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          {/* Property selector */}
          <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-3 py-1.5 bg-secondary/50 rounded-lg border border-default text-primary text-sm focus:outline-none focus:border-blue-500">
            {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {/* Generate Report */}
          <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            <FileText size={14} /> Report
          </button>
        </div>
      </div>

      {/* ═══ EXECUTIVE KPI STRIP ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'AI Detections', value: totalDetections24h.toString(), sub: 'Last 24h', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: '+12%', trendUp: true, sparkData: DAILY_METRICS.map(m => m.detections) },
          { label: 'Active Incidents', value: INCIDENTS.filter(i => i.status === 'open' || i.status === 'investigating').length.toString(), sub: 'Requires attention', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: '-25%', trendUp: false, sparkData: DAILY_METRICS.map(m => m.incidents) },
          { label: 'Patrol Compliance', value: `${patrolComplianceRate}%`, sub: `${completedCheckpoints}/${totalCheckpoints} checkpoints`, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', trend: '+2%', trendUp: true, sparkData: [95, 100, 100, 98, 100, 100, patrolComplianceRate] },
          { label: 'Avg Response', value: avgResponseTime, sub: 'Guard dispatch', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: '-18%', trendUp: false, sparkData: DAILY_METRICS.map(m => m.responseTime || 0) },
          { label: 'Cameras Online', value: `${onlineCameras}/${CAMERAS.length}`, sub: 'All systems operational', icon: Camera, color: 'text-cyan-400', bg: 'bg-cyan-500/10', trend: '100%', trendUp: true, sparkData: [8, 8, 8, 7, 8, 8, 8] },
          { label: 'Guards On Duty', value: GUARD_ACTIVITY.filter(g => g.status !== 'off_duty').length.toString(), sub: 'GPS verified', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: '—', trendUp: true, sparkData: [1, 1, 2, 1, 1, 1, 1] },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card rounded-xl p-4 border border-default hover:border-slate-600 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${kpi.trendUp ? (kpi.label === 'Avg Response' || kpi.label === 'Active Incidents' ? 'text-green-400' : 'text-green-400') : (kpi.label === 'Avg Response' || kpi.label === 'Active Incidents' ? 'text-green-400' : 'text-red-400')}`}>
                {kpi.trend !== '—' && (kpi.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />)}
                {kpi.trend}
              </div>
            </div>
            <p className="text-xl font-bold text-primary">{kpi.value}</p>
            <p className="text-[11px] text-secondary mt-0.5">{kpi.sub}</p>
            <div className="mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <MiniBarChart data={kpi.sparkData} height={24} color={kpi.color.includes('blue') ? '#3b82f6' : kpi.color.includes('amber') ? '#f59e0b' : kpi.color.includes('green') ? '#22c55e' : kpi.color.includes('purple') ? '#a855f7' : kpi.color.includes('cyan') ? '#06b6d4' : '#10b981'} />
            </div>
          </div>
        ))}
      </div>

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1 border border-default overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'detections', label: 'AI Detections', icon: Zap },
          { key: 'patrols', label: 'Patrol Log', icon: MapPin },
          { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
          { key: 'cameras', label: 'Cameras', icon: Camera },
          { key: 'vehicles', label: 'Vehicles', icon: Car },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-secondary hover:text-primary hover:bg-secondary/50'}`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column: Live AI Feed + Patrol Progress */}
          <div className="lg:col-span-2 space-y-5">
            {/* Live AI Detection Feed */}
            <div className="bg-card rounded-xl border border-default">
              <div className="p-4 border-b border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-blue-400" />
                  <h3 className="font-semibold text-primary text-sm">Live AI Detection Feed</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold">{AI_DETECTIONS.length} events</span>
                </div>
                <p className="text-secondary text-[11px]">Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>
              </div>
              <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
                {AI_DETECTIONS.slice(0, 6).map(det => (
                  <div key={det.id} className="p-3 hover:bg-slate-800/40 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <StatusDot status={det.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
                            <DetectionIcon type={det.type} />
                            <span className="capitalize">{det.type.replace('_', ' ')}</span>
                          </div>
                          <SeverityBadge severity={det.severity} />
                          <span className="text-[10px] text-secondary bg-slate-800 px-1.5 py-0.5 rounded">{det.confidence.toFixed(1)}%</span>
                        </div>
                        <p className="text-secondary text-xs leading-relaxed">{det.details}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Camera size={10} /> {det.camera}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin size={10} /> {det.zone}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {formatTime(det.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Eye size={13} /></button>
                        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Play size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-default">
                <button onClick={() => setActiveTab('detections')} className="w-full text-center text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center justify-center gap-1">
                  View All Detections <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* 7-Day Trend Chart */}
            <div className="bg-card rounded-xl border border-default p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-400" /> 7-Day Activity Trend
                </h3>
              </div>
              <div className="h-48">
                <svg width="100%" height="100%" viewBox="0 0 700 180" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="40" y1={20 + i * 35} x2="690" y2={20 + i * 35} stroke="#1e293b" strokeWidth="1" />
                  ))}
                  {/* Y-axis labels */}
                  {[200, 150, 100, 50, 0].map((val, i) => (
                    <text key={i} x="35" y={24 + i * 35} textAnchor="end" fill="#64748b" fontSize="10">{val}</text>
                  ))}
                  {/* Bars - Detections */}
                  {DAILY_METRICS.map((m, i) => {
                    const maxVal = 210
                    const barH = (m.detections / maxVal) * 140
                    const x = 60 + i * 92
                    return (
                      <g key={i}>
                        <rect x={x} y={160 - barH} width={36} height={barH} fill="#3b82f6" opacity={0.7} rx={3} />
                        {m.incidents > 0 && (
                          <circle cx={x + 18} cy={160 - barH - 10} r={4} fill="#ef4444" />
                        )}
                        <text x={x + 18} y={175} textAnchor="middle" fill="#94a3b8" fontSize="10">{m.date.split(' ')[1]}</text>
                        <text x={x + 18} y={156 - barH} textAnchor="middle" fill="#94a3b8" fontSize="9">{m.detections}</text>
                      </g>
                    )
                  })}
                  {/* Legend */}
                  <rect x="540" y="5" width="10" height="10" fill="#3b82f6" rx="2" />
                  <text x="555" y="14" fill="#94a3b8" fontSize="10">Detections</text>
                  <circle cx="625" cy="10" r="4" fill="#ef4444" />
                  <text x="634" y="14" fill="#94a3b8" fontSize="10">Incidents</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Right column: Patrol Progress + Guard Status + System Health */}
          <div className="space-y-5">
            {/* Patrol Progress Ring */}
            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2 mb-4">
                <CheckCircle size={16} className="text-green-400" /> Patrol Progress
              </h3>
              <div className="flex items-center gap-6">
                <CircularProgress value={patrolComplianceRate} size={90} color="#22c55e" />
                <div>
                  <p className="text-2xl font-bold text-primary">{completedCheckpoints}/{totalCheckpoints}</p>
                  <p className="text-secondary text-xs">Checkpoints completed</p>
                  <p className="text-green-400 text-xs mt-1 font-medium">All GPS verified</p>
                  <p className="text-secondary text-[10px] mt-0.5">Next: {PATROL_CHECKPOINTS.find(cp => cp.status === 'upcoming')?.name || 'Complete'} at {PATROL_CHECKPOINTS.find(cp => cp.status === 'upcoming')?.scheduledTime || '—'}</p>
                </div>
              </div>
              {/* Mini checkpoint timeline */}
              <div className="mt-4 flex items-center gap-0.5">
                {PATROL_CHECKPOINTS.map(cp => (
                  <div key={cp.id} className="flex-1" title={`${cp.name} — ${cp.status}`}>
                    <div className={`h-2 rounded-full ${cp.status === 'completed' ? 'bg-green-500' : cp.status === 'missed' ? 'bg-red-500' : cp.status === 'late' ? 'bg-amber-500' : 'bg-slate-700'}`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">11:00 PM</span>
                <span className="text-[10px] text-slate-500">7:00 AM</span>
              </div>
            </div>

            {/* Guard On Duty */}
            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2 mb-4">
                <Users size={16} className="text-emerald-400" /> Guard On Duty
              </h3>
              {GUARD_ACTIVITY.map(guard => (
                <div key={guard.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {guard.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-primary font-medium text-sm">{guard.name}</p>
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={guard.status} />
                        <span className="text-secondary text-xs capitalize">{guard.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-500">Location</p>
                      <p className="text-xs text-primary font-medium flex items-center gap-1"><MapPin size={10} className="text-green-400" /> {guard.currentLocation}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-500">Shift</p>
                      <p className="text-xs text-primary font-medium">{guard.shiftStart} — {guard.shiftEnd}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-500">Avg Response</p>
                      <p className="text-xs text-primary font-medium">{guard.responseTimeAvg}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-500">Last Check-in</p>
                      <p className="text-xs text-primary font-medium">{guard.lastCheckIn}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* System Health */}
            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2 mb-4">
                <Activity size={16} className="text-cyan-400" /> System Health
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'AI Detection Engine', status: 'Operational', icon: Zap, color: 'text-green-400' },
                  { label: 'Camera Network', status: `${onlineCameras}/${CAMERAS.length} Online`, icon: Camera, color: 'text-green-400' },
                  { label: 'GPS Tracking', status: 'Active', icon: MapPin, color: 'text-green-400' },
                  { label: 'License Plate Reader', status: 'Operational', icon: Car, color: 'text-green-400' },
                  { label: 'Alert System (Twilio)', status: 'Connected', icon: Bell, color: 'text-green-400' },
                ].map((sys, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <sys.icon size={14} className="text-slate-400" />
                      <span className="text-xs text-primary">{sys.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${sys.color}`}>{sys.status}</span>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flagged Vehicles Summary */}
            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2 mb-4">
                <Car size={16} className="text-amber-400" /> Flagged Vehicles
              </h3>
              <div className="space-y-2">
                {FLAGGED_VEHICLES.filter(v => !v.inDatabase).map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div>
                      <p className="text-primary text-sm font-mono font-bold">{v.plate}</p>
                      <p className="text-secondary text-[10px]">{v.type} — {v.time}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">{v.status}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setActiveTab('vehicles')} className="w-full text-center text-blue-400 hover:text-blue-300 text-xs font-medium mt-3 flex items-center justify-center gap-1">
                View All Vehicles <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI DETECTIONS TAB ─── */}
      {activeTab === 'detections' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search detections..."
                className="w-full pl-9 pr-3 py-2 bg-secondary/50 rounded-lg border border-default text-primary text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex bg-secondary/30 rounded-lg p-0.5 border border-default">
              {['all', 'person', 'vehicle', 'loitering', 'zone_breach', 'plate_read'].map(filter => (
                <button key={filter} onClick={() => setDetectionFilter(filter)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${detectionFilter === filter ? 'bg-blue-500 text-white' : 'text-secondary hover:text-primary'}`}>
                  {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Detection List */}
          <div className="bg-card rounded-xl border border-default divide-y divide-slate-800">
            {filteredDetections.map(det => (
              <div key={det.id} className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer group">
                <div className="flex items-start gap-4">
                  {/* Thumbnail placeholder */}
                  <div className="w-20 h-14 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-700">
                    <Camera size={20} className="text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-primary font-medium">
                        <DetectionIcon type={det.type} />
                        <span className="capitalize">{det.type.replace('_', ' ')}</span>
                      </div>
                      <SeverityBadge severity={det.severity} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${det.status === 'active' ? 'bg-green-500/20 text-green-400' : det.status === 'resolved' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-600/20 text-slate-500'}`}>
                        {det.status}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Confidence: {det.confidence.toFixed(1)}%</span>
                    </div>
                    <p className="text-secondary text-sm leading-relaxed">{det.details}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Camera size={11} /> {det.camera}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} /> {det.zone}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} /> {formatDateTime(det.timestamp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 hover:bg-slate-700 rounded text-slate-400 transition-colors" title="View snapshot"><Eye size={15} /></button>
                    <button className="p-2 hover:bg-slate-700 rounded text-slate-400 transition-colors" title="View clip"><Play size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PATROL LOG TAB ─── */}
      {activeTab === 'patrols' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Checkpoint Timeline */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-default">
            <div className="p-4 border-b border-default">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
                <MapPin size={16} className="text-green-400" /> Patrol Checkpoint Log — Overnight Shift
              </h3>
              <p className="text-secondary text-xs mt-1">Guard: J. Smith — Shift: 11:00 PM - 7:00 AM</p>
            </div>
            <div className="divide-y divide-slate-800">
              {PATROL_CHECKPOINTS.map((cp, idx) => (
                <div key={cp.id} className="p-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-xs text-slate-500 font-mono">{idx + 1}</span>
                  </div>
                  <div className="flex-shrink-0">
                    {cp.status === 'completed' ? (
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle size={15} className="text-green-400" /></div>
                    ) : cp.status === 'missed' ? (
                      <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"><XCircle size={15} className="text-red-400" /></div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center"><Clock size={15} className="text-slate-500" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-primary text-sm font-medium">{cp.name}</p>
                    <p className="text-secondary text-xs">Scheduled: {cp.scheduledTime}</p>
                  </div>
                  <div className="text-right">
                    {cp.actualTime ? (
                      <>
                        <p className="text-primary text-sm font-mono">{cp.actualTime}</p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          {cp.gpsVerified && <MapPin size={10} className="text-green-400" />}
                          <span className="text-[10px] text-green-400">GPS Verified</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patrol Summary */}
          <div className="space-y-5">
            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm mb-4">Shift Summary</h3>
              <div className="flex justify-center mb-4">
                <CircularProgress value={patrolComplianceRate} size={110} color="#22c55e" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-secondary">Completed</span><span className="text-green-400 font-semibold">{completedCheckpoints}</span></div>
                <div className="flex justify-between text-sm"><span className="text-secondary">Remaining</span><span className="text-slate-400 font-semibold">{totalCheckpoints - completedCheckpoints}</span></div>
                <div className="flex justify-between text-sm"><span className="text-secondary">Missed</span><span className="text-green-400 font-semibold">0</span></div>
                <div className="flex justify-between text-sm"><span className="text-secondary">Late</span><span className="text-green-400 font-semibold">0</span></div>
                <div className="border-t border-default pt-2 mt-2">
                  <div className="flex justify-between text-sm"><span className="text-secondary">Avg Deviation</span><span className="text-primary font-semibold">+1.4 min</span></div>
                  <div className="flex justify-between text-sm"><span className="text-secondary">GPS Accuracy</span><span className="text-green-400 font-semibold">100%</span></div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-default p-5">
              <h3 className="font-semibold text-primary text-sm mb-3">30-Day Compliance</h3>
              <MiniLineChart data={[95, 100, 100, 98, 100, 100, 97, 100, 98, 100, 100, 100, 95, 100, patrolComplianceRate]} height={60} color="#22c55e" />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-500">30d ago</span>
                <span className="text-[10px] text-slate-500">Today</span>
              </div>
              <p className="text-xs text-secondary mt-2">Average: <span className="text-green-400 font-semibold">98.7%</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ─── INCIDENTS TAB ─── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-default divide-y divide-slate-800">
            {INCIDENTS.map(inc => (
              <div key={inc.id} className="p-5 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className={inc.severity === 'high' ? 'text-amber-400' : inc.severity === 'critical' ? 'text-red-400' : 'text-blue-400'} />
                    <h4 className="text-primary font-semibold">{inc.type}</h4>
                    <SeverityBadge severity={inc.severity} />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inc.status === 'open' ? 'bg-amber-500/20 text-amber-400' : inc.status === 'investigating' ? 'bg-blue-500/20 text-blue-400' : inc.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {inc.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDateTime(inc.timestamp)}</span>
                </div>
                <p className="text-secondary text-sm mb-3">{inc.description}</p>
                <div className="flex items-center gap-6 text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> {inc.location}</span>
                  <span className="text-slate-400 flex items-center gap-1"><User size={12} /> {inc.assignedGuard}</span>
                  <span className="text-slate-400 flex items-center gap-1"><Clock size={12} /> Response: <span className="text-primary font-medium">{inc.responseTime}</span></span>
                  {inc.hasVideo && <span className="text-blue-400 flex items-center gap-1 cursor-pointer hover:text-blue-300"><Play size={12} /> Video</span>}
                  {inc.hasSnapshot && <span className="text-blue-400 flex items-center gap-1 cursor-pointer hover:text-blue-300"><Camera size={12} /> Snapshot</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CAMERAS TAB ─── */}
      {activeTab === 'cameras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAMERAS.map(cam => (
            <div key={cam.id} className="bg-card rounded-xl border border-default p-4 hover:border-slate-600 transition-colors group">
              {/* Camera preview placeholder */}
              <div className="w-full h-28 bg-slate-800 rounded-lg mb-3 flex items-center justify-center border border-slate-700 relative overflow-hidden">
                <Camera size={28} className="text-slate-600" />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <StatusDot status={cam.status} />
                  <span className="text-[9px] text-green-400 font-medium uppercase">{cam.status}</span>
                </div>
                {cam.aiEnabled && (
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-400 font-semibold flex items-center gap-1"><Zap size={8} /> AI</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-[10px] font-medium">{cam.name}</p>
                </div>
              </div>
              <p className="text-xs text-secondary mb-2 flex items-center gap-1"><MapPin size={10} /> {cam.location}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/60 rounded p-2">
                  <p className="text-[10px] text-slate-500">24h Detections</p>
                  <p className="text-sm font-bold text-primary">{cam.detections24h}</p>
                </div>
                <div className="bg-slate-800/60 rounded p-2">
                  <p className="text-[10px] text-slate-500">Last Event</p>
                  <p className="text-sm font-medium text-primary">{cam.lastDetection}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── VEHICLES TAB ─── */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-default p-4">
              <p className="text-secondary text-xs">Plates Scanned (24h)</p>
              <p className="text-2xl font-bold text-primary mt-1">47</p>
              <MiniBarChart data={[8, 12, 6, 3, 2, 4, 12]} height={24} color="#3b82f6" />
            </div>
            <div className="bg-card rounded-xl border border-default p-4">
              <p className="text-secondary text-xs">Authorized</p>
              <p className="text-2xl font-bold text-green-400 mt-1">44</p>
              <p className="text-[10px] text-secondary mt-1">In tenant database</p>
            </div>
            <div className="bg-card rounded-xl border border-default p-4">
              <p className="text-secondary text-xs">Flagged / Unknown</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">3</p>
              <p className="text-[10px] text-secondary mt-1">Requires review</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-default">
            <div className="p-4 border-b border-default">
              <h3 className="font-semibold text-primary text-sm">Vehicle Log</h3>
            </div>
            <div className="divide-y divide-slate-800">
              {FLAGGED_VEHICLES.map((v, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${v.inDatabase ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                      <Car size={18} className={v.inDatabase ? 'text-green-400' : 'text-amber-400'} />
                    </div>
                    <div>
                      <p className="text-primary font-mono font-bold text-lg">{v.plate}</p>
                      <p className="text-secondary text-xs">{v.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v.inDatabase ? 'bg-green-500/20 text-green-400' : v.status === 'Flagged' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {v.inDatabase ? 'Authorized' : v.status}
                    </span>
                    <p className="text-slate-500 text-xs mt-1">{v.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ REPORT GENERATION MODAL ═══ */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-default max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-default flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">Generate Security Report</h3>
                <p className="text-secondary text-xs mt-0.5">{currentProperty.name}</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Report Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Daily', 'Weekly', 'Monthly'].map(type => (
                    <button key={type} className="px-3 py-2.5 rounded-lg border border-default text-sm font-medium text-primary hover:border-blue-500 hover:bg-blue-500/10 transition-colors">
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Include Sections</label>
                <div className="space-y-2">
                  {['Executive Summary', 'AI Detection Log', 'Patrol Compliance', 'Incident Reports', 'Vehicle Activity', 'Camera System Status', 'Guard Performance'].map(section => (
                    <label key={section} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-600 text-blue-500 bg-secondary" />
                      <span className="text-sm text-primary">{section}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                    <Download size={14} /> PDF
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 border border-default text-primary rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                    <Download size={14} /> Excel
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 border border-default text-primary rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                    <ExternalLink size={14} /> Email
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-default bg-secondary/20 rounded-b-2xl">
              <p className="text-[10px] text-slate-500 text-center">Reports auto-generated daily at 7:00 AM and emailed to portal administrators</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="flex items-center justify-between py-3 border-t border-default">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-700 rounded flex items-center justify-center">
            <Shield size={11} className="text-white" />
          </div>
          <span className="text-[11px] text-slate-500">Powered by <span className="text-blue-400 font-semibold">Stigg OS</span> — AI Security Intelligence Platform</span>
        </div>
        <span className="text-[10px] text-slate-600">Last sync: {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
