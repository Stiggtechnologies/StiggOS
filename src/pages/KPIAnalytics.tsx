import React, { useState } from 'react'
import { TrendingUp, Target, AlertCircle, Download } from 'lucide-react'

interface KPIMetric {
  id: string
  category: 'asset_protection' | 'patrol_compliance' | 'incident_response' | 'risk_hotspot' | 'maintenance'
  label: string
  score: number
  target: number
  unit: string
  description: string
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  lastMonth: number
  details: {
    metric1: { label: string; value: string }
    metric2: { label: string; value: string }
  }
}

const DEMO_KPIS: KPIMetric[] = [
  {
    id: 'k1',
    category: 'asset_protection',
    label: 'Asset Protection Score',
    score: 96,
    target: 95,
    unit: '%',
    description: 'Incidents prevented, deterrence rating',
    trend: 'up',
    trendPercent: 3.2,
    lastMonth: 93,
    details: {
      metric1: { label: 'Incidents Prevented', value: '24/25' },
      metric2: { label: 'Deterrence Rating', value: '9.2/10' },
    },
  },
  {
    id: 'k2',
    category: 'patrol_compliance',
    label: 'Patrol Delivery & Compliance',
    score: 98,
    target: 98,
    unit: '%',
    description: 'On-time %, route completion, checkpoint accuracy',
    trend: 'stable',
    trendPercent: 0,
    lastMonth: 98,
    details: {
      metric1: { label: 'On-Time Performance', value: '99.2%' },
      metric2: { label: 'Route Completion', value: '100%' },
    },
  },
  {
    id: 'k3',
    category: 'incident_response',
    label: 'Incident Response & Escalation',
    score: 94,
    target: 95,
    unit: '%',
    description: 'Avg <5min response time, escalation compliance',
    trend: 'up',
    trendPercent: 2.1,
    lastMonth: 92,
    details: {
      metric1: { label: 'Avg Response Time', value: '3.2 min' },
      metric2: { label: 'Escalation Compliance', value: '98.5%' },
    },
  },
  {
    id: 'k4',
    category: 'risk_hotspot',
    label: 'Recurring Risk & Hotspot Trends',
    score: 87,
    target: 90,
    unit: '%',
    description: 'Risk heat zones, trending incident categories',
    trend: 'down',
    trendPercent: -1.5,
    lastMonth: 88.5,
    details: {
      metric1: { label: 'Identified Hotspots', value: '8 zones' },
      metric2: { label: 'Risk Mitigation', value: '7/8 addressed' },
    },
  },
  {
    id: 'k5',
    category: 'maintenance',
    label: 'Maintenance Impact',
    score: 92,
    target: 90,
    unit: '%',
    description: 'Issues reported to property mgmt, resolution rate',
    trend: 'up',
    trendPercent: 1.8,
    lastMonth: 90.2,
    details: {
      metric1: { label: 'Issues Reported', value: '34 items' },
      metric2: { label: 'Resolution Rate', value: '94.1%' },
    },
  },
]

const DEMO_TRENDS = [
  { month: 'Nov', assetProt: 88, patrolComp: 96, incidentResp: 89, riskHot: 85, maint: 88 },
  { month: 'Dec', assetProt: 90, patrolComp: 97, incidentResp: 91, riskHot: 84, maint: 88 },
  { month: 'Jan', assetProt: 92, patrolComp: 97.5, incidentResp: 92, riskHot: 86, maint: 89 },
  { month: 'Feb', assetProt: 93, patrolComp: 98, incidentResp: 93, riskHot: 87, maint: 91 },
  { month: 'Mar', assetProt: 94, patrolComp: 98, incidentResp: 93.5, riskHot: 87, maint: 91.5 },
  { month: 'Apr', assetProt: 96, patrolComp: 98, incidentResp: 94, riskHot: 87, maint: 92 },
]

