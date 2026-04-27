import React, { useState } from 'react'
import { Search, Filter, Plus, FileText, Bell, DollarSign, MapPin } from 'lucide-react'

interface ContractItem {
  id: string
  number: string
  clientName: string
  tier: 'Essential' | 'Enhanced' | 'Premium'
  season: 'Summer' | 'Winter'
  properties: number
  suites: number
  monthlyValue: number
  startDate: string
  endDate: string
  autoRenewal: boolean
  status: 'Draft' | 'Pending' | 'Active' | 'Renewal' | 'Expired'
}

const TIER_RATES = {
  Essential: { summer: 8950, winter: 12500 },
  Enhanced: { summer: 11850, winter: 15900 },
  Premium: { summer: 16800, winter: 21800 },
}

const DEMO_CONTRACTS: ContractItem[] = [
  {
    id: 'c1',
    number: 'CTR-2024-001',
    clientName: 'Northview Residential REIT',
    tier: 'Premium',
    season: 'Winter',
    properties: 6,
    suites: 364,
    monthlyValue: 21800,
    startDate: '2024-06-01',
    endDate: '2026-05-31',
    autoRenewal: true,
    status: 'Active',
  },
  {
    id: 'c2',
    number: 'CTR-2024-002',
    clientName: 'Northview Residential REIT (Optional)',
    tier: 'Enhanced',
    season: 'Winter',
    properties: 1,
    suites: 51,
    monthlyValue: 15900,
    startDate: '2024-11-01',
    endDate: '2025-04-30',
    autoRenewal: false,
    status: 'Active',
  },
  {
    id: 'c3',
    number: 'CTR-2024-003',
    clientName: 'Mainstreet Equity Group',
    tier: 'Enhanced',
    season: 'Winter',
    properties: 3,
    suites: 180,
    monthlyValue: 14200,
    startDate: '2024-01-15',
    endDate: '2025-12-31',
    autoRenewal: true,
    status: 'Active',
  },
  {
    id: 'c4',
    number: 'CTR-2024-004',
    clientName: 'Canadian Tire Ltd.',
    tier: 'Essential',
    season: 'Winter',
    properties: 2,
    suites: 0,
    monthlyValue: 12500,
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    autoRenewal: true,
    status: 'Active',
  },
  {
    id: 'c5',
    number: 'CTR-2024-005',
    clientName: 'Alberta Health Services',
    tier: 'Essential',
    season: 'Winter',
    properties: 1,
    suites: 0,
    monthlyValue: 10800,
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    autoRenewal: false,
    status: 'Pending',
  },
  {
    id: 'c6',
    number: 'CTR-2023-006',
    clientName: 'Heritage Park Historical Society',
    tier: 'Essential',
    season: 'Summer',
    properties: 1,
    suites: 0,
    monthlyValue: 8950,
    startDate: '2023-04-01',
    endDate: '2025-03-31',
    autoRenewal: true,
    status: 'Renewal',
  },
]

export function Contracts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showPricingCalc, setShowPricingCalc] = useState(false)
  const [calcTier, setCalcTier] = useState<'Essential' | 'Enhanced' | 'Premium'>('Premium')
  const [calcSeason, setCalcSeason] = useState<'Summer' | 'Winter'>('Winter')
  const [calcAddOns, setCalcAddOns] = useState(0)

  const filteredContracts = DEMO_CONTRACTS.filter(
    (contract) =>
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-900 text-green-200'
      case 'Pending':
        return 'bg-yellow-900 text-yellow-200'
      case 'Renewal':
        return 'bg-blue-900 text-blue-200'
      case 'Expired':
        return 'bg-red-900 text-red-200'
      default:
        return 'bg-slate-700 text-slate-200'
    }
  }

  const baseRate = TIER_RATES[calcTier][calcSeason.toLowerCase() as 'summer' | 'winter']
  const totalMonthly = baseRate + calcAddOns
  const totalAnnual = totalMonthly * 12

  const activeCount = DEMO_CONTRACTS.filter(c => c.status === 'Active').length
  const totalAnnualValue = DEMO_CONTRACTS.reduce((sum, c) => sum + (c.monthlyValue * 12), 0)
  const expiringCount = DEMO_CONTRACTS.filter(c => new Date(c.endDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contracts & Pricing</h1>
          <p className="text-slate-400 mt-2">Manage client contracts and service agreements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPricingCalc(!showPricingCalc)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
          >
            <DollarSign size={18} /> Pricing Calculator
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
            <Plus size={18} /> New Contract
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Active Contracts</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{activeCount}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Annual Value</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">${(totalAnnualValue / 1000000).toFixed(2)}M</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Expiring Soon (90d)</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{expiringCount}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Pending Renewal</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{DEMO_CONTRACTS.filter(c => c.status === 'Renewal').length}</p>
        </div>
      </div>

      {/* Pricing Calculator */}
      {showPricingCalc && (
        <div className="bg-slate-800 rounded-lg p-6 border border-blue-600">
          <h2 className="text-lg font-semibold text-white mb-4">Pricing Calculator</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Service Tier</label>
              <select
                value={calcTier}
                onChange={(e) => setCalcTier(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:border-blue-500 outline-none"
              >
                {Object.keys(TIER_RATES).map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Essential, Enhanced, or Premium support levels</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Season</label>
              <select
                value={calcSeason}
                onChange={(e) => setCalcSeason(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:border-blue-500 outline-none"
              >
                <option>Summer (May-Oct: 1 patrol/night)</option>
                <option selected>Winter (Nov-Apr: 2 patrols/night)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Static Guard Rate (per month)</label>
              <input
                type="number"
                value={calcAddOns}
                onChange={(e) => setCalcAddOns(parseInt(e.target.value) || 0)}
                placeholder="$0"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Guards @ $39.40/hr + 5% GST</p>
            </div>

            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <p className="text-slate-400 text-sm">Monthly Total</p>
              <p className="text-3xl font-bold text-green-400">${totalMonthly.toLocaleString()}</p>
              <p className="text-slate-400 text-sm mt-2">Annual: ${totalAnnual.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-600 rounded hover:bg-slate-700 transition-colors text-white">
            <Filter size={18} /> Filter
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Contract #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Client</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Tier</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Sites/Suites</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Monthly</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Period</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Auto-Renew</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="border-b border-slate-700 hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-400" />
                      <p className="text-white font-mono font-semibold text-sm">{contract.number}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{contract.clientName}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-blue-900 text-blue-200">
                      {contract.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-300 text-sm">{contract.properties} prop / {contract.suites || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-white font-semibold">${contract.monthlyValue.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {new Date(contract.startDate).toLocaleDateString()} to {new Date(contract.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${contract.autoRenewal ? 'bg-green-900 text-green-200' : 'bg-slate-700 text-slate-300'}`}>
                      {contract.autoRenewal ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewal Alerts */}
      <div className="bg-yellow-900 rounded-lg p-4 border border-yellow-700">
        <div className="flex items-start gap-3">
          <Bell size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold">Contract Renewals Coming Up</h3>
            <p className="text-yellow-200 text-sm mt-1">
              Heritage Park (CTR-2023-006) expires in 45 days. Recommend renewal discussion now.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
