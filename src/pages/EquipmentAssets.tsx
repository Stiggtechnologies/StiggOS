import { useState } from 'react'
import { Package, Radio, Car, Shirt, Key, Camera, Flashlight, Phone, Plus, Search, AlertTriangle, CheckCircle, Wrench, ArrowRightLeft } from 'lucide-react'

type EquipTab = 'inventory' | 'assignments' | 'maintenance'

const equipment = [
  { id: '1', name: 'Motorola CP200d', category: 'radio', serial: 'MOT-2024-001', tag: 'RAD-001', condition: 'good', status: 'assigned', assignee: 'Marcus Thompson', site: 'Northview REIT #5', nextMaintenance: '' },
  { id: '2', name: 'Motorola CP200d', category: 'radio', serial: 'MOT-2024-002', tag: 'RAD-002', condition: 'good', status: 'assigned', assignee: 'Jemal Abera', site: 'Mainstreet Equity #2', nextMaintenance: '' },
  { id: '3', name: 'Motorola CP200d', category: 'radio', serial: 'MOT-2024-003', tag: 'RAD-003', condition: 'fair', status: 'available', assignee: '', site: 'HQ', nextMaintenance: '' },
  { id: '4', name: '2023 Ford Explorer', category: 'vehicle', serial: 'VIN-1FMHK8D8', tag: 'VEH-001', condition: 'good', status: 'assigned', assignee: 'Patrol Unit 1', site: 'Mobile', nextMaintenance: '2026-05-15' },
  { id: '5', name: '2024 Dodge Durango', category: 'vehicle', serial: 'VIN-3C4PDCAB', tag: 'VEH-002', condition: 'good', status: 'assigned', assignee: 'Patrol Unit 2', site: 'Mobile', nextMaintenance: '2026-06-01' },
  { id: '6', name: 'Security Uniform Set', category: 'uniform', serial: '', tag: 'UNI-MT', condition: 'good', status: 'assigned', assignee: 'Marcus Thompson', site: '', nextMaintenance: '' },
  { id: '7', name: 'Security Uniform Set', category: 'uniform', serial: '', tag: 'UNI-JA', condition: 'good', status: 'assigned', assignee: 'Jemal Abera', site: '', nextMaintenance: '' },
  { id: '8', name: 'Site Master Key Set', category: 'key_set', serial: '', tag: 'KEY-NV5', condition: 'good', status: 'assigned', assignee: 'Shift Lead', site: 'Northview REIT #5', nextMaintenance: '' },
  { id: '9', name: 'Site Master Key Set', category: 'key_set', serial: '', tag: 'KEY-AL8', condition: 'good', status: 'assigned', assignee: 'Shift Lead', site: 'Avenue Living #8', nextMaintenance: '' },
  { id: '10', name: 'HID ProxCard', category: 'access_card', serial: '', tag: 'ACC-001', condition: 'good', status: 'assigned', assignee: 'Marcus Thompson', site: 'Northview REIT #5', nextMaintenance: '' },
  { id: '11', name: 'Axon Body 3', category: 'body_camera', serial: 'AXN-2025-001', tag: 'CAM-001', condition: 'good', status: 'assigned', assignee: 'Marcus Thompson', site: '', nextMaintenance: '' },
  { id: '12', name: 'Axon Body 3', category: 'body_camera', serial: 'AXN-2025-002', tag: 'CAM-002', condition: 'good', status: 'assigned', assignee: 'Sarah Chen', site: '', nextMaintenance: '' },
  { id: '13', name: 'Streamlight Stinger', category: 'flashlight', serial: 'STR-2024-001', tag: 'FLT-001', condition: 'poor', status: 'maintenance', assignee: '', site: 'HQ', nextMaintenance: '2026-04-30' },
  { id: '14', name: 'iPhone 14 (Work)', category: 'phone', serial: 'APL-2024-001', tag: 'PHN-001', condition: 'good', status: 'assigned', assignee: 'Sarah Chen', site: '', nextMaintenance: '' },
  { id: '15', name: 'First Aid Kit — Class A', category: 'first_aid_kit', serial: '', tag: 'FAK-NV5', condition: 'good', status: 'assigned', assignee: 'Guard Station', site: 'Northview REIT #5', nextMaintenance: '2026-08-01' },
]

const maintenanceLog = [
  { equipment: '2023 Ford Explorer (VEH-001)', type: 'routine', description: 'Oil change + tire rotation', date: '2026-04-20', cost: 289.50, nextDue: '2026-07-20' },
  { equipment: 'Motorola CP200d (RAD-003)', type: 'repair', description: 'Antenna replacement — weak signal', date: '2026-04-18', cost: 45.00, nextDue: '' },
  { equipment: 'Streamlight Stinger (FLT-001)', type: 'repair', description: 'Battery replacement — won\'t hold charge', date: '2026-04-28', cost: 35.00, nextDue: '' },
  { equipment: '2024 Dodge Durango (VEH-002)', type: 'inspection', description: 'Quarterly vehicle safety inspection', date: '2026-04-01', cost: 85.00, nextDue: '2026-07-01' },
  { equipment: 'First Aid Kit (FAK-NV5)', type: 'routine', description: 'Restocked supplies — bandages, gauze, antiseptic', date: '2026-04-10', cost: 42.00, nextDue: '2026-08-01' },
]