export function KPIAnalytics() {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState('northview')

  const getScoreColor = (score: number, target: number) => {
    const percent = (score / target) * 100
    if (percent >= 100) return 'text-green-400'
    if (percent >= 90) return 'text-green-400'
    if (percent >= 75) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number, target: number) => {
    const percent = (score / target) * 100
    if (percent >= 100) return 'bg-green-900'
    if (percent >= 90) return 'bg-green-900'
    if (percent >= 75) return 'bg-yellow-900'
    return 'bg-red-900'
  }

  const compositeScore = Math.round(
    (DEMO_KPIS.reduce((sum, kpi) => sum + kpi.score, 0) / DEMO_KPIS.length / 100) * 100
  ) / 100

  const renderCircleGauge = (score: number, target: number, size = 120) => {
    const percentage = Math.min((score / target) * 100, 100)
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (percentage / 100) * circumference

    return (
      <svg width={size} height={size} className="mx-auto">
        <circle cx={size / 2} cy={size / 2} r="45" fill="none" stroke="#334155" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r="45"
          fill="none"
          stroke={percentage >= 100 ? '#4ade80' : percentage >= 90 ? '#4ade80' : percentage >= 75 ? '#facc15' : '#f87171'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x={size / 2} y={size / 2 + 8} textAnchor="middle" className="text-white font-bold text-2xl" fill="white">
          {score}%
        </text>
      </svg>
    )
  }

  const renderTrendChart = () => {
    const chartHeight = 200
    const chartWidth = 600
    const maxScore = 100
    const barWidth = (chartWidth - 40) / DEMO_TRENDS.length
    const padding = 20

    return (
      <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => (
          <line
            key={`grid-${val}`}
            x1={padding}
            y1={chartHeight - ((val / maxScore) * (chartHeight - padding * 2)) - padding}
            x2={chartWidth - padding}
            y2={chartHeight - ((val / maxScore) * (chartHeight - padding * 2)) - padding}
            stroke="#475569"
            strokeWidth="1"
          />
        ))}

        {/* Data bars */}
        {DEMO_TRENDS.map((data, idx) => {
          const x = padding + idx * barWidth + barWidth / 2 - 10
          const assetProtHeight = (data.assetProt / maxScore) * (chartHeight - padding * 2)
          const y = chartHeight - padding - assetProtHeight
          return (
            <g key={`trend-${idx}`}>
              <rect x={x} y={y} width="20" height={assetProtHeight} fill="#3b82f6" opacity="0.8" rx="2" />
            </g>
          )
        })}

        {/* Labels */}
        {DEMO_TRENDS.map((data, idx) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">KPI Analytics</h1>
          <p className="text-slate-400 mt-2">Performance metrics across 5 operational categories</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Composite Score</p>
          <p className="text-4xl font-bold text-blue-400 mt-2">{compositeScore.toFixed(1)}%</p>
          <p className="text-slate-500 text-xs mt-2">Weighted average of 5 KPIs</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">On Target</p>
          <p className="text-4xl font-bold text-green-400 mt-2">3/5</p>
          <p className="text-slate-500 text-xs mt-2">KPIs meeting or exceeding targets</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">Trend</p>
          <p className="text-4xl font-bold text-green-400 mt-2">+2.1%</p>
          <p className="text-slate-500 text-xs mt-2">Month-over-month improvement</p>
        </div>
      </div>

      {/* KPI Gauge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DEMO_KPIS.map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => setSelectedKPI(selectedKPI === kpi.id ? null : kpi.id)}
            className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{kpi.label}</h3>
                <p className="text-slate-400 text-sm mt-1">{kpi.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {kpi.trend === 'up' && <TrendingUp size={18} className="text-green-400" />}
                {kpi.trend === 'down' && <TrendingUp size={18} className="text-red-400 transform rotate-180" />}
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div>
                {renderCircleGauge(kpi.score, kpi.target, 100)}
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Target</p>
                <p className="text-2xl font-bold text-white">{kpi.target}{kpi.unit}</p>
                <div className={`mt-2 px-2 py-1 rounded text-xs font-semibold ${
                  kpi.trend === 'up' ? 'bg-green-900 text-green-200' : kpi.trend === 'down' ? 'bg-red-900 text-red-200' : 'bg-slate-700 text-slate-300'
                }`}>
                  {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {Math.abs(kpi.trendPercent)}% {kpi.trend !== 'stable' ? (kpi.trend === 'up' ? 'above' : 'below') : ''}
                </div>
              </div>
            </div>

            {selectedKPI === kpi.id && (
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{kpi.details.metric1.label}</span>
                  <span className="text-white font-medium">{kpi.details.metric1.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{kpi.details.metric2.label}</span>
                  <span className="text-white font-medium">{kpi.details.metric2.value}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 6-Month Trend Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">6-Month Trend (Asset Protection)</h2>
        <div className="overflow-x-auto">
          {renderTrendChart()}
        </div>
        <p className="text-slate-400 text-xs mt-4">Asset Protection Score trend over the last 6 months showing steady improvement</p>
      </div>

      {/* Monthly Comparison Table */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Monthly Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-2 text-left text-slate-400 font-semibold">Month</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Asset Prot.</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Patrol Comp.</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Incident Resp.</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Risk/Hotspot</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Maintenance</th>
                <th className="px-4 py-2 text-center text-slate-400 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRENDS.map((row, idx) => {
                const avg = Math.round((row.assetProt + row.patrolComp + row.incidentResp + row.riskHot + row.maint) / 5)
                return (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-900">
                    <td className="px-4 py-3 text-slate-300 font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-center text-white">{row.assetProt}%</td>
                    <td className="px-4 py-3 text-center text-white">{row.patrolComp}%</td>
                    <td className="px-4 py-3 text-center text-white">{row.incidentResp}%</td>
                    <td className="px-4 py-3 text-center text-white">{row.riskHot}%</td>
                    <td className="px-4 py-3 text-center text-white">{row.maint}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${avg >= 95 ? 'text-green-400' : avg >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {avg}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
