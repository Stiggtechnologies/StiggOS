import { FileBarChart, Plus, Download, Calendar, Filter } from 'lucide-react'

export function ReportingEngine() {
  const reports = [
    {
      id: 1,
      name: 'Monthly Operations Report',
      type: 'Operations',
      lastGenerated: '2026-04-30',
      format: 'PDF',
    },
    {
      id: 2,
      name: 'Incident Analysis & Trends',
      type: 'Security',
      lastGenerated: '2026-04-28',
      format: 'PDF',
    },
    {
      id: 3,
      name: 'Financial Summary',
      type: 'Finance',
      lastGenerated: '2026-04-25',
      format: 'Excel',
    },
    {
      id: 4,
      name: 'Guard Performance Evaluation',
      type: 'HR',
      lastGenerated: '2026-04-20',
      format: 'PDF',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <FileBarChart size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Reporting Engine</h1>
              <p className="text-secondary mt-1">Generate and manage business reports</p>
            </div>
          </div>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-secondary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-secondary rounded-lg border border-default p-4 flex items-center gap-4">
        <Filter size={20} className="text-secondary flex-shrink-0" />
        <select className="flex-1 px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
          <option>All Report Types</option>
          <option>Operations</option>
          <option>Security</option>
          <option>Finance</option>
          <option>HR</option>
        </select>
        <select className="flex-1 px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
          <option>All Formats</option>
          <option>PDF</option>
          <option>Excel</option>
          <option>CSV</option>
        </select>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-secondary rounded-lg border border-default p-6 hover:border-accent transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">{report.name}</h3>
                <p className="text-secondary text-sm mt-1">{report.type}</p>
              </div>
              <span className="px-3 py-1 bg-accent bg-opacity-20 text-accent text-xs font-semibold rounded-full">
                {report.format}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-default">
              <div className="flex items-center gap-2 text-secondary text-sm">
                <Calendar size={16} />
                <span>Generated: {report.lastGenerated}</span>
              </div>
              <button className="p-2 hover:bg-card rounded-lg transition-colors">
                <Download size={18} className="text-accent" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Templates */}
      <div className="bg-secondary rounded-lg border border-default p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Available Templates</h2>
        <div className="space-y-3">
          {[
            'Executive Summary',
            'Detailed Incident Report',
            'Monthly KPI Dashboard',
            'Guard Performance Scorecard',
            'Financial Statement',
          ].map((template, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-3 bg-primary rounded-lg hover:border-accent border border-transparent transition-colors"
            >
              <span className="text-primary font-medium">{template}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
