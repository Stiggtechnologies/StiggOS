import { Zap, Plus, Edit2, Trash2, ToggleRight } from 'lucide-react'

export function AutomationRules() {
  const rules = [
    {
      id: 1,
      name: 'Critical Incident Alert',
      trigger: 'Incident severity = Critical',
      action: 'Send email to managers + SMS notification',
      enabled: true,
    },
    {
      id: 2,
      name: 'Shift Change Reminder',
      trigger: 'Guard shift starts in 2 hours',
      action: 'Send notification to guard',
      enabled: true,
    },
    {
      id: 3,
      name: 'Invoice Overdue Notice',
      trigger: 'Invoice due date passed',
      action: 'Email client + flag for follow-up',
      enabled: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <Zap size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Automation Rules</h1>
              <p className="text-secondary mt-1">Configure automated workflows and notifications</p>
            </div>
          </div>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-secondary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-secondary rounded-lg border border-default p-6 hover:border-accent transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-primary">{rule.name}</h3>
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      rule.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-secondary uppercase">Trigger</p>
                    <p className="text-primary">{rule.trigger}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-secondary uppercase">Action</p>
                    <p className="text-primary">{rule.action}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="p-2 hover:bg-card rounded-lg transition-colors" title="Toggle">
                  <ToggleRight size={20} className="text-accent" />
                </button>
                <button className="p-2 hover:bg-card rounded-lg transition-colors" title="Edit">
                  <Edit2 size={20} className="text-secondary" />
                </button>
                <button className="p-2 hover:bg-card rounded-lg transition-colors" title="Delete">
                  <Trash2 size={20} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
