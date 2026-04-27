import React, { useState } from 'react'
import { Search, Filter, Plus, Download, DollarSign, TrendingUp } from 'lucide-react'

interface InvoiceItem {
  id: string
  number: string
  clientName: string
  amount: number
  issueDate: string
  dueDate: string
  paidDate?: string
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue'
  lineItems: Array<{
    guardName: string
    hoursWorked: number
    hourlyRate: number
  }>
}

interface PayrollSummary {
  totalGuardCosts: number
  totalRevenue: number
  grossMargin: number
  marginPercent: number
}

const DEMO_INVOICES: InvoiceItem[] = [
  {
    id: 'i1',
    number: 'INV-2026-0401',
    clientName: 'Northview REIT',
    amount: 52300,
    issueDate: '2026-04-01',
    dueDate: '2026-04-30',
    paidDate: '2026-04-28',
    status: 'Paid',
    lineItems: [
      { guardName: 'Jemal', hoursWorked: 160, hourlyRate: 19 },
      { guardName: 'Solomon', hoursWorked: 150, hourlyRate: 18 },
      { guardName: 'Jean Marie', hoursWorked: 155, hourlyRate: 19 },
      { guardName: 'Kanwal', hoursWorked: 140, hourlyRate: 23.25 },
    ],
  },
  {
    id: 'i2',
    number: 'INV-2026-0402',
    clientName: 'Mainstreet Equity',
    amount: 35800,
    issueDate: '2026-04-02',
    dueDate: '2026-05-02',
    status: 'Sent',
    lineItems: [
      { guardName: 'Jemal', hoursWorked: 120, hourlyRate: 19 },
      { guardName: 'Solomon', hoursWorked: 110, hourlyRate: 18 },
    ],
  },
  {
    id: 'i3',
    number: 'INV-2026-0403',
    clientName: 'Canadian Tire',
    amount: 21400,
    issueDate: '2026-04-03',
    dueDate: '2026-05-03',
    status: 'Sent',
    lineItems: [
      { guardName: 'Jean Marie', hoursWorked: 100, hourlyRate: 19 },
    ],
  },
  {
    id: 'i4',
    number: 'INV-2026-0324',
    clientName: 'AHS',
    amount: 14200,
    issueDate: '2026-03-24',
    dueDate: '2026-04-23',
    status: 'Overdue',
    lineItems: [
      { guardName: 'Kanwal', hoursWorked: 80, hourlyRate: 23.25 },
    ],
  },
  {
    id: 'i5',
    number: 'INV-2026-0404',
    clientName: 'Heritage Park',
    amount: 8950,
    issueDate: '2026-04-04',
    dueDate: '2026-05-04',
    status: 'Draft',
    lineItems: [
      { guardName: 'Jemal', hoursWorked: 40, hourlyRate: 19 },
    ],
  },
  {
    id: 'i6',
    number: 'INV-2026-0328',
    clientName: 'Northview REIT',
    amount: 49800,
    issueDate: '2026-03-28',
    dueDate: '2026-04-27',
    paidDate: '2026-04-25',
    status: 'Paid',
    lineItems: [
      { guardName: 'Jemal', hoursWorked: 158, hourlyRate: 19 },
      { guardName: 'Solomon', hoursWorked: 152, hourlyRate: 18 },
    ],
  },
]

const DEMO_MONTHLY_REVENUE = [
  { month: 'Nov', revenue: 145000 },
  { month: 'Dec', revenue: 168000 },
  { month: 'Jan', revenue: 172000 },
  { month: 'Feb', revenue: 169000 },
  { month: 'Mar', revenue: 171000 },
  { month: 'Apr', revenue: 164500 },
]

