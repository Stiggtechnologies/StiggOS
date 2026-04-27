import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, Loader, MapPin, DollarSign, FileText, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Client, Site } from '../lib/types'

const DEMO_CLIENTS: Client[] = [
  { id: '1', org_id: '1', company_name: 'Northview Residential REIT', contact_name: 'John Davis', contact_email: 'john@northview.ca', contact_phone: '(403) 555-0100', billing_address: '123 Main St, Calgary, AB', monthly_value: 14500, contract_status: 'active', created_at: '2024-01-15', updated_at: '2024-01-15' },
  { id: '2', org_id: '1', company_name: 'Mainstreet Equity', contact_name: 'Sarah Chen', contact_email: 'sarah@mainstreet.ca', contact_phone: '(403) 555-0101', billing_address: '456 Oak Ave, Calgary, AB', monthly_value: 12800, contract_status: 'active', created_at: '2024-02-01', updated_at: '2024-02-01' },
  { id: '3', org_id: '1', company_name: 'Canadian Tire', contact_name: 'Mike Johnson', contact_email: 'mike@canadiantire.ca', contact_phone: '(403) 555-0102', billing_address: '789 Pine Rd, Calgary, AB', monthly_value: 18500, contract_status: 'active', created_at: '2024-01-20', updated_at: '2024-01-20' },
  { id: '4', org_id: '1', company_name: 'Beacon Plaza', contact_name: 'Emma Wilson', contact_email: 'emma@beacon.ca', contact_phone: '(403) 555-0103', billing_address: '321 Maple Ln, Calgary, AB', monthly_value: 11200, contract_status: 'active', created_at: '2024-03-01', updated_at: '2024-03-01' },
  { id: '5', org_id: '1', company_name: 'Downtown Office Park', contact_name: 'Robert Brown', contact_email: 'robert@downtown.ca', contact_phone: '(403) 555-0104', billing_address: '654 Elm St, Calgary, AB', monthly_value: 22000, contract_status: 'pending', created_at: '2024-03-15', updated_at: '2024-03-15' },
  { id: '6', org_id: '1', company_name: 'Tech Innovation Hub', contact_name: 'Lisa Park', contact_email: 'lisa@techhub.ca', contact_phone: '(403) 555-0105', billing_address: '987 Cedar Dr, Calgary, AB', monthly_value: 9500, contract_status: 'inactive', created_at: '2024-02-10', updated_at: '2024-03-10' },
]

const DEMO_SITES: Site[] = [
  { id: '1', client_id: '1', name: 'Northview REIT #5', address: '100 Centre St', city: 'Calgary', province: 'AB', postal_code: 'T2G 2G9', site_type: 'residential', square_footage: 45000, access_points: 8, created_at: '2024-01-15', updated_at: '2024-01-15' },
  { id: '2', client_id: '1', name: 'Northview REIT #12', address: '200 Centre St', city: 'Calgary', province: 'AB', postal_code: 'T2G 2G9', site_type: 'residential', square_footage: 52000, access_points: 10, created_at: '2024-01-15', updated_at: '2024-01-15' },
  { id: '3', client_id: '2', name: 'Mainstreet Gardens', address: '150 Bow River Crescent', city: 'Calgary', province: 'AB', postal_code: 'T2P 0R4', site_type: 'residential', square_footage: 38000, access_points: 6, created_at: '2024-02-01', updated_at: '2024-02-01' },
  { id: '4', client_id: '3', name: 'Canadian Tire #2', address: '300 Macleod Trail', city: 'Calgary', province: 'AB', postal_code: 'T2P 4P9', site_type: 'commercial', square_footage: 25000, access_points: 4, created_at: '2024-01-20', updated_at: '2024-01-20' },
]

