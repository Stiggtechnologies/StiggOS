import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, PieChart, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

type FinTab = 'overview' | 'receivables' | 'expenses' | 'profitability'

const revenueByClient = [
  { client: 'Northview Residential REIT', monthly: 52000, ytd: 208000, margin: 34.2 },
  { client: 'Mainstreet Equity Corp', monthly: 38500, ytd: 154000, margin: 31.8 },
  { client: 'Avenue Living', monthly: 37000, ytd: 148000, margin: 36.5 },
]

const arAging = [
  { bucket: 'Current', amount: 42500, count: 3, color: 'bg-green-500' },
  { bucket: '1-30 Days', amount: 18200, count: 2, color: 'bg-yellow-500' },
  { bucket: '31-60 Days', amount: 8500, count: 1, color: 'bg-orange-500' },
  { bucket: '61-90 Days', amount: 3200, count: 1, color: 'bg-red-400' },
  { bucket: '90+ Days', amount: 0, count: 0, color: 'bg-red-600' },
]

const recentExpenses = [
  { date: '2026-04-25', category: 'fuel', description: 'Patrol vehicle fuel - Unit 3', amount: 145.60, status: 'approved', billable: true },
  { date: '2026-04-24', category: 'equipment', description: 'Replacement radio batteries (x6)', amount: 234.00, status: 'approved', billable: false },
  { date: '2026-04-23', category: 'uniform', description: 'New guard uniforms (x2)', amount: 380.00, status: 'pending', billable: false },
  { date: '2026-04-22', category: 'training', description: 'First Aid recertification - Jemal', amount: 175.00, status: 'approved', billable: false },
  { date: '2026-04-20', category: 'vehicle_maintenance', description: 'Oil change + tire rotation - Unit 1', amount: 289.50, status: 'approved', billable: false },
  { date: '2026-04-18', category: 'insurance', description: 'Monthly liability insurance premium', amount: 1850.00, status: 'approved', billable: false },
  { date: '2026-04-15', category: 'office_supplies', description: 'Printer paper, incident report forms', amount: 67.20, status: 'reimbursed', billable: false },
]

const monthlyFinancials = [
  { month: 'Jan', revenue: 118500, expenses: 78200, profit: 40300 },
  { month: 'Feb', revenue: 121000, expenses: 79800, profit: 41200 },
  { month: 'Mar', revenue: 125500, expenses: 82100, profit: 43400 },
  { month: 'Apr', revenue: 127500, expenses: 83900, profit: 43600 },
]

