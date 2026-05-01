import React, { useState, useEffect } from 'react'
import {
  Shield, Camera, AlertTriangle, Activity, Users, Clock, MapPin,
  ChevronRight, Eye, Download, FileText, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Radio, Zap, Bell, Search, Filter, Calendar,
  BarChart3, Crosshair, Car, User, RefreshCw, ArrowUpRight, ArrowDownRight,
  Wifi, WifiOff, Sun, Moon, ChevronDown, X, ExternalLink, Play, Pause
} from 'lucide-react'

// âââ TYPES ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââ DEMO DATA ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const PROPERTIES = [
  { id: 'nv-5', name: 'Northview Tower 5', address: '10205 101 St NW', cameras: 12, guards: 2 },
  { id: 'nv-7', name: 'Northview Tower 7', address: '10425 100 Ave NW', cameras: 8, guards: 1 },
  { id: 'nv-12', name: 'Northview Tower 12', address: '11215 Jasper Ave', cameras: 10, guards: 2 },
]

const AI_DETECTIONS: AIDetectionEvent[] = [
  { id: 'det-1', timestamp: '2026-05-01T02:47:00', camera: 'Parking Cam 4', type: 'person', confidence: 94.2, zone: 'Parking Zone B', status: 'resolved', details: 'Individual detected loitering >5 min. Guard dispatched â tenant guest verified.', severity: 'high' },
  { id: 'det-2', timestamp: '2026-05-01T02:31:00', camera: 'Lobby Cam 1', type: 'person', confidence: 98.7, zone: 'Main Entrance', status: 'resolved', details: 'Authorized tenant entry. Face matched to resident database.', severity: 'info' },
  { id: 'det-3', timestamp: '2026-05-01T01:52:00', camera: 'Perimeter Cam N', type: 'zone_breach', confidence: 91.5, zone: 'North Fence Line', status: 'resolved', details: 'Motion at fence line â animal (coyote) confirmed via AI classification.', severity: 'low' },
  { id: 'det-4', timestamp: '2026-05-01T01:30:00', camera: 'Parking Cam 2', type: 'plate_read', confidence: 99.1, zone: 'Parking Entry', status: 'active', details: 'Plate ABC-1234 (Black SUV) â NOT in tenant database. Flagged for review.', severity: 'medium' },
  { id: 'det-5', timestamp: '2026-05-01T00:45:00', camera: 'Loading Dock', type: 'vehicle', confidence: 96.8, zone: 'Service Area', status: 'dismissed', details: 'Delivery vehicle detected at loading dock. Scheduled delivery confirmed.', severity: 'info' },
  { id: 'det-6', timestamp: '2026-04-30T23:15:00', camera: 'Parking Cam 3', type: 'loitering', confidence: 88.3, zone: 'Parking Zone A', status: 'resolved', details: 'Person in Zone A >3 min threshold. Guard responded â maintenance worker on authorized overtime.', severity: 'medium' },
  { id: 'det-7', timestamp: '2026-04-30T22:30:00', camera: 'Stairwell B', type: 'person', confidence: 95.1, zone: 'Stairwell Access', status: 'resolved', details: 'Unauthorized access attempt to mechanical room. Door remained locked. Guard alerted.', severity: 'high' },
  { id: 'det-8', timestamp: '2026-04-30T21:08:00', camera: 'Parking Cam 2', type: 'plate_read', confidence: 99.4, zone: 'Parking Entry', status: 'resolved', details: 'Plate XYZ-5678 (White Van) â tenant registered vehicle confirmed.', severity: 'info' },
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
  { id: 'inc-1', timestamp: '2026-05-01T02:47:00', type: 'Suspicious Person', location: 'Parking Zone B', severity: 'high', status: 'resolved', assignedGuard: 'J. Smith', responseTime: '2m 14s', description: 'Unknown individual loitering in parking zone. Guard dispatched â verified as tenant guest.', hasVideo: true, hasSnapshot: true },
  { id: 'inc-2', timestamp: '2026-04-30T22:30:00', type: 'Unauthorized Access Attempt', location: 'Stairwell B', severity: 'high', status: 'closed', assignedGuard: 'J. Smith', responseTime: '1m 48s', description: 'Attempted access to mechanical room via stairwell. Door secured. Individual could not be located.', hasVideo: true, hasSnapshot: true },
  { id: 'inc-3', timestamp: '2026-04-29T14:20:00', type: 'Maintenance Issue', location: 'Parking Level 1', severity: 'low', status: 'open', assignedGuard: 'K. Osei', responseTime: 'â', description: 'Broken light fixture in parking level 1, section C. Reported to property management.', hasVideo: false, hasSnapshot: true },
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

// âââ HELPER COMPONENTS ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââ MAIN COMPONENT âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
      {/* âââ HEADER BAR âââ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Security Command Portal</h1>
              <p className="text-secondary text-sm">Northview REIT â AI-Powered Monitoring & Reporting</p>
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

      {/* âââ EXECUTIVE KPI STRIP âââ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'AI Detections', value: totalDetections24h.toString(), sub: 'Last 24h', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: '+12%', trendUp: true, sparkData: DAILY_METRICS.map(m => m.detections) },
          { label: 'Active Incidents', value: INCIDENTS.filter(i => i.status === 'open' || i.status === 'investigating').length.toString(), sub: 'Requires attention', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', trend: '-25%', trendUp: false, sparkData: DAILY_METRICS.map(m => m.incidents) },
          { label: 'Patrol Compliance', value: `${patrolComplianceRate}%`, sub: `${completedCheckpoints}/${totalCheckpoints} checkpoints`, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', trend: '+2%', trendUp: true, sparkData: [95, 100, 100, 98, 100, 100, patrolComplianceRate] },
          { label: 'Avg Response', value: avgResponseTime, sub: 'Guard dispatch', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: '-18%', trendUp: false, sparkData: DAILY_METRICS.map(m => m.responseTime || 0) },
          { label: 'Cameras Online', value: `${onlineCameras}/${CAMERAS.length}`, sub: 'All systems operational', icon: Camera, color: 'text-cyan-400', bg: 'bg-cyan-500/10', trend: '100%', trendUp: true, sparkData: [8, 8, 8, 7, 8, 8, 8] },
          { label: 'Guards On Duty', value: GUARD_ACTIVITY.filter(g => g.status !== 'off_duty').length.toString(), sub: 'GPS verified', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'â', trendUp: true, sparkData: [1, 1, 2, 1, 1, 1, 1] },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card rounded-xl p-4 border border-default hover:border-slate-600 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${kpi.trendUp ? (kpi.label === 'Avg Response' || kpi.label === 'Active Incidents' ? 'text-green-400' : 'text-green-400') : (kpi.label === 'Avg Response' || kpi.label === 'Active Incidents' ? 'text-green-400' : 'text-red-400')}`}>
                {kpi.trend !== 'â' && (kpi.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />)}
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

      {/* âââ TAB NAVIGATION âââ */}
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

      {/* âââ TAB CONTENT âââ */}

      {/* âââ OVERVIEW TAB âââ */}
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
                  <p className="text-secondary text-[10px] mt-0.5">Next: {PATROL_CHECKPOINTS.find(cp => cp.status === 'upcoming')?.name || 'Complete'} at {PATROL_CHECKPOINTS.find(cp => cp.status === 'upcoming')?.scheduledTime || 'â'}</p>
                </div>
              </div>
              {/* Mini checkpoint timeline */}
              <div className="mt-4 flex items-center gap-0.5">
                {PATROL_CHECKPOINTS.map(cp => (
                  <div key={cp.id} className="flex-1" title={`${cp.name} â t{cp.status}`}>
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
                      <p className="text-xs text-primary font-medium">{guard.shiftStart} â {guard.shiftEnd}</p>
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
                      <p className="text-secondary text-[10px]">{v.type} â {v.time}</p>
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

      {/* âââ AI DETECTIONS TAB âââ */}
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

      {/* âââ PATROL LOG TAB âââ */}
      {activeTab === 'patrols' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Checkpoint Timeline */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-default">
            <div className="p-4 border-b border-default">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
                <MapPin size={16} className="text-green-400" /> Patrol Checkpoint Log â Overnight Shift
              </h3>
              <p className="text-secondary text-xs mt-1">Guard: J. Smith â Shift: 11:00 PM - 7:00 AM</p>
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
                <div className="flex justify-between text-sm"><span className="text-secondary">Remaining</span><spanâ6Æ74æÖSÒ'FWB×6ÆFRÓCföçB×6VÖ&öÆB#ç·F÷FÄ6V6·öçG2Ò6ö×ÆWFVD6V6·öçG7ÓÂ÷7ããÂöFcà¢ÆFb6Æ74æÖSÒ&fÆW§W7FgÖ&WGvVVâFWB×6Ò#ãÇ7â6Æ74æÖSÒ'FWB×6V6öæF'#äÖ76VCÂ÷7ããÇ7â6Æ74æÖSÒ'FWBÖw&VVâÓCföçB×6VÖ&öÆB#ãÂ÷7ããÂöFcà¢ÆFb6Æ74æÖSÒ&fÆW§W7FgÖ&WGvVVâFWB×6Ò#ãÇ7â6Æ74æÖSÒ'FWB×6V6öæF'#äÆFSÂ÷7ããÇ7â6Æ74æÖSÒ'FWBÖw&VVâÓCföçB×6VÖ&öÆB#ãÂ÷7ããÂöFcà¢ÆFb6Æ74æÖSÒ&&÷&FW"×B&÷&FW"ÖFVfVÇBBÓ"×BÓ"#à¢ÆFb6Æ74æÖSÒ&fÆW§W7FgÖ&WGvVVâFWB×6Ò#ãÇ7â6Æ74æÖSÒ'FWB×6V6öæF'#äfrFWfFöãÂ÷7ããÇ7â6Æ74æÖSÒ'FWB×&Ö'föçB×6VÖ&öÆB#â³ãBÖãÂ÷7ããÂöFcà¢ÆFb6Æ74æÖSÒ&fÆW§W7FgÖ&WGvVVâFWB×6Ò#ãÇ7â6Æ74æÖSÒ'FWB×6V6öæF'#äu267W&7Â÷7ããÇ7â6Æ74æÖSÒ'FWBÖw&VVâÓCföçB×6VÖ&öÆB#ãSÂ÷7ããÂöFcà¢ÂöFcà¢ÂöFcà¢ÂöFcà ¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBÓR#à¢Æ26Æ74æÖSÒ&föçB×6VÖ&öÆBFWB×&Ö'FWB×6ÒÖ"Ó2#ã3ÔF6ö×Ææ6SÂö3à¢ÄÖæÆæT6'BFF×µ³RÂÂÂÂÂÂrÂÂÂÂÂÂRÂÂG&öÄ6ö×Ææ6U&FU×ÒVvC×³cÒ6öÆ÷#Ò"3#&3SVR"óà¢ÆFb6Æ74æÖSÒ&fÆW§W7FgÖ&WGvVVâ×BÓ"#à¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓS#ã3BvóÂ÷7ãà¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓS#åFöFÂ÷7ãà¢ÂöFcà¢Ç6Æ74æÖSÒ'FWB×2FWB×6V6öæF'×BÓ"#äfW&vS¢Ç7â6Æ74æÖSÒ'FWBÖw&VVâÓCföçB×6VÖ&öÆB#ããrSÂ÷7ããÂ÷à¢ÂöFcà¢ÂöFcà¢ÂöFcà¢Ð ¢²ò¢)H)H)Hä4DTåE2D")H)H)H¢÷Ð¢¶7FfUF"ÓÓÒvæ6FVçG2rbb¢ÆFb6Æ74æÖSÒ'76R×ÓB#à¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBFfFR×FfFR×6ÆFRÓ#à¢´ä4DTåE2æÖæ2Óâ¢ÆFb¶W×¶æ2æGÒ6Æ74æÖSÒ'ÓR÷fW#¦&r×6ÆFRÓó#G&ç6FöâÖ6öÆ÷'2#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2×7F'B§W7FgÖ&WGvVVâÖ"Ó"#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ"#à¢ÄÆW'EG&ævÆR6¦S×³gÒ6Æ74æÖS×¶æ2ç6WfW&GÓÓÒvvròwFWBÖÖ&W"ÓCr¢æ2ç6WfW&GÓÓÒv7&F6ÂròwFWB×&VBÓCr¢wFWBÖ&ÇVRÓCwÒóà¢ÆB6Æ74æÖSÒ'FWB×&Ö'föçB×6VÖ&öÆB#ç¶æ2çGWÓÂöCà¢Å6WfW&G&FvR6WfW&G×¶æ2ç6WfW&GÒóà¢Ç7â6Æ74æÖS×¶FWBÕ³ÒÓ"ÓãR&÷VæFVBÖgVÆÂföçBÖÖVFVÒG¶æ2ç7FGW2ÓÓÒv÷Vâròv&rÖÖ&W"ÓSó#FWBÖÖ&W"ÓCr¢æ2ç7FGW2ÓÓÒvçfW7FvFærròv&rÖ&ÇVRÓSó#FWBÖ&ÇVRÓCr¢æ2ç7FGW2ÓÓÒw&W6öÇfVBròv&rÖw&VVâÓSó#FWBÖw&VVâÓCr¢v&r×6ÆFRÓSó#FWB×6ÆFRÓCwÖÓà¢¶æ2ç7FGW7Ð¢Â÷7ãà¢ÂöFcà¢Ç7â6Æ74æÖSÒ'FWB×2FWB×6ÆFRÓS#ç¶f÷&ÖDFFUFÖRæ2çFÖW7F×ÓÂ÷7ãà¢ÂöFcà¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×6ÒÖ"Ó2#ç¶æ2æFW67&FöçÓÂ÷à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓbFWB×2#à¢Ç7â6Æ74æÖSÒ'FWB×6ÆFRÓCfÆWFV×2Ö6VçFW"vÓ#ãÄÖâ6¦S×³'Òóâ¶æ2æÆö6FöçÓÂ÷7ãà¢Ç7â6Æ74æÖSÒ'FWB×6ÆFRÓCfÆWFV×2Ö6VçFW"vÓ#ãÅW6W"6¦S×³'Òóâ¶æ2æ76væVDwV&GÓÂ÷7ãà¢Ç7â6Æ74æÖSÒ'FWB×6ÆFRÓCfÆWFV×2Ö6VçFW"vÓ#ãÄ6Æö6²6¦S×³'Òóâ&W7öç6S¢Ç7â6Æ74æÖSÒ'FWB×&Ö'föçBÖÖVFVÒ#ç¶æ2ç&W7öç6UFÖWÓÂ÷7ããÂ÷7ãà¢¶æ2æ5fFVòbbÇ7â6Æ74æÖSÒ'FWBÖ&ÇVRÓCfÆWFV×2Ö6VçFW"vÓ7W'6÷"×öçFW"÷fW#§FWBÖ&ÇVRÓ3#ãÅÆ6¦S×³'ÒóâfFVóÂ÷7ãçÐ¢¶æ2æ56æ6÷BbbÇ7â6Æ74æÖSÒ'FWBÖ&ÇVRÓCfÆWFV×2Ö6VçFW"vÓ7W'6÷"×öçFW"÷fW#§FWBÖ&ÇVRÓ3#ãÄ6ÖW&6¦S×³'Òóâ6æ6÷CÂ÷7ãçÐ¢ÂöFcà¢ÂöFcà¢Ð¢ÂöFcà¢ÂöFcà¢Ð ¢²ò¢)H)H)H4ÔU$2D")H)H)H¢÷Ð¢¶7FfUF"ÓÓÒv6ÖW&2rbb¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2ÓÖC¦w&BÖ6öÇ2Ó"Æs¦w&BÖ6öÇ2ÓBvÓB#à¢´4ÔU$2æÖ6ÒÓâ¢ÆFb¶W×¶6ÒæGÒ6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBÓB÷fW#¦&÷&FW"×6ÆFRÓcG&ç6FöâÖ6öÆ÷'2w&÷W#à¢²ò¢6ÖW&&WfWrÆ6VöÆFW"¢÷Ð¢ÆFb6Æ74æÖSÒ'rÖgVÆÂÓ#&r×6ÆFRÓ&÷VæFVBÖÆrÖ"Ó2fÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"&÷&FW"&÷&FW"×6ÆFRÓs&VÆFfR÷fW&fÆ÷rÖFFVâ#à¢Ä6ÖW&6¦S×³#Ò6Æ74æÖSÒ'FWB×6ÆFRÓc"óà¢ÆFb6Æ74æÖSÒ&'6öÇWFRF÷Ó"ÆVgBÓ"fÆWFV×2Ö6VçFW"vÓ#à¢Å7FGW4F÷B7FGW3×¶6Òç7FGW7Òóà¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒFWBÖw&VVâÓCföçBÖÖVFVÒWW&66R#ç¶6Òç7FGW7ÓÂ÷7ãà¢ÂöFcà¢¶6ÒæVæ&ÆVBbb¢ÆFb6Æ74æÖSÒ&'6öÇWFRF÷Ó"&vBÓ"#à¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒÓãRÓãR&÷VæFVB&rÖ&ÇVRÓSó3FWBÖ&ÇVRÓCföçB×6VÖ&öÆBfÆWFV×2Ö6VçFW"vÓ#ãÅ¦6¦S×³ÒóâÂ÷7ãà¢ÂöFcà¢Ð¢ÆFb6Æ74æÖSÒ&'6öÇWFR&÷GFöÒÓÆVgBÓ&vBÓ&rÖw&FVçB×Fò×Bg&öÒÖ&Æ6²ócFò×G&ç7&VçBÓ"#à¢Ç6Æ74æÖSÒ'FWB×vFRFWBÕ³ÒföçBÖÖVFVÒ#ç¶6ÒææÖWÓÂ÷à¢ÂöFcà¢ÂöFcà¢Ç6Æ74æÖSÒ'FWB×2FWB×6V6öæF'Ö"Ó"fÆWFV×2Ö6VçFW"vÓ#ãÄÖâ6¦S×³Òóâ¶6ÒæÆö6FöçÓÂ÷à¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó"vÓ"#à¢ÆFb6Æ74æÖSÒ&&r×6ÆFRÓóc&÷VæFVBÓ"#à¢Ç6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓS#ã#FFWFV7Föç3Â÷à¢Ç6Æ74æÖSÒ'FWB×6ÒföçBÖ&öÆBFWB×&Ö'#ç¶6ÒæFWFV7Föç3#FÓÂ÷à¢ÂöFcà¢ÆFb6Æ74æÖSÒ&&r×6ÆFRÓóc&÷VæFVBÓ"#à¢Ç6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓS#äÆ7BWfVçCÂ÷à¢Ç6Æ74æÖSÒ'FWB×6ÒföçBÖÖVFVÒFWB×&Ö'#ç¶6ÒæÆ7DFWFV7FöçÓÂ÷à¢ÂöFcà¢ÂöFcà¢ÂöFcà¢Ð¢ÂöFcà¢Ð ¢²ò¢)H)H)HdT4ÄU2D")H)H)H¢÷Ð¢¶7FfUF"ÓÓÒwfV6ÆW2rbb¢ÆFb6Æ74æÖSÒ'76R×ÓB#à¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2ÓÖC¦w&BÖ6öÇ2Ó2vÓB#à¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBÓB#à¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×2#åÆFW266ææVB#FÂ÷à¢Ç6Æ74æÖSÒ'FWBÓ'ÂföçBÖ&öÆBFWB×&Ö'×BÓ#ãCsÂ÷à¢ÄÖæ&$6'BFF×µ³Â"ÂbÂ2Â"ÂBÂ%×ÒVvC×³#GÒ6öÆ÷#Ò"36#&cb"óà¢ÂöFcà¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBÓB#à¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×2#äWF÷&¦VCÂ÷à¢Ç6Æ74æÖSÒ'FWBÓ'ÂföçBÖ&öÆBFWBÖw&VVâÓC×BÓ#ãCCÂ÷à¢Ç6Æ74æÖSÒ'FWBÕ³ÒFWB×6V6öæF'×BÓ#äâFVæçBFF&6SÂ÷à¢ÂöFcà¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇBÓB#à¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×2#äfÆvvVBòVæ¶æ÷vãÂ÷à¢Ç6Æ74æÖSÒ'FWBÓ'ÂföçBÖ&öÆBFWBÖÖ&W"ÓC×BÓ#ã3Â÷à¢Ç6Æ74æÖSÒ'FWBÕ³ÒFWB×6V6öæF'×BÓ#å&WV&W2&WfWsÂ÷à¢ÂöFcà¢ÂöFcà ¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVB×Â&÷&FW"&÷&FW"ÖFVfVÇB#à¢ÆFb6Æ74æÖSÒ'ÓB&÷&FW"Ö"&÷&FW"ÖFVfVÇB#à¢Æ26Æ74æÖSÒ&föçB×6VÖ&öÆBFWB×&Ö'FWB×6Ò#åfV6ÆRÆösÂö3à¢ÂöFcà¢ÆFb6Æ74æÖSÒ&FfFR×FfFR×6ÆFRÓ#à¢´dÄttTEõdT4ÄU2æÖbÂGÓâ¢ÆFb¶W×¶GÒ6Æ74æÖSÒ'ÓBfÆWFV×2Ö6VçFW"§W7FgÖ&WGvVVâ÷fW#¦&r×6ÆFRÓó#G&ç6FöâÖ6öÆ÷'2#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓB#à¢ÆFb6Æ74æÖS×¶rÓÓ&÷VæFVBÖÆrfÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"G·bæäFF&6Ròv&rÖw&VVâÓSór¢v&rÖÖ&W"ÓSówÖÓà¢Ä6"6¦S×³Ò6Æ74æÖS×·bæäFF&6RòwFWBÖw&VVâÓCr¢wFWBÖÖ&W"ÓCwÒóà¢ÂöFcà¢ÆFcà¢Ç6Æ74æÖSÒ'FWB×&Ö'föçBÖÖöæòföçBÖ&öÆBFWBÖÆr#ç·bçÆFWÓÂ÷à¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×2#ç·bçGWÓÂ÷à¢ÂöFcà¢ÂöFcà¢ÆFb6Æ74æÖSÒ'FWB×&vB#à¢Ç7â6Æ74æÖS×¶FWB×2Ó"ãRÓ&÷VæFVBÖgVÆÂföçBÖÖVFVÒG·bæäFF&6Ròv&rÖw&VVâÓSó#FWBÖw&VVâÓCr¢bç7FGW2ÓÓÒtfÆvvVBròv&r×&VBÓSó#FWB×&VBÓCr¢v&rÖÖ&W"ÓSó#FWBÖÖ&W"ÓCwÖÓà¢·bæäFF&6RòtWF÷&¦VBr¢bç7FGW7Ð¢Â÷7ãà¢Ç6Æ74æÖSÒ'FWB×6ÆFRÓSFWB×2×BÓ#ç·bçFÖWÓÂ÷à¢ÂöFcà¢ÂöFcà¢Ð¢ÂöFcà¢ÂöFcà¢ÂöFcà¢Ð ¢²ò¢)Y)Y)Y$Uõ%BtTäU$DôâÔôDÂ)Y)Y)Y¢÷Ð¢·6÷u&W÷'DÖöFÂbb¢ÆFb6Æ74æÖSÒ&fVBç6WBÓ&rÖ&Æ6²óc&6¶G&÷Ö&ÇW"×6ÒfÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"¢ÓSÓB#à¢ÆFb6Æ74æÖSÒ&&rÖ6&B&÷VæFVBÓ'Â&÷&FW"&÷&FW"ÖFVfVÇBÖ×rÖÆrrÖgVÆÂ6F÷rÓ'Â#à¢ÆFb6Æ74æÖSÒ'ÓR&÷&FW"Ö"&÷&FW"ÖFVfVÇBfÆWFV×2Ö6VçFW"§W7FgÖ&WGvVVâ#à¢ÆFcà¢Æ26Æ74æÖSÒ'FWBÖÆrföçBÖ&öÆBFWB×&Ö'#ävVæW&FR6V7W&G&W÷'CÂö3à¢Ç6Æ74æÖSÒ'FWB×6V6öæF'FWB×2×BÓãR#ç¶7W'&VçE&÷W'GææÖWÓÂ÷à¢ÂöFcà¢Æ'WGFöâöä6Æ6³×²Óâ6WE6÷u&W÷'DÖöFÂfÇ6RÒ6Æ74æÖSÒ'ÓãR÷fW#¦&r×6V6öæF'&÷VæFVBÖÆr#ãÅ6¦S×³ÒóãÂö'WGFöãà¢ÂöFcà¢ÆFb6Æ74æÖSÒ'ÓR76R×ÓB#à¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×&Ö'FWB×6ÒföçBÖÖVFVÒÖ"Ó"#å&W÷'BGSÂöÆ&VÃà¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó2vÓ"#à¢µ²tFÇrÂuvVV¶ÇrÂtÖöçFÇuÒæÖGRÓâ¢Æ'WGFöâ¶W×·GWÒ6Æ74æÖSÒ'Ó2Ó"ãR&÷VæFVBÖÆr&÷&FW"&÷&FW"ÖFVfVÇBFWB×6ÒföçBÖÖVFVÒFWB×&Ö'÷fW#¦&÷&FW"Ö&ÇVRÓS÷fW#¦&rÖ&ÇVRÓSóG&ç6FöâÖ6öÆ÷'2#à¢·GWÐ¢Âö'WGFöãà¢Ð¢ÂöFcà¢ÂöFcà¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×&Ö'FWB×6ÒföçBÖÖVFVÒÖ"Ó"#äæ6ÇVFR6V7Föç3ÂöÆ&VÃà¢ÆFb6Æ74æÖSÒ'76R×Ó"#à¢µ²tWV7WFfR7VÖÖ'rÂtFWFV7FöâÆörrÂuG&öÂ6ö×Ææ6RrÂtæ6FVçB&W÷'G2rÂufV6ÆR7FfGrÂt6ÖW&77FVÒ7FGW2rÂtwV&BW&f÷&Öæ6RuÒæÖ6V7FöâÓâ¢ÆÆ&VÂ¶W×·6V7FöçÒ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ"Ó"&÷VæFVB÷fW#¦&r×6V6öæF'ó37W'6÷"×öçFW"#à¢ÆçWBGSÒ&6V6¶&÷"FVfVÇD6V6¶VB6Æ74æÖSÒ'rÓBÓB&÷VæFVB&÷&FW"×6ÆFRÓcFWBÖ&ÇVRÓS&r×6V6öæF'"óà¢Ç7â6Æ74æÖSÒ'FWB×6ÒFWB×&Ö'#ç·6V7FöçÓÂ÷7ãà¢ÂöÆ&VÃà¢Ð¢ÂöFcà¢ÂöFcà¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×&Ö'FWB×6ÒföçBÖÖVFVÒÖ"Ó"#äf÷&ÖCÂöÆ&VÃà¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó2vÓ"#à¢Æ'WGFöâ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"vÓ"Ó2Ó"ãR&rÖ&ÇVRÓS÷fW#¦&rÖ&ÇVRÓcFWB×vFR&÷VæFVBÖÆrFWB×6ÒföçBÖÖVFVÒG&ç6FöâÖ6öÆ÷'2#à¢ÄF÷væÆöB6¦S×³GÒóâD`¢Âö'WGFöãà¢Æ'WGFöâ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"vÓ"Ó2Ó"ãR&÷&FW"&÷&FW"ÖFVfVÇBFWB×&Ö'&÷VæFVBÖÆrFWB×6ÒföçBÖÖVFVÒ÷fW#¦&r×6V6öæF'G&ç6FöâÖ6öÆ÷'2#à¢ÄF÷væÆöB6¦S×³GÒóâW6VÀ¢Âö'WGFöãà¢Æ'WGFöâ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"vÓ"Ó2Ó"ãR&÷&FW"&÷&FW"ÖFVfVÇBFWB×&Ö'&÷VæFVBÖÆrFWB×6ÒföçBÖÖVFVÒ÷fW#¦&r×6V6öæF'G&ç6FöâÖ6öÆ÷'2#à¢ÄWFW&æÄÆæ²6¦S×³GÒóâVÖÀ¢Âö'WGFöãà¢ÂöFcà¢ÂöFcà¢ÂöFcà¢ÆFb6Æ74æÖSÒ'ÓR&÷&FW"×B&÷&FW"ÖFVfVÇB&r×6V6öæF'ó#&÷VæFVBÖ"Ó'Â#à¢Ç6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓSFWBÖ6VçFW"#å&W÷'G2WFòÖvVæW&FVBFÇBs£ÒæBVÖÆVBFò÷'FÂFÖæ7G&F÷'3Â÷à¢ÂöFcà¢ÂöFcà¢ÂöFcà¢Ð ¢²ò¢)Y)Y)YdôõDU")Y)Y)Y¢÷Ð¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"§W7FgÖ&WGvVVâÓ2&÷&FW"×B&÷&FW"ÖFVfVÇB#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ"#à¢ÆFb6Æ74æÖSÒ'rÓRÓR&rÖw&FVçB×FòÖ'"g&öÒÖ&ÇVRÓSFòÖ&ÇVRÓs&÷VæFVBfÆWFV×2Ö6VçFW"§W7FgÖ6VçFW"#à¢Å6VÆB6¦S×³Ò6Æ74æÖSÒ'FWB×vFR"óà¢ÂöFcà¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓS#å÷vW&VB'Ç7â6Æ74æÖSÒ'FWBÖ&ÇVRÓCföçB×6VÖ&öÆB#å7Fvrõ3Â÷7ãâ(	B6V7W&GçFVÆÆvVæ6RÆFf÷&ÓÂ÷7ãà¢ÂöFcà¢Ç7â6Æ74æÖSÒ'FWBÕ³ÒFWB×6ÆFRÓc#äÆ7B7æ3¢¶Æ7EWFFVBçFôÆö6ÆUFÖU7G&ærvVâÕU2rÂ²÷W#¢vçVÖW&2rÂÖçWFS¢s"ÖFvBrÒÓÂ÷7ãà¢ÂöFcà¢ÂöFcà¢§Ð