export function Invoicing() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [showPayroll, setShowPayroll] = useState(false)

  const filteredInvoices = DEMO_INVOICES.filter(
    (invoice) =>
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-900 text-green-200'
      case 'Sent':
        return 'bg-blue-900 text-blue-200'
      case 'Draft':
        return 'bg-slate-700 text-slate-200'
      case 'Overdue':
        return 'bg-red-900 text-red-200'
      default:
        return 'bg-slate-700 text-slate-200'
    }
  }

  const mtdRevenue = DEMO_INVOICES.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0)
  const ytdRevenue = DEMO_MONTHLY_REVENUE.reduce((sum, m) => sum + m.revenue, 0)
  const outstandingAR = DEMO_INVOICES.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = DEMO_INVOICES.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0)

  // Calculate payroll
  const totalGuardCosts = DEMO_INVOICES.reduce((sum, inv) => {
    const guardCosts = inv.lineItems.reduce((gSum, item) => gSum + (item.hoursWorked * item.hourlyRate), 0)
    return sum + guardCosts
  }, 0)
  const totalBilledRevenue = DEMO_INVOICES.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0)
  const grossMargin = totalBilledRevenue - totalGuardCosts
  const marginPercent = totalBilledRevenue > 0 ? (grossMargin / totalBilledRevenue) * 100 : 0

  const renderRevenueChart = () => {
    const chartHeight = 150
    const chartWidth = 600
    const maxRevenue = Math.max(...DEMO_MONTHLY_REVENUE.map(r => r.revenue))
    const barWidth = (chartWidth - 40) / DEMO_MONTHLY_REVENUE.length
    const padding = 20

    return (
      <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = chartHeight - padding - ((percent / 100) * (chartHeight - padding * 2))
          return (
            <line key={`grid-${percent}`} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#475569" strokeWidth="1" />
          )
        })}

        {/* Data bars */}
        {DEMO_MONTHLY_REVENUE.map((data, idx) => {
          const barHeight = (data.revenue / maxRevenue) * (chartHeight - padding * 2)
          const x = padding + idx * barWidth + barWidth / 2 - 10
          const y = chartHeight - padding - barHeight
          return (
            <g key={`bar-${idx}`}>
              <rect x={x} y={y} width="20" height={barHeight} fill="#10b981" opacity="0.8" rx="2" />
            </g>
          )
        })}

        {/* Labels */}
        {DEMO_MONTHLY_REVENUE.map((data, idx) => {
          const x = padding + idx * barWidth + barWidth / 2
          return (
            <text key={`label-${idx}`} x={x} y={chartHeight - 5} textAnchor="middle" className="text-xs" fill="#94a3b8">
              {data.month}
            </text>
          )
        })}
      </svg>
    )
  }

  const selectedInvoiceData = selectedInvoice ? DEMO_INVOICES.find(inv => inv.id === selectedInvoice) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoicing & Financial</h1>
          <p className="text-slate-400 mt-2">Manage invoices, revenue, and payroll</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPayroll(!showPayroll)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
          >
            <DollarSign size={18} /> Payroll Summary
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
            <Plus size={18} /> New Invoice
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">MTD Revenue</p>
          <p className="text-3xl font-bold text-green-400 mt-2">${(mtdRevenue / 1000).toFixed(1)}K</p>
          <p className="text-slate-500 text-xs mt-1">Paid invoices this month</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">YTD Revenue</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">${(ytdRevenue / 1000).toFixed(0)}K</p>
          <p className="text-slate-500 text-xs mt-1">Year-to-date total</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Outstanding AR</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">${(outstandingAR / 1000).toFixed(1)}K</p>
          <p className="text-slate-500 text-xs mt-1">Awaiting payment</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-red-700">
          <p className="text-red-400 text-sm font-semibold">Overdue Amount</p>
          <p className="text-3xl font-bold text-red-400 mt-2">${(overdueAmount / 1000).toFixed(1)}K</p>
          <p className="text-slate-500 text-xs mt-1">30+ days past due</p>
        </div>
      </div>

      {/* Payroll Summary */}
      {showPayroll && (
        <div className="bg-slate-800 rounded-lg p-6 border border-green-600">
          <h2 className="text-lg font-semibold text-white mb-4">Payroll Summary (YTD)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Total Guard Costs</p>
              <p className="text-3xl font-bold text-red-400 mt-2">${totalGuardCosts.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">All shifts paid</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Revenue (Paid)</p>
              <p className="text-3xl font-bold text-green-400 mt-2">${totalBilledRevenue.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">From paid invoices</p>
            </div>
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <p className="text-slate-400 text-sm">Gross Margin</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">${grossMargin.toLocaleString()}</p>
              <p className="text-blue-400 text-sm mt-1">{marginPercent.toFixed(1)}% margin</p>
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
                placeholder="Search invoices..."
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

      {/* Invoices Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Invoice #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Client</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Issued</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Due</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  <tr className="border-b border-slate-700 hover:bg-slate-900 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-mono font-semibold text-sm">{invoice.number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{invoice.clientName}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white font-semibold">${invoice.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          {selectedInvoice === invoice.id ? 'Hide' : 'View'}
                        </button>
                        <button className="text-blue-400 hover:text-blue-300">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {selectedInvoice === invoice.id && selectedInvoiceData && (
                    <tr className="border-b border-slate-700 bg-slate-900">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-white font-semibold mb-2">Line Items</h4>
                              <div className="space-y-2 text-sm">
                                {selectedInvoiceData.lineItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-300 border-b border-slate-700 pb-1">
                                    <span>{item.guardName}</span>
                                    <span>{item.hoursWorked}h @ ${item.hourlyRate}/hr</span>
                                    <span className="text-white">${(item.hoursWorked * item.hourlyRate).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded border border-slate-700">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-300">
                                  <span>Subtotal:</span>
                                  <span className="text-white">${selectedInvoiceData.lineItems.reduce((sum, item) => sum + (item.hoursWorked * item.hourlyRate), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>GST (5%):</span>
                                  <span className="text-white">${(selectedInvoiceData.lineItems.reduce((sum, item) => sum + (item.hoursWorked * item.hourlyRate), 0) * 0.05).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-white font-semibold border-t border-slate-600 pt-2">
                                  <span>Total:</span>
                                  <span>${selectedInvoiceData.amount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue (Last 6 Months)</h2>
        <div className="overflow-x-auto">
          {renderRevenueChart()}
        </div>
        <p className="text-slate-400 text-xs mt-4">Revenue based on paid invoices. Strong performance with consistent billings.</p>
      </div>
    </div>
  )
}
