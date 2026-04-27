import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, Loader, Phone, Mail, Award, Clock, AlertCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Guard } from '../lib/types'

const DEMO_GUARDS: Guard[] = [
  { id: '1', org_id: '1', first_name: 'Jemal', last_name: 'Hassan', email: 'jemal@stigg.ca', phone: '(403) 555-1001', date_of_birth: '1990-05-15', hire_date: '2023-01-10', status: 'active', hourly_rate: 19.00, certifications: ['Security Level 1', 'First Aid', 'CPR'], created_at: '2023-01-10', updated_at: '2023-01-10' },
  { id: '2', org_id: '1', first_name: 'Solomon', last_name: 'Abdi', email: 'solomon@stigg.ca', phone: '(403) 555-1002', date_of_birth: '1992-08-22', hire_date: '2023-02-15', status: 'active', hourly_rate: 18.00, certifications: ['Security Level 1', 'First Aid'], created_at: '2023-02-15', updated_at: '2023-02-15' },
  { id: '3', org_id: '1', first_name: 'Jean', last_name: 'Marie', email: 'jean.marie@stigg.ca', phone: '(403) 555-1003', date_of_birth: '1988-03-10', hire_date: '2023-01-05', status: 'active', hourly_rate: 19.00, certifications: ['Security Level 2', 'First Aid', 'CPR', 'Advanced Tactics'], created_at: '2023-01-05', updated_at: '2023-01-05' },
  { id: '4', org_id: '1', first_name: 'Kanwal', last_name: 'Singh', email: 'kanwal@stigg.ca', phone: '(403) 555-1004', date_of_birth: '1995-11-30', hire_date: '2023-03-01', status: 'active', hourly_rate: 23.25, certifications: ['Security Level 2', 'First Aid', 'CPR'], created_at: '2023-03-01', updated_at: '2023-03-01' },
  { id: '5', org_id: '1', first_name: 'Preston', last_name: 'Williams', email: 'preston@stigg.ca', phone: '(403) 555-1005', date_of_birth: '1985-07-12', hire_date: '2022-06-01', status: 'active', hourly_rate: 40.00, certifications: ['Security Level 3', 'Management', 'CPR', 'First Aid'], created_at: '2022-06-01', updated_at: '2022-06-01' },
  { id: '6', org_id: '1', first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@stigg.ca', phone: '(403) 555-1006', date_of_birth: '1993-02-18', hire_date: '2023-04-10', status: 'active', hourly_rate: 21.50, certifications: ['Security Level 2', 'First Aid'], created_at: '2023-04-10', updated_at: '2023-04-10' },
  { id: '7', org_id: '1', first_name: 'Marcus', last_name: 'Rodriguez', email: 'marcus@stigg.ca', phone: '(403) 555-1007', date_of_birth: '1991-09-05', hire_date: '2023-02-01', status: 'off_duty', hourly_rate: 19.50, certifications: ['Security Level 1', 'First Aid'], created_at: '2023-02-01', updated_at: '2023-02-01' },
  { id: '8', org_id: '1', first_name: 'Emma', last_name: 'Thompson', email: 'emma.t@stigg.ca', phone: '(403) 555-1008', date_of_birth: '1994-12-25', hire_date: '2023-03-15', status: 'on_leave', hourly_rate: 20.00, certifications: ['Security Level 1', 'CPR'], created_at: '2023-03-15', updated_at: '2023-03-15' },
]

export function Guards() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'off_duty' | 'on_leave'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'rate'>('name')

  useEffect(() => {
    fetchGuards()
  }, [])

  const fetchGuards = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('guards').select('*').limit(20)
      if (data && data.length > 0) {
        setGuards(data)
      } else {
        setGuards(DEMO_GUARDS)
      }
    } catch (error) {
      console.error('Error fetching guards:', error)
      setGuards(DEMO_GUARDS)
    } finally {
      setLoading(false)
    }
  }

  const filteredGuards = guards
    .filter(g => {
      const fullName = `${g.first_name} ${g.last_name}`.toLowerCase()
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                           g.phone.includes(searchTerm) ||
                           g.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || g.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      } else {
        return b.hourly_rate - a.hourly_rate
      }
    })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-active'
      case 'off_duty':
        return 'badge-medium'
      case 'on_leave':
        return 'badge-inactive'
      default:
        return 'badge-inactive'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'off_duty':
        return 'Off-duty'
      case 'on_leave':
        return 'On Leave'
      default:
        return status
    }
  }

  const handleGuardClick = (guard: Guard) => {
    setSelectedGuard(guard)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} className="text-accent animate-spin" />
          <p className="text-secondary">Loading guards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Guards</h1>
          <p className="text-secondary mt-2">Manage security personnel and assignments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
          <Plus size={18} />
          Add Guard
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-4 border border-default">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-secondary" />
              <input
                type="text"
                placeholder="Search guards by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="off_duty">Off-duty</option>
            <option value="on_leave">On Leave</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
          >
            <option value="name">Sort by Name</option>
            <option value="rate">Sort by Rate</option>
          </select>
        </div>
      </div>

      {/* Guard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuards.map(guard => (
          <div
            key={guard.id}
            onClick={() => handleGuardClick(guard)}
            className="bg-card rounded-lg p-6 border border-default hover:border-accent cursor-pointer transition-all"
          >
            {/* Header with Status */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">{guard.first_name} {guard.last_name}</h3>
                <p className="text-secondary text-sm mt-1">Guard ID: {guard.id.slice(0, 8)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(guard.status)}`}>
                {getStatusLabel(guard.status)}
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4 pb-4 border-b border-default">
              <div className="flex items-center gap-2 text-secondary text-sm">
                <Phone size={14} className="text-accent" />
                {guard.phone}
              </div>
              <div className="flex items-center gap-2 text-secondary text-sm">
                <Mail size={14} className="text-accent" />
                {guard.email}
              </div>
            </div>

            {/* Rate and Certifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-secondary text-sm">Hourly Rate</span>
                <span className="text-primary font-bold">${guard.hourly_rate.toFixed(2)}/hr</span>
              </div>
              <div>
                <p className="text-secondary text-sm mb-2 flex items-center gap-1">
                  <Award size={14} />
                  Certifications
                </p>
                <div className="flex flex-wrap gap-1">
                  {guard.certifications.slice(0, 2).map((cert, idx) => (
                    <span key={idx} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                      {cert}
                    </span>
                  ))}
                  {guard.certifications.length > 2 && (
                    <span className="text-xs text-secondary">
                      +{guard.certifications.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {showModal && selectedGuard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-2xl font-bold text-primary">{selectedGuard.first_name} {selectedGuard.last_name}</h2>
              <button
                onClick={() => { setShowModal(false); setSelectedGuard(null) }}
                className="p-2 hover:bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-secondary text-sm">First Name</p>
                    <p className="text-primary font-medium">{selectedGuard.first_name}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Last Name</p>
                    <p className="text-primary font-medium">{selectedGuard.last_name}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Date of Birth</p>
                    <p className="text-primary font-medium">{new Date(selectedGuard.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Hire Date</p>
                    <p className="text-primary font-medium">{new Date(selectedGuard.hire_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Phone size={18} className="text-accent" />
                  Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-secondary text-sm">Phone</p>
                    <p className="text-primary font-medium">{selectedGuard.phone}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Email</p>
                    <p className="text-primary font-medium">{selectedGuard.email}</p>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-accent" />
                  Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Status</p>
                    <p className={`text-lg font-bold mt-1 ${selectedGuard.status === 'active' ? 'text-green-400' : selectedGuard.status === 'off_duty' ? 'text-amber-400' : 'text-red-400'}`}>
                      {getStatusLabel(selectedGuard.status)}
                    </p>
                  </div>
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Hourly Rate</p>
                    <p className="text-2xl font-bold text-green-500">${selectedGuard.hourly_rate.toFixed(2)}</p>
                  </div>
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Years Employed</p>
                    <p className="text-2xl font-bold text-accent">{Math.floor((new Date().getTime() - new Date(selectedGuard.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))}</p>
                  </div>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Award size={18} className="text-accent" />
                  Certifications ({selectedGuard.certifications.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGuard.certifications.map((cert, idx) => (
                    <span key={idx} className="bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-default flex gap-3">
              <button className="flex-1 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded font-medium transition-colors">
                Edit Guard
              </button>
              <button
                onClick={() => { setShowModal(false); setSelectedGuard(null) }}
                className="flex-1 px-4 py-2 border border-default hover:bg-secondary rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
