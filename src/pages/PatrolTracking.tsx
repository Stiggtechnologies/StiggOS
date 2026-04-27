import React, { useState, useEffect } from 'react'
import { MapPin, Clock, AlertCircle, Zap, RotateCcw, Eye, Pause, Play } from 'lucide-react'

interface ActivePatrol {
  id: string
  guardName: string
  guardId: string
  siteName: string
  siteId: string
  status: 'active' | 'paused' | 'completed'
  startTime: string
  duration: number
  checkpointsCompleted: number
  checkpointsTotal: number
  routeProgress: number
  nextCheckpoint: string
  gpsLat: number
  gpsLng: number
  geofenceStatus: 'inside' | 'outside'
  routeRandomized: boolean
}

interface CheckpointHistory {
  id: string
  patrolId: string
  guardName: string
  siteName: string
  routeName: string
  checkpointsHit: number
  checkpointsTotal: number
  duration: number
  date: string
  complianceScore: number
  expectedTime: string
  actualTime: string
}

const DEMO_ACTIVE_PATROLS: ActivePatrol[] = [
  {
    id: 'p1',
    guardName: 'Jemal',
    guardId: 'g1',
    siteName: 'Northview #1 (Main)',
    siteId: 's1',
    status: 'active',
    startTime: '22:15',
    duration: 127,
    checkpointsCompleted: 5,
    checkpointsTotal: 8,
    routeProgress: 62.5,
    nextCheckpoint: 'East Wing Entrance',
    gpsLat: 51.0504,
    gpsLng: -114.1428,
    geofenceStatus: 'inside',
    routeRandomized: true,
  },
  {
    id: 'p2',
    guardName: 'Solomon',
    guardId: 'g2',
    siteName: 'Northview #3',
    siteId: 's2',
    status: 'active',
    startTime: '08:00',
    duration: 485,
    checkpointsCompleted: 6,
    checkpointsTotal: 7,
    routeProgress: 85.7,
    nextCheckpoint: 'Loading Bay',
    gpsLat: 51.0403,
    gpsLng: -114.1129,
    geofenceStatus: 'inside',
    routeRandomized: false,
  },
  {
    id: 'p3',
    guardName: 'Jean Marie',
    guardId: 'g3',
    siteName: 'Northview #5',
    siteId: 's3',
    status: 'paused',
    startTime: '10:30',
    duration: 322,
    checkpointsCompleted: 4,
    checkpointsTotal: 9,
    routeProgress: 44.4,
    nextCheckpoint: 'Parking Level B',
    gpsLat: 51.0612,
    gpsLng: -114.0876,
    geofenceStatus: 'inside',
    routeRandomized: true,
  },
]

const DEMO_PATROL_HISTORY: CheckpointHistory[] = [
  {
    id: 'h1',
    patrolId: 'p1',
    guardName: 'Jemal',
    siteName: 'Northview #1',
    routeName: 'Perimeter Route A',
    checkpointsHit: 8,
    checkpointsTotal: 8,
    duration: 480,
    date: '2026-04-25',
    complianceScore: 98,
    expectedTime: '22:00',
    actualTime: '22:02',
  },
  {
    id: 'h2',
    patrolId: 'p2',
    guardName: 'Solomon',
    siteName: 'Northview #3',
    routeName: 'Interior Sweep',
    checkpointsHit: 7,
    checkpointsTotal: 7,
    duration: 420,
    date: '2026-04-25',
    complianceScore: 100,
    expectedTime: '08:00',
    actualTime: '07:58',
  },
  {
    id: 'h3',
    patrolId: 'p3',
    guardName: 'Jean Marie',
    siteName: 'Northview #5',
    routeName: 'Exterior Perimeter',
    checkpointsHit: 9,
    checkpointsTotal: 9,
    duration: 510,
    date: '2026-04-24',
    complianceScore: 95,
    expectedTime: '10:30',
    actualTime: '10:45',
  },
  {
    id: 'h4',
    patrolId: 'p1',
    guardName: 'Jemal',
    siteName: 'Northview #1',
    routeName: 'Perimeter Route A',
    checkpointsHit: 8,
    checkpointsTotal: 8,
    duration: 485,
    date: '2026-04-24',
    complianceScore: 97,
    expectedTime: '22:00',
    actualTime: '22:01',
  },
]

const DEMO_CHECKPOINTS = [
  { location: 'Main Entrance', expectedTime: '22:00', actualTime: '22:02', status: 'clear' as const },
  { location: 'East Wing', expectedTime: '22:15', actualTime: '22:18', status: 'clear' as const },
  { location: 'West Stairwell', expectedTime: '22:30', actualTime: '22:28', status: 'clear' as const },
  { location: 'Roof Access', expectedTime: '22:45', actualTime: '22:50', status: 'late' as const },
  { location: 'Parking Level A', expectedTime: '23:00', actualTime: '23:05', status: 'late' as const },
]