export function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'monthly_value'>('name')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('clients').select('*').limit(20)
      if (data && data.length > 0) {
        setClients(data)
        const sitesRes = await supabase.from('sites').select('*')
        if (sitesRes.data) {
          setSites(sitesRes.data)
        } else {
          setSites(DEMO_SITES)
        }
      } else {
        setClients(DEMO_CLIENTS)
        setSites(DEMO_SITES)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients(DEMO_CLIENTS)
      setSites(DEMO_SITES)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients
    .filter(c => {
      const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || c.contract_status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.company_name.localeCompare(b.company_name)
      } else {
        return b.monthly_value - a.monthly_value
      }
    })

  const getClientSites = (clientId: string) => {
    return sites.filter(s => s.client_id === clientId)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-active'
      case 'pending':
        return 'badge-medium'
      case 'inactive':
        return 'badge-inactive'
      default:
        return 'badge-draft'
    }
  }

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} className="text-accent animate-spin" />
          <p className="text-secondary">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Clients & Properties</h1>
          <p className="text-secondary mt-2">Manage clients, contracts, and service agreements</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors">
          <Plus size={18} />
          Add Client
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
                placeholder="Search clients by name, contact, or email..."
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
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-secondary rounded border border-default text-primary focus:outline-none focus:border-accent"
          >
            <option value="name">Sort by Name</option>
            <option value="monthly_value">Sort by Revenue</option>
          </select>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div
            key={client.id}
            onClick={() => handleClientClick(client)}
            className="bg-card rounded-lg p-6 border border-default hover:border-accent cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-primary">{client.company_name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(client.contract_status)}`}>
                  {client.contract_status}
                </span>
              </div>
              <p className="text-secondary text-sm">{client.contact_name}</p>
            </div>

            <div className="space-y-3 mb-4 pb-4 border-b border-default">
              <div className="flex items-center gap-2 text-secondary text-sm">
                <span className="font-medium">Contact:</span>
                {client.contact_email}
              </div>
              <div className="flex items-center gap-2 text-secondary text-sm">
                <span className="font-medium">Phone:</span>
                {client.contact_phone}
              </div>
              <div className="flex items-center gap-2 text-primary font-semibold">
                <DollarSign size={16} className="text-green-500" />
                ${client.monthly_value.toLocaleString()}/month
              </div>
            </div>

            <div className="flex items-center gap-2 text-accent text-sm font-medium">
              <MapPin size={16} />
              {getClientSites(client.id).length} properties
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-2xl font-bold text-primary">{selectedClient.company_name}</h2>
              <button
                onClick={() => { setShowModal(false); setSelectedClient(null) }}
                className="p-2 hover:bg-secondary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-secondary text-sm">Contact Name</p>
                    <p className="text-primary font-medium">{selectedClient.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Email</p>
                    <p className="text-primary font-medium">{selectedClient.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Phone</p>
                    <p className="text-primary font-medium">{selectedClient.contact_phone}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-sm">Billing Address</p>
                    <p className="text-primary font-medium">{selectedClient.billing_address}</p>
                  </div>
                </div>
              </div>

              {/* Contract Summary */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-accent" />
                  Contract Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Monthly Value</p>
                    <p className="text-2xl font-bold text-green-500">${selectedClient.monthly_value.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Status</p>
                    <p className={`text-lg font-bold mt-1 ${selectedClient.contract_status === 'active' ? 'text-green-400' : selectedClient.contract_status === 'pending' ? 'text-amber-400' : 'text-red-400'}`}>
                      {selectedClient.contract_status.charAt(0).toUpperCase() + selectedClient.contract_status.slice(1)}
                    </p>
                  </div>
                  <div className="bg-secondary rounded p-4">
                    <p className="text-secondary text-sm">Annual Value</p>
                    <p className="text-2xl font-bold text-accent">${(selectedClient.monthly_value * 12).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Properties */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-accent" />
                  Properties ({getClientSites(selectedClient.id).length})
                </h3>
                <div className="space-y-3">
                  {getClientSites(selectedClient.id).length > 0 ? (
                    getClientSites(selectedClient.id).map(site => (
                      <div key={site.id} className="bg-secondary rounded p-4 border border-default">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-primary">{site.name}</h4>
                          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                            {site.site_type}
                          </span>
                        </div>
                        <p className="text-secondary text-sm mb-2">{site.address}, {site.city}, {site.province} {site.postal_code}</p>
                        <div className="flex gap-4 text-secondary text-xs">
                          <span>{site.square_footage.toLocaleString()} sqft</span>
                          <span>{site.access_points} access points</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-secondary">No properties assigned yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-default flex gap-3">
              <button className="flex-1 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded font-medium transition-colors">
                Edit Client
              </button>
              <button
                onClick={() => { setShowModal(false); setSelectedClient(null) }}
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
