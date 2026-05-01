import { TrendingUp, Plus, ChevronRight, Clock, DollarSign } from 'lucide-react'

export function SalesPipeline() {
  const deals = [
    {
      id: 'DEAL-001',
      name: 'Westfield Mall Security Contract',
      client: 'Westfield Properties',
      stage: 'negotiation',
      value: '$250,000',
      probability: 75,
      expectedClose: '2026-06-15',
    },
    {
      id: 'DEAL-002',
      name: 'University Campus Protection',
      client: 'Metropolitan University',
      stage: 'proposal',
      value: '$180,000',
      probability: 60,
      expectedClose: '2026-07-01',
    },
    {
      id: 'DEAL-003',
      name: 'Tech Park 24/7 Monitoring',
      client: 'Innovation Tech Park',
      stage: 'discovery',
      value: '$95,000',
      probability: 40,
      expectedClose: '2026-08-30',
    },
  ]

  const stageColors: Record<string, string> = {
    discovery: 'bg-blue-900 bg-opacity-20 text-blue-400',
    proposal: 'bg-purple-900 bg-opacity-20 text-purple-400',
    negotiation: 'bg-yellow-900 bg-opacity-20 text-yellow-400',
    closing: 'bg-green-900 bg-opacity-20 text-green-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <TrendingUp size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Sales Pipeline</h1>
              <p className="text-secondary mt-1">Track and manage sales opportunities</p>
            </div>
          </div>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-secondary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          New Deal
        </button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Total Pipeline Value</p>
          <p className="text-3xl font-bold text-primary">$525,000</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Active Deals</p>
          <p className="text-3xl font-bold text-accent">3</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Expected Q2 Revenue</p>
          <p className="text-3xl font-bold text-green-400">$198,500</p>
        </div>
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-secondary rounded-lg border border-default p-6 hover:border-accent transition-colors"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">{deal.name}</h3>
                <p className="text-secondary text-sm mt-1">{deal.client}</p>
              </div>
              <div className="flex items-end justify-between md:justify-end md:gap-6">
                <div>
                  <p className="text-secondary text-xs uppercase mb-1">Contract Value</p>
                  <p className="text-xl font-bold text-accent">{deal.value}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${stageColors[deal.stage]}`}>
                  {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                </span>
                <span className="text-sm text-secondary">{deal.probability}% probability</span>
              </div>
              <div className="w-full bg-card rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-accent to-blue-500 rounded-full h-2 transition-all"
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
            </div>

            {/* Expected Close Date */}
            <div className="flex items-center gap-2 text-secondary text-sm">
              <Clock size={16} />
              <span>Expected close: {deal.expectedClose}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Stages */}
      <div className="bg-secondary rounded-lg border border-default p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Pipeline Stages</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { stage: 'Discovery', count: 2, value: '$275,000' },
            { stage: 'Proposal', count: 2, value: '$275,000' },
            { stage: 'Negotiation', count: 1, value: '$250,000' },
            { stage: 'Closing', count: 0, value: '$0' },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-4 bg-primary rounded-lg border border-default">
              <p className="text-secondary text-sm mb-2">{item.stage}</p>
              <p className="text-2xl font-bold text-primary mb-1">{item.count}</p>
              <p className="text-accent font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
