import { Package, Plus, Camera, Radio, Watch, CheckCircle } from 'lucide-react'

export function EquipmentAssets() {
  const assets = [
    {
      id: 'EQUIP-001',
      name: 'HD Body Camera',
      type: 'Camera',
      status: 'active',
      location: 'Guard Unit - Downtown',
      lastMaintenance: '2026-04-15',
    },
    {
      id: 'EQUIP-002',
      name: 'Wireless Radio Unit',
      type: 'Communication',
      status: 'active',
      location: 'Guard Unit - Downtown',
      lastMaintenance: '2026-04-20',
    },
    {
      id: 'EQUIP-003',
      name: 'GPS Watch Tracker',
      type: 'Tracking',
      status: 'maintenance',
      location: 'Service Center',
      lastMaintenance: '2026-04-25',
    },
  ]

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'Camera':
        return <Camera size={20} />
      case 'Communication':
        return <Radio size={20} />
      case 'Tracking':
        return <Watch size={20} />
      default:
        return <Package size={20} />
    }
  }

  const getStatusBadge = (status: string) => {
    const badgeClasses =
      status === 'active'
        ? 'bg-green-900 bg-opacity-20 text-green-400'
        : 'bg-yellow-900 bg-opacity-20 text-yellow-400'
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeClasses}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <Package size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Equipment & Assets</h1>
              <p className="text-secondary mt-1">Track and manage security equipment inventory</p>
            </div>
          </div>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-secondary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Add Asset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Total Assets</p>
          <p className="text-3xl font-bold text-primary">24</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">In Service</p>
          <p className="text-3xl font-bold text-green-400">21</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Maintenance</p>
          <p className="text-3xl font-bold text-yellow-400">3</p>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-secondary rounded-lg border border-default overflow-hidden">
        <table className="w-full">
          <thead className="bg-card border-b border-default">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Asset ID</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Name</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Type</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Location</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-primary">Last Maintenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-card transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-accent">{asset.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent bg-opacity-10 rounded">
                      {getAssetIcon(asset.type)}
                    </div>
                    <span className="text-primary font-medium">{asset.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-primary text-sm">{asset.type}</td>
                <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                <td className="px-6 py-4 text-secondary text-sm">{asset.location}</td>
                <td className="px-6 py-4 text-secondary text-sm">{asset.lastMaintenance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
