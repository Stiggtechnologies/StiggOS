import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader, Clock, AlertCircle, Calendar, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Shift, Guard } from '../lib/types'

const DEMO_SHIFTS: Shift[] = [
  { id: '1', guard_id: '1', site_id: '1', start_time: '2024-04-29T22:00:00', end_time: '2024-04-30T06:00:00', shift_type: 'night', status: 'in_progress', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '2', guard_id: '2', site_id: '2', start_time: '2024-04-29T08:00:00', end_time: '2024-04-29T16:00:00', shift_type: 'day', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '3', guard_id: '3', site_id: '1', start_time: '2024-04-30T22:00:00', end_time: '2024-05-01T06:00:00', shift_type: 'night', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '4', guard_id: '4', site_id: '3', start_time: '2024-05-01T10:00:00', end_time: '2024-05-01T18:00:00', shift_type: 'day', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '5', guard_id: '5', site_id: '4', start_time: '2024-05-02T08:00:00', end_time: '2024-05-02T16:00:00', shift_type: 'day', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '6', guard_id: '1', site_id: '1', start_time: '2024-05-03T16:00:00', end_time: '2024-05-04T00:00:00', shift_type: 'night', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
  { id: '7', guard_id: '6', site_id: '2', start_time: '2024-05-04T08:00:00', end_time: '2024-05-04T16:00:00', shift_type: 'day', status: 'scheduled', created_at: '2024-04-29', updated_at: '2024-04-29' },
]

const DEMO_GUARD_NAMES: Record<string, string> = {
  '1': 'Jemal Hassan',
  '2': 'Solomon Abdi',
  '3': 'Jean Marie',
  '4': 'Kanwal Singh',
  '5': 'Preston Williams',
  '6': 'Sarah Johnson',
}

const DEMO_SITE_NAMES: Record<string, string> = {
  '1': 'Northview REIT #5',
  '2': 'Northview REIT #12',
  '3': 'Mainstreet Gardens',
  '4': 'Canadian Tire #2',
}

export function Scheduling() {
  const [currentWeek, setCurrentWeek] = useState(new Date(2024, 3, 29))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [showNewShiftModal, setShowNewShiftModal] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('shifts').select('*').limit(30)
      if (data && data.length > 0) {
        setShifts(data)
      } else {
        setShifts(DEMO_SHIFTS)
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
      setShifts(DEMO_SHIFTS)
    } finally {
      setLoading(false)
    }
  }

  const getShiftsForDay = (day: number) => {
    const targetDate = new Date(currentWeek)
    targetDate.setDate(targetDate.getDate() + day)
    const dateStr = targetDate.toISOString().split('T')[0]
    return shifts.filter(s => s.start_time.startsWith(dateStr))
  }

  const getShiftColor = (type: string) => {
    switch (type) {
      case 'night':
        return 'bg-blue-900 text-blue-100'
      case 'day':
        return 'bg-green-900 text-green-100'
      default:
        return 'bg-amber-900 text-amber-100'
    }
  }

  const getShiftTypeLabel = (type: string) => {
    switch (type) {
      case 'night':
        return 'Night Shift'
      case 'day':
        return 'Day Shift'
      default:
        return 'Patrol'
    }
  }

  const weekStart = new Date(currentWeek)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

  const totalShifts = shifts.length
  const filledShifts = shifts.filter(s => s.status === 'in_progress' || s.status === 'completed').length
  const openShifts = shifts.filter(s => s.status === 'scheduled').length

  const handlePrevWeek = () => {
    const prev = new Date(currentWeek)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeek(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentWeek)
    next.setDate(next.getDate() + 7)
    setCurrentWeek(next)
  }

  const handleCreateShift = () => {
    setNotification('New shift created successfully!')
    setShowNewShiftModal(false)
    setTimeout(() => setNotification(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} className="text-accent animate-spin" />
          <p className="text-secondary">Loading schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Scheduling</h1>
          <p className="text-secondary mt-2">Manage guard shifts and assignments</p>
        </div>
        <button onClick={() => setShowNewShiftModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
          <Plus size={18} />
          New Shift
        </button>
      </div>

      {/* Week Navigation & View Toggle */}
      <div className="bg-card rounded-lg p-4 border border-default">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-secondary rounded transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-center">
              Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <p className="text-secondary text-sm text-center mt-1">
              May - Oct (Summer Season Active)
            </p>
          </div>
          <button onClick={handleNextWeek} className="p-2 hover:bg-secondary rounded transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded font-medium transition-colors ${viewMode === 'week' ? 'bg-accent text-white' : 'bg-secondary text-secondary hover:bg-slate-700'}`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded font-medium transition-colors ${viewMode === 'month' ? 'bg-accent text-white' : 'bg-secondary text-secondary hover:bg-slate-700'}`}
          >
            Month View
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-lg border border-default overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-0 min-w-full">
            {days.map((day) => {
              const dayIndex = days.indexOf(day)
              const dayDate = new Date(weekStart)
              dayDate.setDate(dayDate.getDate() + dayIndex)
              const dayShifts = getShiftsForDay(dayIndex)

              return (
                <div key={day} className="border-r border-default last:border-r-0 min-h-96">
                  <div className="bg-secondary border-b border-default p-3 sticky top-0">
                    <h3 className="font-semibold text-primary text-sm">{day}</h3>
                    <p className="text-xs text-secondary mt-1">{dayDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {dayShifts.length > 0 ? (
                      dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className={`p-3 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getShiftColor(shift.shift_type)}`}
                        >
                          <p className="font-semibold text-sm">{DEMO_GUARD_NAMES[shift.guard_id] || 'Guard'}</p>
                          <p className="opacity-90 text-xs mt-1">{DEMO_SITE_NAMES[shift.site_id] || 'Site'}</p>
                          <p className="opacity-90 text-xs">
                            {new Date(shift.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${shift.status === 'in_progress' ? 'bg-green-500/30' : 'bg-yellow-500/30'}`}>
                            {shift.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-secondary text-xs italic py-2">No shifts</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Shift Summary */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-accent" />
          This Week Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-secondary rounded">
            <p className="text-secondary text-sm">Total Shifts</p>
            <p className="text-2xl font-bold text-primary mt-2">{totalShifts}</p>
          </div>
          <div className="p-4 bg-secondary rounded">
            <p className="text-secondary text-sm">Active Shifts</p>
            <p className="text-2xl font-bold text-green-500 mt-2">{filledShifts}</p>
          </div>
          <div className="p-4 bg-secondary rounded">
            <p className="text-secondary text-sm">Scheduled</p>
            <p className="text-2xl font-bold text-blue-500 mt-2">{openShifts}</p>
          </div>
          <div className="p-4 bg-secondary rounded">
            <p className="text-secondary text-sm">Coverage Rate</p>
            <p className="text-2xl font-bold text-amber-500 mt-2">{totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Shift Creation Modal */}
      {showNewShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full">
            <div className="p-6 border-b border-default flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">Create New Shift</h2>
              <button
                onClick={() => setShowNewShiftModal(false)}
                className="p-2 hover:bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-secondary text-sm mb-2">Guard</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Select Guard</option>
                    <option>Jemal Hassan</option>
                    <option>Solomon Abdi</option>
                    <option>Jean Marie</option>
                    <option>Kanwal Singh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-secondary text-sm mb-2">Site</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Select Site</option>
                    <option>Northview REIT #5</option>
                    <option>Northview REIT #12</option>
                    <option>Mainstreet Gardens</option>
                    <option>Canadian Tire #2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-secondary text-sm mb-2">Start Time</label>
                  <input type="datetime-local" className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-secondary text-sm mb-2">End Time</label>
                  <input type="datetime-local" className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-secondary text-sm mb-2">Shift Type</label>
                  <select className="w-full px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent">
                    <option>Day</option>
                    <option>Night</option>
                    <option>Patrol</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-default flex gap-3">
              <button onClick={handleCreateShift} className="flex-1 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded font-medium transition-colors">
                Create Shift
              </button>
              <button
                onClick={() => setShowNewShiftModal(false)}
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