const categoryIcon = (category: string) => {
  switch (category) {
    case 'radio': return <Radio className="w-4 h-4" />
    case 'vehicle': return <Car className="w-4 h-4" />
    case 'uniform': return <Shirt className="w-4 h-4" />
    case 'key_set': return <Key className="w-4 h-4" />
    case 'body_camera': return <Camera className="w-4 h-4" />
    case 'flashlight': return <Flashlight className="w-4 h-4" />
    case 'phone': return <Phone className="w-4 h-4" />
    default: return <Package className="w-4 h-4" />
  }
}

export default function EquipmentAssets() {
  const [activeTab, setActiveTab] = useState<EquipTab>('inventory')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const filtered = equipment.filter(e => {
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.assignee.toLowerCase().includes(searchQuery.toLowerCase()) && !e.tag.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterCategory !== 'all' && e.category !== filterCategory) return false
    return true
  })

  const categories = [...new Set(equipment.map(e => e.category))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipment & Assets</h1>
          <p className="text-slate-400 mt-1">Track radios, vehicles, uniforms, keys, and all company equipment</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Assets</p>
          <p className="text-2xl font-bold text-white mt-1">{equipment.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Assigned</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{equipment.filter(e => e.status === 'assigned').length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Available</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{equipment.filter(e => e.status === 'available').length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">In Maintenance</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{equipment.filter(e => e.status === 'maintenance').length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Poor Condition</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{equipment.filter(e => e.condition === 'poor' || e.condition === 'damaged').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'inventory' as EquipTab, label: 'Inventory', icon: Package },
          { id: 'assignments' as EquipTab, label: 'Assignments', icon: ArrowRightLeft },
          { id: 'maintenance' as EquipTab, label: 'Maintenance', icon: Wrench },
        ].map(tab => (
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

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search equipment, tags, assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs text-slate-400 font-medium p-4">Equipment</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Tag</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Condition</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Assigned To</th>
                <th className="text-left text-xs text-slate-400 font-medium p-4">Site</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300">
                        {categoryIcon(e.category)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{e.name}</p>
                        <p className="text-slate-500 text-xs">{e.category.replace(/_/g, ' ')}{e.serial ? ` · ${e.serial}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><code className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{e.tag}</code></td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      e.condition === 'good' || e.condition === 'new' ? 'bg-green-400/10 text-green-400' :
                      e.condition === 'fair' ? 'bg-yellow-400/10 text-yellow-400' :
                      'bg-red-400/10 text-red-400'
                    }`}>{e.condition}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      e.status === 'assigned' ? 'bg-blue-400/10 text-blue-400' :
                      e.status === 'available' ? 'bg-green-400/10 text-green-400' :
                      'bg-yellow-400/10 text-yellow-400'
                    }`}>{e.status}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{e.assignee || '—'}</td>
                  <td className="p-4 text-sm text-slate-300">{e.site || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-3">
          {[...new Set(equipment.filter(e => e.assignee && e.status === 'assigned').map(e => e.assignee))].map(person => (
            <div key={person} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h4 className="text-white font-medium text-sm mb-3">{person}</h4>
              <div className="flex flex-wrap gap-2">
                {equipment.filter(e => e.assignee === person).map(e => (
                  <div key={e.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                    <span className="text-slate-400">{categoryIcon(e.category)}</span>
                    <span className="text-sm text-white">{e.name}</span>
                    <code className="text-xs text-blue-400 font-mono">{e.tag}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          {/* Upcoming */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" /> Maintenance Due
            </h4>
            <div className="space-y-2">
              {equipment.filter(e => e.nextMaintenance).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {categoryIcon(e.category)}
                    <div>
                      <p className="text-white text-sm">{e.name} ({e.tag})</p>
                      <p className="text-slate-500 text-xs">{e.site}</p>
                    </div>
                  </div>
                  <span className="text-xs text-yellow-400">Due: {e.nextMaintenance}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h4 className="text-white font-medium text-sm">Maintenance History</h4>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs text-slate-400 font-medium p-4">Equipment</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-4">Type</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-4">Description</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-4">Date</th>
                  <th className="text-right text-xs text-slate-400 font-medium p-4">Cost</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceLog.map((m, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 text-sm text-white">{m.equipment}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        m.type === 'routine' ? 'bg-blue-400/10 text-blue-400' :
                        m.type === 'repair' ? 'bg-orange-400/10 text-orange-400' :
                        'bg-green-400/10 text-green-400'
                      }`}>{m.type}</span>
                    </td>
                    <td className="p-4 text-sm text-slate-300">{m.description}</td>
                    <td className="p-4 text-sm text-slate-400">{m.date}</td>
                    <td className="p-4 text-sm text-white font-medium text-right">${m.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
