import { Users, Plus, Filter, TrendingUp, Award } from 'lucide-react'

export function HRWorkforce() {
  const workforce = [
    {
      id: 'EMP-001',
      name: 'John Mitchell',
      role: 'Guard',
      status: 'active',
      hireDate: '2024-08-15',
      certifications: ['PSA', 'WHMIS'],
    },
    {
      id: 'EMP-002',
      name: 'Sarah Chen',
      role: 'Supervisor',
      status: 'active',
      hireDate: '2024-03-01',
      certifications: ['PSA', 'First Aid', 'Management'],
    },
    {
      id: 'EMP-003',
      name: 'Mike Rodriguez',
      role: 'Guard',
      status: 'on_leave',
      hireDate: '2024-12-10',
      certifications: ['PSA'],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <Users size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">HR & Workforce</h1>
              <p className="text-secondary mt-1">Employee management and performance tracking</p>
            </div>
          </div>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-secondary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Add Employee
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Total Staff</p>
          <p className="text-3xl font-bold text-primary">42</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Active</p>
          <p className="text-3xl font-bold text-green-400">38</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">On Leave</p>
          <p className="text-3xl font-bold text-yellow-400">3</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Certifications Due</p>
          <p className="text-3xl font-bold text-red-400">7</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-secondary rounded-lg border border-default p-4">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-secondary" />
          <select className="flex-1 px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Statuses</option>
            <option>Active</option>
            <option>On Leave</option>
            <option>Terminated</option>
          </select>
          <select className="flex-1 px-3 py-2 bg-primary border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Roles</option>
            <option>Guard</option>
            <option>Supervisor</option>
            <option>Manager</option>
          </select>
        </div>
      </div>

      {/* Workforce Table */}
      <div className="bg-secondary rounded-lg border border-default overflow-hidden">
        <table className="w-full">
          <thead className="bg-card border-b border-default">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Employee</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Role</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Hire Date</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Certifications</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {workforce.map((emp) => (
              <tr key={emp.id} className="hover:bg-card transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-primary font-medium">{emp.name}</p>
                    <p className="text-secondary text-xs">{emp.id}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-primary">{emp.role}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      emp.status === 'active'
                        ? 'bg-green-900 bg-opacity-20 text-green-400'
                        : 'bg-yellow-900 bg-opacity-20 text-yellow-400'
                    }`}
                  >
                    {emp.status.charAt(0).toUpperCase() + emp.status.slice(1).replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-secondary text-sm">{emp.hireDate}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Award size={16} className="text-accent" />
                    <span className="text-sm text-primary">{emp.certifications.length}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
