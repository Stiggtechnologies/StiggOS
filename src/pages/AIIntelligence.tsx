import React, { useState } from 'react'
import { Brain, TrendingUp, AlertCircle, Zap, CheckCircle, Clock, X } from 'lucide-react'

const DEMO_INSIGHTS = [
  {
    title: 'High Risk of Incident at Northview #5',
    description: 'Historical pattern analysis indicates 73% probability of incident occurrence within next 72 hours based on patrol gaps and weather conditions.',
    category: 'Predictive Analytics',
    icon: AlertCircle,
    confidence: 89,
    action: 'Schedule Review',
  },
  {
    title: 'Scheduling Optimization: Peak Hours',
    description: 'Analysis shows 73% of incidents occur between 11PM-2AM. Recommend adding 2 guards during this window for Northview cluster.',
    category: 'Scheduling Optimization',
    icon: Clock,
    confidence: 92,
    action: 'Apply Recommendation',
  },
  {
    title: 'Cost Optimization: Mainstreet Equity #3',
    description: 'Switch from static patrol to event-based coverage. Projected 15% cost reduction while maintaining KPI scores at 90%+.',
    category: 'Cost Optimization',
    icon: Zap,
    confidence: 78,
    action: 'Approve Change',
  },
  {
    title: 'Guard Fatigue Risk: Solomon Abdi',
    description: 'Solomon has worked 6 consecutive night shifts. Recommend 24-hour rest period to prevent performance degradation and safety issues.',
    category: 'Staffing',
    icon: AlertCircle,
    confidence: 85,
    action: 'Assign Coverage',
  },
  {
    title: 'Severe Weather Advisory',
    description: 'Hail and heavy precipitation expected for next 48 hours. Recommend increasing patrol frequency by 25% at all properties.',
    category: 'Weather Alert',
    icon: AlertCircle,
    confidence: 96,
    action: 'Activate Protocol',
  },
  {
    title: 'Patrol Route Optimization: Northview #12',
    description: 'Route reordering can reduce completion time by 8 minutes while increasing checkpoint coverage. Estimated 12% efficiency gain.',
    category: 'Operations',
    icon: TrendingUp,
    confidence: 82,
    action: 'Update Route',
  },
  {
    title: 'Performance Prediction: Q2 Targets',
    description: 'Projected KPI score improvement to 94.5% by end of Q2 if staffing recommendations are implemented.',
    category: 'Performance Prediction',
    icon: TrendingUp,
    confidence: 74,
    action: 'View Details',
  },
  {
    title: 'Anomaly Detected: Jean Marie',
    description: 'Unusual patrol checkpoint timing patterns detected. 3 checkpoints completed 15+ minutes ahead of schedule.',
    category: 'Anomaly Detection',
    icon: AlertCircle,
    confidence: 68,
    action: 'Investigate',
  },
  {
    title: 'Client Satisfaction Risk: Canadian Tire #2',
    description: 'Response time degradation detected. Average response now 8.5 min vs 5.2 min historical. Immediate action recommended.',
    category: 'Client Satisfaction',
    icon: AlertCircle,
    confidence: 79,
    action: 'Address Issue',
  },
  {
    title: 'License Expiry: Kanwal Singh',
    description: 'Security Level 2 certification expires in 45 days. Schedule renewal training within 30 days to maintain coverage.',
    category: 'Compliance',
    icon: Clock,
    confidence: 100,
    action: 'Schedule Training',
  },
]

