import React, { useState } from 'react'
import { Send, Search, Plus, MessageSquare, Volume2, Users, Bell, X } from 'lucide-react'

const DEMO_CONVERSATIONS = [
  { id: 1, name: 'Jemal Hassan', role: 'Guard', lastMessage: 'Checkpoint 3 complete, moving to 4', time: '5m', unread: 0 },
  { id: 2, name: 'John Smith (Northview)', role: 'Client Manager', lastMessage: 'Can we discuss staffing for Friday shift?', time: '12m', unread: 1 },
  { id: 3, name: 'Solomon Abdi', role: 'Guard', lastMessage: 'All systems clear, building secure', time: '1h', unread: 0 },
  { id: 4, name: 'Support & Dispatch', role: 'Internal Team', lastMessage: 'Training scheduled for tomorrow at 9am', time: '2h', unread: 0 },
  { id: 5, name: 'Jean Marie', role: 'Guard', lastMessage: 'Incident report filed - false alarm', time: '3h', unread: 0 },
]

const DEMO_CHANNELS = [
  { id: 'all', name: 'All Staff', members: 8 },
  { id: 'night', name: 'Night Shift', members: 4 },
  { id: 'day', name: 'Day Shift', members: 3 },
  { id: 'mgmt', name: 'Management', members: 2 },
  { id: 'nv', name: 'Northview Team', members: 5 },
]

const DEMO_ANNOUNCEMENTS = [
  { id: 1, title: 'Updated Security Protocol - Use of Force', posted: '2h ago', priority: 'high', author: 'Preston Williams', channel: 'All Staff' },
  { id: 2, title: 'System Maintenance Window Tonight 1-2 AM', posted: '4h ago', priority: 'medium', author: 'Support', channel: 'All Staff' },
  { id: 3, title: 'Payroll Direct Deposit Confirmation', posted: '1d ago', priority: 'low', author: 'HR', channel: 'All Staff' },
  { id: 4, title: 'Northview Maintenance Schedule Changes', posted: '18h ago', priority: 'medium', author: 'John Smith', channel: 'Northview Team' },
]

export function Communications() {
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Communications</h1>
          <p className="text-secondary mt-2">Internal messaging, broadcasts, and shift handoffs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewMessage(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
          >
            <Plus size={18} />
            New Message
          </button>
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors"
          >
            <Volume2 size={18} />
            Broadcast
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Conversations */}
          <div className="bg-card rounded-lg border border-default overflow-hidden">
            <div className="p-4 border-b border-default">
              <h3 className="text-primary font-semibold text-sm mb-3">Direct Messages</h3>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-secondary" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="divide-y divide-default max-h-96 overflow-y-auto">
              {DEMO_CONVERSATIONS.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveChat(conv.id.toString())}
                  className={`w-full p-3 text-left hover:bg-secondary transition-colors ${
                    activeChat === conv.id.toString() ? 'bg-secondary border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-primary font-medium text-sm truncate">{conv.name}</p>
                        {conv.unread > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-secondary text-xs mt-0.5">{conv.role}</p>
                      <p className="text-secondary text-xs mt-1 truncate line-clamp-1">{conv.lastMessage}</p>
                    </div>
                    <p className="text-secondary text-xs flex-shrink-0">{conv.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="bg-card rounded-lg border border-default p-4">
            <h3 className="text-primary font-semibold text-sm mb-3">Channels</h3>
            <div className="space-y-2">
              {DEMO_CHANNELS.map(channel => (
                <button
                  key={channel.id}
                  className="w-full text-left p-2 hover:bg-secondary rounded text-sm transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-primary"># {channel.name}</p>
                    <p className="text-secondary text-xs">{channel.members}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => setShowHandoff(true)}
            className="w-full p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-400 text-sm font-medium transition-colors"
          >
            Shift Handoff Notes
          </button>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {activeChat ? (
            <div className="bg-card rounded-lg border border-default flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
                <div>
                  <p className="text-primary font-semibold">{DEMO_CONVERSATIONS.find((c) => c.id.toString() === activeChat)?.name}</p>
                  <p className="text-secondary text-sm">Active now</p>
                </div>
                <button onClick={() => setActiveChat(null)} className="text-secondary hover:text-primary">
                  <X size={20} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="bg-secondary p-3 rounded-lg max-w-xs">
                      <p className="text-secondary text-sm">Checkpoint 3 inspection complete. Moving to next sector.</p>
                    </div>
                    <p className="text-secondary text-xs mt-1">2:15 PM</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <div className="flex-1">
                    <div className="bg-blue-500/30 p-3 rounded-lg max-w-xs">
                      <p className="text-blue-200 text-sm">Thanks for the update. Any issues to report?</p>
                    </div>
                    <p className="text-secondary text-xs mt-1">2:16 PM</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="bg-secondary p-3 rounded-lg max-w-xs">
                      <p className="text-secondary text-sm">All clear. Weather conditions worsening though - visibility reduced.</p>
                    </div>
                    <p className="text-secondary text-xs mt-1">2:18 PM</p>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-default sticky bottom-0 bg-card">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-accent"
                  />
                  <button className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-default flex items-center justify-center h-96">
              <div className="text-center">
                <MessageSquare size={48} className="text-blue-400 mx-auto mb-2 opacity-50" />
                <p className="text-secondary">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-card rounded-lg p-6 border border-default">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Bell size={20} className="text-blue-400" />
          Broadcast Announcements
        </h2>
        <div className="space-y-3">
          {DEMO_ANNOUNCEMENTS.map((ann) => (
            <div key={ann.id} className="flex items-start gap-3 p-4 border border-default rounded hover:bg-secondary/20 transition-colors">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                ann.priority === 'high' ? 'bg-red-500' : ann.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-primary font-medium">{ann.title}</p>
                    <p className="text-secondary text-xs mt-1">{ann.author} • {ann.channel}</p>
                  </div>
                  <p className="text-secondary text-xs flex-shrink-0">{ann.posted}</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-xs font-medium flex-shrink-0">View</button>
            </div>
          ))}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">To</label>
                <input type="text" placeholder="Search guard or contact..." className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Message</label>
                <textarea placeholder="Type your message..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm"></textarea>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm">Send</button>
                <button onClick={() => setShowNewMessage(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Broadcast Announcement</h3>
              <button onClick={() => setShowBroadcast(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Send to Channel</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                  {DEMO_CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id}># {ch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Title</label>
                <input type="text" placeholder="Announcement title..." className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Message</label>
                <textarea placeholder="Type your announcement..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm"></textarea>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Priority</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium text-sm">Send</button>
                <button onClick={() => setShowBroadcast(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Handoff Modal */}
      {showHandoff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
              <h3 className="text-lg font-semibold text-primary">Shift Handoff Notes</h3>
              <button onClick={() => setShowHandoff(false)} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">From Guard</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                  <option>Solomon Abdi</option>
                  <option>Jemal Hassan</option>
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">To Guard</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                  <option>Jean Marie</option>
                  <option>Kanwal Singh</option>
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Handoff Notes</label>
                <textarea placeholder="Key points for incoming guard..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm"></textarea>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium text-sm">Complete Handoff</button>
                <button onClick={() => setShowHandoff(false)} className="flex-1 px-3 py-2 border border-default text-primary rounded font-medium hover:bg-secondary text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
