import { Bell, AlertCircle, CheckCircle, Trash2, Settings } from 'lucide-react'

export function NotificationsAlerts() {
  const notifications = [
    {
      id: 1,
      type: 'critical',
      title: 'Critical Incident at Downtown Site',
      message: 'Unauthorized entry detected at 14:32',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'warning',
      title: 'Guard Certification Expiring',
      message: 'John Smith PSA certification expires in 7 days',
      timestamp: '5 hours ago',
      read: false,
    },
    {
      id: 3,
      type: 'info',
      title: 'Schedule Updated',
      message: 'May 2026 patrol schedule has been finalized',
      timestamp: '1 day ago',
      read: true,
    },
  ]

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle size={20} className="text-red-500" />
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-500" />
      case 'info':
        return <CheckCircle size={20} className="text-green-500" />
      default:
        return <Bell size={20} className="text-accent" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent bg-opacity-10 rounded-lg">
              <Bell size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Notifications & Alerts</h1>
              <p className="text-secondary mt-1">System notifications and critical alerts</p>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <Settings size={20} className="text-secondary" />
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Unread</p>
          <p className="text-3xl font-bold text-primary">2</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">Critical</p>
          <p className="text-3xl font-bold text-red-500">1</p>
        </div>
        <div className="bg-secondary rounded-lg border border-default p-4">
          <p className="text-secondary text-sm mb-2">This Week</p>
          <p className="text-3xl font-bold text-accent">8</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 transition-colors ${
              notification.read
                ? 'bg-secondary border-default hover:border-accent'
                : 'bg-card border-accent'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-primary font-semibold">{notification.title}</h3>
                <p className="text-secondary text-sm mt-1">{notification.message}</p>
                <p className="text-secondary text-xs mt-2">{notification.timestamp}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.read && (
                  <div className="w-2 h-2 bg-accent rounded-full" />
                )}
                <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <Trash2 size={18} className="text-secondary" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-secondary rounded-lg font-semibold transition-colors">
          Mark All as Read
        </button>
        <button className="px-4 py-2 bg-secondary border border-default hover:border-accent text-primary rounded-lg font-semibold transition-colors">
          Clear All
        </button>
      </div>
    </div>
  )
}