export function AIIntelligence() {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...new Set(DEMO_INSIGHTS.map(i => i.category))]
  const filteredInsights = DEMO_INSIGHTS.filter(i => {
    if (dismissedInsights.includes(i.title)) return false
    if (selectedCategory === 'all') return true
    return i.category === selectedCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">AI Intelligence</h1>
        <p className="text-secondary mt-2">Machine learning insights and predictive analytics</p>
      </div>

      {/* AI Engine Status */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain size={28} />
          <h2 className="text-xl font-semibold">Stigg AI Engine</h2>
        </div>
        <p className="text-sm opacity-90">
          Analyzing 1,247 data points from 8 active guards, 3 clients, and 6+ sites across Alberta. Processing real-time patrol patterns, incident correlations, and predictive models updated every 4 hours.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition-colors">
            View Model Performance
          </button>
          <button className="px-4 py-2 border border-white/30 text-white hover:bg-white/10 rounded font-medium transition-colors">
            Settings
          </button>
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg border border-default">
          <p className="text-secondary text-sm">Model Accuracy</p>
          <p className="text-3xl font-bold text-green-400 mt-2">94.2%</p>
          <p className="text-secondary text-xs mt-2">Prediction accuracy on test set</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-default">
          <p className="text-secondary text-sm">Last Training Run</p>
          <p className="text-primary font-medium mt-2">Today at 03:45 AM</p>
          <p className="text-secondary text-xs mt-2">Updated with 48 hours of data</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-default">
          <p className="text-secondary text-sm">Active Insights</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{filteredInsights.length}</p>
          <p className="text-secondary text-xs mt-2">Requiring action</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-card rounded-lg p-4 border border-default">
        <p className="text-secondary text-sm mb-3">Filter by Category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-secondary hover:bg-secondary/80 text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="space-y-4">
        {filteredInsights.map((insight, idx) => {
          const Icon = insight.icon
          return (
            <div key={idx} className="bg-card p-6 rounded-lg border border-default hover:border-accent transition-colors">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg flex-shrink-0 ${
                  insight.confidence >= 90 ? 'bg-red-500/20' :
                  insight.confidence >= 80 ? 'bg-amber-500/20' :
                  'bg-blue-500/20'
                }`}>
                  <Icon size={24} className={
                    insight.confidence >= 90 ? 'text-red-400' :
                    insight.confidence >= 80 ? 'text-amber-400' :
                    'text-blue-400'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary">{insight.title}</h3>
                  <p className="text-secondary mt-2">{insight.description}</p>

                  <div className="flex items-center gap-4 mt-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-secondary text-sm">Confidence:</span>
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            insight.confidence >= 90 ? 'bg-red-500' :
                            insight.confidence >= 80 ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${insight.confidence}%` }}
                        />
                      </div>
                      <span className="text-primary font-medium text-sm min-w-[3rem]">{insight.confidence}%</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-secondary/50 text-secondary rounded">
                      {insight.category}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs font-medium transition-colors">
                      <CheckCircle size={14} />
                      {insight.action}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 text-secondary rounded text-xs font-medium transition-colors">
                      <Clock size={14} />
                      Schedule Review
                    </button>
                    <button
                      onClick={() => setDismissedInsights([...dismissedInsights, insight.title])}
                      className="flex items-center gap-1 px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 text-secondary rounded text-xs font-medium transition-colors ml-auto"
                    >
                      <X size={14} />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Risk Heat Map */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Risk Heat Map</h3>
        <p className="text-secondary text-sm mb-4">Incident probability by property and time of day</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-2 px-2 text-secondary">Property</th>
                <th className="py-2 px-2 text-secondary text-center">12AM-6AM</th>
                <th className="py-2 px-2 text-secondary text-center">6AM-12PM</th>
                <th className="py-2 px-2 text-secondary text-center">12PM-6PM</th>
                <th className="py-2 px-2 text-secondary text-center">6PM-12AM</th>
              </tr>
            </thead>
            <tbody>
              {['Northview #5', 'Northview #7', 'Mainstreet #3', 'Canadian Tire #2'].map(prop => (
                <tr key={prop} className="border-b border-default">
                  <td className="py-2 px-2 text-primary font-medium">{prop}</td>
                  <td className="py-2 px-2 text-center"><div className="inline-block w-6 h-6 bg-red-500 rounded" /></td>
                  <td className="py-2 px-2 text-center"><div className="inline-block w-6 h-6 bg-amber-500 rounded" /></td>
                  <td className="py-2 px-2 text-center"><div className="inline-block w-6 h-6 bg-yellow-500 rounded" /></td>
                  <td className="py-2 px-2 text-center"><div className="inline-block w-6 h-6 bg-amber-600 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-secondary">Critical (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded" />
            <span className="text-secondary">High (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded" />
            <span className="text-secondary">Moderate (20-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-secondary">Low (less than 20%)</span>
          </div>
        </div>
      </div>

      {/* Anomaly Detection Feed */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Anomaly Detection Feed</h3>
        <div className="space-y-3">
          {[
            { type: 'Patrol Skip', guard: 'Jean Marie', detail: 'Skipped checkpoint 3 at Northview #5', time: '2 hours ago' },
            { type: 'Timing Variance', guard: 'Jemal Hassan', detail: 'Route completed 12 min ahead of schedule', time: '4 hours ago' },
            { type: 'Coverage Gap', property: 'Mainstreet #3', detail: '23-minute gap between patrols detected', time: '6 hours ago' },
          ].map((anomaly, idx) => (
            <div key={idx} className="flex items-start justify-between p-3 bg-secondary/20 rounded border border-default/50">
              <div className="flex-1">
                <p className="text-primary font-medium">{anomaly.type}</p>
                <p className="text-secondary text-sm">{('guard' in anomaly ? anomaly.guard : anomaly.property)}</p>
                <p className="text-secondary text-xs mt-1">{anomaly.detail}</p>
              </div>
              <div className="text-secondary text-xs flex-shrink-0">{anomaly.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