export function PatrolTracking() {
  const [activePatrols, setActivePatrols] = useState<ActivePatrol[]>(DEMO_ACTIVE_PATROLS)
  const [patrolHistory, setPatrolHistory] = useState<CheckpointHistory[]>(DEMO_PATROL_HISTORY)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-400'
    if (score >= 85) return 'text-yellow-400'
    return 'text-red-400'
  }

  const siteCheckpoints = selectedSite ? DEMO_CHECKPOINTS : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Patrol Tracking</h1>
        <p className="text-slate-400 mt-2">Real-time guard patrol monitoring and GPS tracking</p>
      </div>

      {/* Map Placeholder */}
      <div className="w-full h-96 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <MapPin size={48} className="text-blue-500 mx-auto mb-2 opacity-50" />
          <p className="text-slate-400">Map view - Integration with Google Maps API for live tracking</p>
          <p className="text-xs text-slate-500 mt-2">{activePatrols.length} active patrols across Northview REIT</p>
        </div>
      </div>

      {/* Active Patrols */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Active Patrols ({activePatrols.filter(p => p.status === 'active').length})</h2>
        <div className="space-y-4">
          {activePatrols.map((patrol) => (
            <div
              key={patrol.id}
              className="p-4 border border-slate-700 rounded-lg hover:border-blue-500 transition-colors bg-slate-900"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{patrol.guardName}</h3>
                  <p className="text-slate-400 text-sm">{patrol.siteName}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    patrol.status === 'active' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                  }`}>
                    {patrol.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  {patrol.geofenceStatus === 'outside' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900 text-red-200">Outside Zone</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase">Start Time</p>
                  <p className="text-white font-medium">{patrol.startTime}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Duration</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Clock size={14} /> {formatDuration(patrol.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Checkpoints</p>
                  <p className="text-white font-medium">{patrol.checkpointsCompleted}/{patrol.checkpointsTotal}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Next</p>
                  <p className="text-white font-medium">{patrol.nextCheckpoint}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">GPS</p>
                  <p className="text-white font-mono text-xs">{patrol.gpsLat.toFixed(4)}, {patrol.gpsLng.toFixed(4)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-xs">Route Progress</span>
                  <span className="text-blue-400 text-xs font-semibold">{patrol.routeProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${patrol.routeProgress}%` }}
                  />
                </div>
              </div>

              {/* Indicators */}
              <div className="flex gap-2 text-xs">
                {patrol.routeRandomized && (
                  <span className="flex items-center gap-1 text-purple-400 bg-purple-900 px-2 py-1 rounded">
                    <RotateCcw size={12} /> Route Randomized
                  </span>
                )}
                <span className={`flex items-center gap-1 ${patrol.geofenceStatus === 'inside' ? 'text-green-400 bg-green-900' : 'text-red-400 bg-red-900'} px-2 py-1 rounded`}>
                  <Zap size={12} /> {patrol.geofenceStatus === 'inside' ? 'Inside Zone' : 'Outside Zone'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patrol History */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Patrol History (Last 10 Shifts)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-2 text-left text-slate-400 font-semibold">Date</th>
                <th className="px-4 py-2 text-left text-slate-400 font-semibold">Guard</th>
                <th className="px-4 py-2 text-left text-slate-400 font-semibold">Site</th>
                <th className="px-4 py-2 text-left text-slate-400 font-semibold">Route</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Checkpoints</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Duration</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {patrolHistory.map((history) => (
                <tr key={history.id} className="border-b border-slate-700 hover:bg-slate-900 transition-colors">
                  <td className="px-4 py-3 text-slate-300">{history.date}</td>
                  <td className="px-4 py-3 text-white font-medium">{history.guardName}</td>
                  <td className="px-4 py-3 text-slate-300">{history.siteName}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{history.routeName}</td>
                  <td className="px-4 py-3 text-center text-white">{history.checkpointsHit}/{history.checkpointsTotal}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{formatDuration(history.duration)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${getComplianceColor(history.complianceScore)}`}>
                      {history.complianceScore}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkpoint Details */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Checkpoint Status - Northview #1 (Current Patrol)</h2>
          <button
            onClick={() => setSelectedSite(selectedSite ? null : 's1')}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            <Eye size={16} /> {selectedSite ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {selectedSite && (
          <div className="space-y-3">
            {DEMO_CHECKPOINTS.map((checkpoint, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-slate-700 rounded bg-slate-900">
                <div className="flex-1">
                  <p className="text-white font-medium">{checkpoint.location}</p>
                  <p className="text-slate-400 text-xs">Expected: {checkpoint.expectedTime} | Actual: {checkpoint.actualTime}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    checkpoint.status === 'clear' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className={`text-xs font-semibold ${
                    checkpoint.status === 'clear' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {checkpoint.status === 'clear' ? 'On Time' : 'Late'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