const cashFlow = {
  openingBalance: 142800,
  totalInflows: 127500,
  totalOutflows: 83900,
  netCashFlow: 43600,
  closingBalance: 186400,
  gstCollected: 6375,
  gstPaid: 2180,
  gstOwing: 4195,
}

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState<FinTab>('overview')

  const totalAR = arAging.reduce((sum, a) => sum + a.amount, 0)
  const totalExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0)

  const tabs = [
    { id: 'overview' as FinTab, label: 'Overview', icon: PieChart },
    { id: 'receivables' as FinTab, label: 'Receivables', icon: Clock },
    { id: 'expenses' as FinTab, label: 'Expenses', icon: Receipt },
    { id: 'profitability' as FinTab, label: 'Profitability', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Dashboard</h1>
        <p className="text-slate-400 mt-1">Revenue, expenses, cash flow, and profitability analysis</p>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Monthly Revenue</p>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">$127.5K</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs">+1.6% vs last month</span>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Monthly Expenses</p>
            <CreditCard className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">$83.9K</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-red-400" />
            <span className="text-red-400 text-xs">+2.2% vs last month</span>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Net Profit</p>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-green-400 mt-2">$43.6K</p>
          <p className="text-slate-400 text-xs mt-1">34.2% margin</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Outstanding AR</p>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400 mt-2">${(totalAR / 1000).toFixed(1)}K</p>
          <p className="text-slate-400 text-xs mt-1">{arAging.reduce((s, a) => s + a.count, 0)} invoices outstanding</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {tabs.map(tab => (
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-4">Monthly Trend (2026)</h3>
            <div className="space-y-3">
              {monthlyFinancials.map(m => (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{m.month}</span>
                    <span className="text-green-400 font-medium">${(m.profit / 1000).toFixed(1)}K profit</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div className="bg-green-500/30 rounded" style={{ width: `${(m.revenue / 130000) * 100}%` }}>
                      <div className="h-full bg-green-500 rounded" style={{ width: `${(m.profit / m.revenue) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Revenue: ${(m.revenue / 1000).toFixed(1)}K</span>
                    <span>Expenses: ${(m.expenses / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow Summary */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-4">Cash Flow — April 2026</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300 text-sm">Opening Balance</span>
                <span className="text-white font-medium">${cashFlow.openingBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-500/10 rounded-lg">
                <span className="text-green-400 text-sm">+ Total Inflows</span>
                <span className="text-green-400 font-medium">+${cashFlow.totalInflows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-500/10 rounded-lg">
                <span className="text-red-400 text-sm">- Total Outflows</span>
                <span className="text-red-400 font-medium">-${cashFlow.totalOutflows.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between p-3 bg-blue-500/10 rounded-lg">
                  <span className="text-blue-400 text-sm font-medium">Closing Balance</span>
                  <span className="text-blue-400 font-bold text-lg">${cashFlow.closingBalance.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                <p className="text-slate-400 text-xs mb-2">GST Summary (5%)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Collected</p>
                    <p className="text-sm text-white">${cashFlow.gstCollected.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid (ITC)</p>
                    <p className="text-sm text-white">${cashFlow.gstPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Owing</p>
                    <p className="text-sm text-yellow-400 font-medium">${cashFlow.gstOwing.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receivables Tab */}
      {activeTab === 'receivables' && (
        <div className="space-y-6">
          {/* AR Aging */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-4">Accounts Receivable Aging</h3>
            <div className="flex gap-2 mb-4 h-8">
              {arAging.filter(a => a.amount > 0).map(a => (
                <div
                  key={a.bucket}
                  className={`${a.color} rounded flex items-center justify-center text-xs text-white font-medium`}
                  style={{ width: `${(a.amount / totalAR) * 100}%` }}
                >
                  {a.bucket}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {arAging.map(a => (
                <div key={a.bucket} className="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div className={`w-3 h-3 ${a.color} rounded-full mx-auto mb-2`} />
                  <p className="text-xs text-slate-400">{a.bucket}</p>
                  <p className="text-white font-bold">${a.amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{a.count} invoices</p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Client */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">Revenue by Client</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs text-slate-400 font-medium p-4">Client</th>
                  <th className="text-right text-xs text-slate-400 font-medium p-4">Monthly</th>
                  <th className="text-right text-xs text-slate-400 font-medium p-4">YTD</th>
                  <th className="text-right text-xs text-slate-400 font-medium p-4">Margin</th>
                </tr>
              </thead>
              <tbody>
                {revenueByClient.map((c, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 text-sm text-white font-medium">{c.client}</td>
                    <td className="p-4 text-sm text-white text-right">${c.monthly.toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-300 text-right">${c.ytd.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-medium ${c.margin >= 35 ? 'text-green-400' : c.margin >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {c.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Expenses</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Total: </span>
              <span className="text-white font-bold">${totalExpenses.toLocaleString()}</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Date</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Category</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Description</th>
                <th className="text-right text-xs text-slate-400 font-medium p-4">Amount</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((e, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4 text-sm text-slate-300">{e.date}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                      {e.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white">{e.description}</td>
                  <td className="p-4 text-sm text-white font-medium text-right">${e.amount.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      e.status === 'approved' ? 'text-green-400 bg-green-400/10' :
                      e.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10' :
                      'text-blue-400 bg-blue-400/10'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profitability Tab */}
      {activeTab === 'profitability' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-4">Profitability by Client</h3>
            <div className="space-y-4">
              {revenueByClient.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{c.client}</span>
                    <span className={`font-medium ${c.margin >= 35 ? 'text-green-400' : 'text-yellow-400'}`}>{c.margin}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-700 rounded-full">
                    <div
                      className={`h-3 rounded-full ${c.margin >= 35 ? 'bg-green-500' : c.margin >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${c.margin}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Revenue: ${c.monthly.toLocaleString()}/mo</span>
                    <span>Profit: ${Math.round(c.monthly * c.margin / 100).toLocaleString()}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-4">Cost Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Guard Wages', amount: 58200, pct: 69.4, color: 'bg-blue-500' },
                { label: 'Overtime', amount: 4800, pct: 5.7, color: 'bg-purple-500' },
                { label: 'Insurance', amount: 5550, pct: 6.6, color: 'bg-yellow-500' },
                { label: 'Vehicle & Fuel', amount: 4200, pct: 5.0, color: 'bg-orange-500' },
                { label: 'Equipment', amount: 3100, pct: 3.7, color: 'bg-cyan-500' },
                { label: 'Training', amount: 2200, pct: 2.6, color: 'bg-green-500' },
                { label: 'Admin & Other', amount: 5850, pct: 7.0, color: 'bg-slate-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="text-white font-medium">${item.amount.toLocaleString()} <span className="text-slate-500 text-xs">({item.pct}%)</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                      <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
