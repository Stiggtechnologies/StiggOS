import { Wallet, TrendingUp, DollarSign, Eye } from 'lucide-react'

export function FinancialDashboard() {
  const metrics = [
    {
      label: 'Monthly Revenue',
      value: '$145,250',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
    },
    {
      label: 'Operating Costs',
      value: '$87,600',
      change: '+3.2%',
      trend: 'up',
      icon: Wallet,
    },
    {
      label: 'Net Profit',
      value: '$57,650',
      change: '+22.1%',
      trend: 'up',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <Wallet size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Financial Dashboard</h1>
              <p className="text-secondary mt-1">Revenue, costs, and profitability analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon
          return (
            <div
              key={idx}
              className="bg-secondary rounded-lg border border-default p-6 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
                  <Icon size={24} className="text-accent" />
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <TrendingUp size={16} />
                  <span className="text-sm font-semibold">{metric.change}</span>
                </div>
              </div>
              <p className="text-secondary text-sm mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-primary">{metric.value}</p>
            </div>
          )
        })}
      </div>

      {/* Financial Overview */}
      <div className="bg-secondary rounded-lg border border-default p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Monthly Breakdown</h2>
        <div className="space-y-4">
          {[
            { category: 'Guard Payroll', amount: '$42,500', percentage: 48 },
            { category: 'Equipment & Supplies', amount: '$18,300', percentage: 21 },
            { category: 'Operations', amount: '$15,800', percentage: 18 },
            { category: 'Administration', amount: '$11,000', percentage: 13 },
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-medium">{item.category}</span>
                <span className="text-secondary text-sm">{item.amount}</span>
              </div>
              <div className="w-full bg-card rounded-full h-2">
                <div
                  className="bg-accent rounded-full h-2 transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="bg-secondary rounded-lg border border-default p-4 hover:border-accent transition-colors text-left">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-accent" />
            <span className="text-primary font-semibold">View Detailed Reports</span>
          </div>
        </button>
        <button className="bg-secondary rounded-lg border border-default p-4 hover:border-accent transition-colors text-left">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-accent" />
            <span className="text-primary font-semibold">Export Financial Data</span>
          </div>
        </button>
      </div>
    </div>
  )
}
