import React, { useState } from 'react'
import { Map, Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'

const DEMO_ROUTES = [
  {
    id: 1,
    name: 'Northview REIT #5 - Main Patrol (Cluster Flow A)',
    site: 'Northview REIT #5',
    cluster: 'Cluster Flow A',
    checkpoints: 8,
    duration: 45,
    frequency: 'Every 2 hours',
    status: 'Active' as const,
    checkpointList: [
      { order: 1, location: 'Main Entrance', expected: 3, lat: 51.0447, lng: -114.0719 },
      { order: 2, location: 'Parking Lot A', expected: 5, lat: 51.0448, lng: -114.0720 },
      { order: 3, location: 'Loading Dock', expected: 4, lat: 51.0449, lng: -114.0721 },
      { order: 4, location: 'Stairwell B', expected: 3, lat: 51.0450, lng: -114.0722 },
      { order: 5, location: 'Rooftop Perimeter', expected: 8, lat: 51.0451, lng: -114.0723 },
      { order: 6, location: 'Basement Level 1', expected: 6, lat: 51.0452, lng: -114.0724 },
      { order: 7, location: 'Mechanical Room', expected: 4, lat: 51.0453, lng: -114.0725 },
      { order: 8, location: 'Security Office', expected: 2, lat: 51.0454, lng: -114.0726 },
    ],
  },
  {
    id: 2,
    name: 'Northview REIT #7 - Perimeter Patrol (Cluster Flow A)',
    site: 'Northview REIT #7',
    cluster: 'Cluster Flow A',
    checkpoints: 6,
    duration: 32,
    frequency: 'Every 3 hours',
    status: 'Active' as const,
    checkpointList: [
      { order: 1, location: 'North Gate', expected: 4, lat: 51.0460, lng: -114.0730 },
      { order: 2, location: 'East Perimeter', expected: 6, lat: 51.0461, lng: -114.0731 },
      { order: 3, location: 'South Fence Line', expected: 5, lat: 51.0462, lng: -114.0732 },
      { order: 4, location: 'West Entrance', expected: 4, lat: 51.0463, lng: -114.0733 },
      { order: 5, location: 'Parking Validations', expected: 6, lat: 51.0464, lng: -114.0734 },
      { order: 6, location: 'Back to Base', expected: 2, lat: 51.0465, lng: -114.0735 },
    ],
  },
  {
    id: 3,
    name: 'Mainstreet Equity #3 - Interior Walkthrough (Cluster Flow B)',
    site: 'Mainstreet Equity #3',
    cluster: 'Cluster Flow B',
    checkpoints: 7,
    duration: 38,
    frequency: 'Every 3 hours',
    status: 'Active' as const,
    checkpointList: [
      { order: 1, location: 'Lobby', expected: 2, lat: 51.0500, lng: -114.0750 },
      { order: 2, location: 'Elevator Area', expected: 3, lat: 51.0501, lng: -114.0751 },
      { order: 3, location: 'Floor 2 Hallway', expected: 5, lat: 51.0502, lng: -114.0752 },
      { order: 4, location: 'Floor 3 Common Area', expected: 6, lat: 51.0503, lng: -114.0753 },
      { order: 5, location: 'Emergency Exits', expected: 4, lat: 51.0504, lng: -114.0754 },
      { order: 6, location: 'Stairwell Check', expected: 4, lat: 51.0505, lng: -114.0755 },
      { order: 7, location: 'Return to Security', expected: 2, lat: 51.0506, lng: -114.0756 },
    ],
  },
  {
    id: 4,
    name: 'Canadian Tire #2 - Rapid Perimeter (Cluster Flow B)',
    site: 'Canadian Tire #2',
    cluster: 'Cluster Flow B',
    checkpoints: 5,
    duration: 22,
    frequency: 'Hourly',
    status: 'Active' as const,
    checkpointList: [
      { order: 1, location: 'Front Entrance', expected: 2, lat: 51.0550, lng: -114.0800 },
      { order: 2, location: 'Parking Lot', expected: 5, lat: 51.0551, lng: -114.0801 },
      { order: 3, location: 'Shipping Area', expected: 4, lat: 51.0552, lng: -114.0802 },
      { order: 4, location: 'Back Fence', expected: 6, lat: 51.0553, lng: -114.0803 },
      { order: 5, location: 'Return', expected: 1, lat: 51.0554, lng: -114.0804 },
    ],
  },
]

export function RoutePlanning() {
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null)
  const [showNewRoute, setShowNewRoute] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Route Planning</h1>
          <p className="text-secondary mt-2">Design and manage patrol routes with checkpoint sequencing</p>
        </div>
        <button
          onClick={() => setShowNewRoute(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
        >
          <Plus size={18} />
          New Route
        </button>
      </div>

      {/* Cluster Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-6 border border-default">
          <h3 className="text-lg font-semibold text-primary mb-3">Cluster Flow A</h3>
          <p className="text-secondary text-sm mb-4">Northview REIT properties: #5, #7, #12, #15</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Routes Active:</span>
              <span className="text-primary font-medium">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Avg Duration:</span>
              <span className="text-primary font-medium">39 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Coverage:</span>
              <span className="text-green-400 font-medium">Full</span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 border border-default">
          <h3 className="text-lg font-semibold text-primary mb-3">Cluster Flow B</h3>
          <p className="text-secondary text-sm mb-4">Mainstreet & Canadian Tire: #3, #2</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Routes Active:</span>
              <span className="text-primary font-medium">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Avg Duration:</span>
              <span className="text-primary font-medium">30 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Coverage:</span>
              <span className="text-green-400 font-medium">Full</span>
            </div>
          </div>
        </div>
      </div>

      {/* Routes List */}
      <div className="space-y-4">
        {DEMO_ROUTES.map((route) => (
          <div key={route.id} className="bg-card rounded-lg border border-default">
            <div
              className="p-6 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary">{route.name}</h3>
                  <p className="text-secondary text-sm mt-1">{route.site} • {route.cluster}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                    Active
                  </span>
                  {selectedRoute === route.id ? (
                    <ChevronUp size={20} className="text-secondary" />
                  ) : (
                    <ChevronDown size={20} className="text-secondary" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-secondary">Checkpoints</p>
                  <p className="text-primary font-medium">{route.checkpoints}</p>
                </div>
                <div>
                  <p className="text-secondary">Duration</p>
                  <p className="text-primary font-medium">{route.duration} min</p>
                </div>
                <div>
                  <p className="text-secondary">Frequency</p>
                  <p className="text-primary font-medium">{route.frequency}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="p-2 hover:bg-secondary rounded transition-colors" title="Edit">
                    <Edit2 size={16} className="text-blue-400" />
                  </button>
                  <button className="p-2 hover:bg-secondary rounded transition-colors" title="Delete">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Checkpoint List */}
            {selectedRoute === route.id && (
              <div className="border-t border-default p-6 bg-secondary/10">
                <h4 className="text-sm font-semibold text-primary mb-3">Checkpoint Sequence</h4>
                <div className="space-y-2">
                  {route.checkpointList.map((cp) => (
                    <div key={cp.order} className="flex items-center gap-3 p-3 bg-secondary/20 rounded border border-default/50">
                      <button className="p-1 hover:bg-secondary rounded cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} className="text-secondary" />
                      </button>
                      <div className="flex-1">
                        <p className="text-primary font-medium">{cp.order}. {cp.location}</p>
                        <p className="text-secondary text-xs">GPS: {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary text-sm font-medium">{cp.expected} min</p>
                        <p className="text-secondary text-xs">expected time</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-500/30">
                  <p className="text-blue-400 text-sm">
                    Total estimated duration: {route.checkpointList.reduce((sum, cp) => sum + cp.expected, 0)} minutes
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Route Templates */}
      <div className="bg-card p-6 rounded-lg border border-default">
        <h2 className="text-lg font-semibold text-primary mb-4">Route Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="p-4 border border-default rounded hover:bg-secondary hover:border-accent transition-colors text-left">
            <p className="text-primary font-medium">Standard 8-Checkpoint</p>
            <p className="text-secondary text-sm mt-1">45 min duration, every 2 hrs</p>
            <p className="text-secondary text-xs mt-2">Best for: Large properties</p>
          </button>
          <button className="p-4 border border-default rounded hover:bg-secondary hover:border-accent transition-colors text-left">
            <p className="text-primary font-medium">Rapid Perimeter Check</p>
            <p className="text-secondary text-sm mt-1">20 min duration, hourly</p>
            <p className="text-secondary text-xs mt-2">Best for: Retail/Commercial</p>
          </button>
          <button className="p-4 border border-default rounded hover:bg-secondary hover:border-accent transition-colors text-left">
            <p className="text-primary font-medium">Night Patrol Route</p>
            <p className="text-secondary text-sm mt-1">60 min duration, every 3 hrs</p>
            <p className="text-secondary text-xs mt-2">Best for: Residential REITs</p>
          </button>
        </div>
      </div>

      {/* Route Settings */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h3 className="text-lg font-semibold text-primary mb-4">Route Optimization</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded">
            <div>
              <p className="text-primary font-medium">Route Randomization</p>
              <p className="text-secondary text-sm">Add variance to checkpoint order to prevent predictability</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 cursor-pointer" />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded">
            <div>
              <p className="text-primary font-medium">GPS Tracking</p>
              <p className="text-secondary text-sm">Enable real-time location tracking for all patrols</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 cursor-pointer" />
          </div>
          <div>
            <label className="block text-primary text-sm font-medium mb-2">Max Variance from Template (minutes)</label>
            <input type="range" min="0" max="15" defaultValue="5" className="w-full" />
            <p className="text-secondary text-xs mt-1">Current: ±5 minutes</p>
          </div>
        </div>
      </div>

      {/* New Route Modal */}
      {showNewRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Create New Route</h3>
              <button onClick={() => setShowNewRoute(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Route Name</label>
                <input type="text" placeholder="e.g., Northview #20 - Full Patrol" className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Property</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary">
                  <option>Northview REIT #5</option>
                  <option>Northview REIT #7</option>
                  <option>Mainstreet Equity #3</option>
                  <option>Canadian Tire #2</option>
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Cluster</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary">
                  <option>Cluster Flow A</option>
                  <option>Cluster Flow B</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium">Create Route</button>
                <button onClick={() => setShowNewRoute(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
