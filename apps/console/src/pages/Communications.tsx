import React, { useState, useEffect } from 'react'
import { Send, Search, Plus, MessageSquare, Volume2, Users, Bell, X, Phone, CheckCircle, AlertCircle, Clock, Loader2, RefreshCw, ChevronDown, Smartphone } from 'lucide-react'
import { smsService, type Recipient, type SMSLog, type BroadcastStatus, type Company, type Category } from '../lib/smsService'

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

type Tab = 'messaging' | 'sms' | 'logs'

export function Communications() {
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('messaging')

  // SMS State
  const [smsMode, setSmsMode] = useState<'single' | 'bulk'>('bulk')
  const [smsPhone, setSmsPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsCompany, setSmsCompany] = useState<Company>('aim')
  const [smsCategory, setSmsCategory] = useState<Category>('marketing')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null)
  const [bulkRecipients, setBulkRecipients] = useState('')
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logCompanyFilter, setLogCompanyFilter] = useState<Company | ''>('')

  // Quick Send Single SMS
  const handleSendSingle = async () => {
    if (!smsPhone.trim() || !smsMessage.trim()) return
    setSmsSending(true)
    setSmsResult(null)
    try {
      const result = await smsService.sendSingle(smsPhone.trim(), smsMessage, smsCompany, smsCategory)
      setSmsResult({
        success: result.success,
        message: result.success ? `Sent to ${smsService.formatPhoneDisplay(smsPhone)}` : `Failed: ${result.error}`
      })
      if (result.success) {
        setSmsPhone('')
        setSmsMessage('')
      }
    } catch (err: any) {
      setSmsResult({ success: false, message: err.message || 'Send failed' })
    } finally {
      setSmsSending(false)
    }
  }

  // Bulk SMS Broadcast
  const handleSendBulk = async () => {
    if (!bulkRecipients.trim() || !smsMessage.trim()) return
    setSmsSending(true)
    setSmsResult(null)
    try {
      // Parse recipients: one per line, format "phone,name" or just "phone"
      const recipients: Recipient[] = bulkRecipients
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const parts = line.split(',').map(p => p.trim())
          return { phone: parts[0], name: parts[1] || undefined }
        })

      if (recipients.length === 0) {
        setSmsResult({ success: false, message: 'No valid recipients found' })
        return
      }

      const cost = smsService.estimateCost(recipients.length, smsMessage.length)

      const result = await smsService.sendBroadcast(recipients, smsMessage, smsCompany, smsCategory)
      setSmsResult({
        success: true,
        message: `Broadcast complete: ${result.sent} sent, ${result.failed} failed out of ${result.totalRecipients} recipients. Est. cost: $${cost.totalCost.toFixed(2)}`
      })
    } catch (err: any) {
      setSmsResult({ success: false, message: err.message || 'Broadcast failed' })
    } finally {
      setSmsSending(false)
    }
  }

  // Load SMS Logs
  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const logs = await smsService.getLogs(logCompanyFilter || undefined)
      setSmsLogs(logs)
    } catch (err) {
      console.error('Failed to load SMS logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'logs') loadLogs()
  }, [activeTab, logCompanyFilter])

  const costEstimate = smsMessage.length > 0 ? smsService.estimateCost(
    smsMode === 'single' ? 1 : Math.max(1, bulkRecipients.split('\n').filter(l => l.trim()).length),
    smsMessage.length
  ) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Communications</h1>
          <p className="text-secondary mt-2">Messaging, SMS broadcasts, and shift handoffs</p>
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
            onClick={() => { setActiveTab('sms'); setSmsMode('bulk') }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
          >
            <Smartphone size={18} />
            SMS Blast
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

      {/* Tab Bar */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
        {([
          { id: 'messaging' as Tab, label: 'Messaging', icon: MessageSquare },
          { id: 'sms' as Tab, label: 'SMS Center', icon: Smartphone },
          { id: 'logs' as Tab, label: 'SMS Logs', icon: Clock },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== MESSAGING TAB ===================== */}
      {activeTab === 'messaging' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card rounded-lg border border-default overflow-hidden">
                <div className="p-4 border-b border-default">
                  <h3 className="text-primary font-semibold text-sm mb-3">Direct Messages</h3>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-3 text-secondary" />
                    <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="divide-y divide-default max-h-96 overflow-y-auto">
                  {DEMO_CONVERSATIONS.map((conv) => (
                    <button key={conv.id} onClick={() => setActiveChat(conv.id.toString())}
                      className={`w-full p-3 text-left hover:bg-secondary transition-colors ${activeChat === conv.id.toString() ? 'bg-secondary border-l-4 border-blue-500' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-primary font-medium text-sm truncate">{conv.name}</p>
                            {conv.unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{conv.unread}</span>}
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

              <div className="bg-card rounded-lg border border-default p-4">
                <h3 className="text-primary font-semibold text-sm mb-3">Channels</h3>
                <div className="space-y-2">
                  {DEMO_CHANNELS.map(channel => (
                    <button key={channel.id} className="w-full text-left p-2 hover:bg-secondary rounded text-sm transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-primary"># {channel.name}</p>
                        <p className="text-secondary text-xs">{channel.members}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setShowHandoff(true)} className="w-full p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-400 text-sm font-medium transition-colors">
                Shift Handoff Notes
              </button>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {activeChat ? (
                <div className="bg-card rounded-lg border border-default flex flex-col h-[600px]">
                  <div className="p-4 border-b border-default flex items-center justify-between sticky top-0 bg-card">
                    <div>
                      <p className="text-primary font-semibold">{DEMO_CONVERSATIONS.find((c) => c.id.toString() === activeChat)?.name}</p>
                      <p className="text-secondary text-sm">Active now</p>
                    </div>
                    <button onClick={() => setActiveChat(null)} className="text-secondary hover:text-primary"><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
                      <div className="flex-1">
                        <div className="bg-secondary p-3 rounded-lg max-w-xs"><p className="text-secondary text-sm">Checkpoint 3 inspection complete. Moving to next sector.</p></div>
                        <p className="text-secondary text-xs mt-1">2:15 PM</p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="flex-1">
                        <div className="bg-blue-500/30 p-3 rounded-lg max-w-xs"><p className="text-blue-200 text-sm">Thanks for the update. Any issues to report?</p></div>
                        <p className="text-secondary text-xs mt-1">2:16 PM</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
                      <div className="flex-1">
                        <div className="bg-secondary p-3 rounded-lg max-w-xs"><p className="text-secondary text-sm">All clear. Weather conditions worsening though - visibility reduced.</p></div>
                        <p className="text-secondary text-xs mt-1">2:18 PM</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-default sticky bottom-0 bg-card">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-accent" />
                      <button className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"><Send size={18} /></button>
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
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${ann.priority === 'high' ? 'bg-red-500' : ann.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-primary font-medium">{ann.title}</p>
                        <p className="text-secondary text-xs mt-1">{ann.author} &bull; {ann.channel}</p>
                      </div>
                      <p className="text-secondary text-xs flex-shrink-0">{ann.posted}</p>
                    </div>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 text-xs font-medium flex-shrink-0">View</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===================== SMS CENTER TAB ===================== */}
      {activeTab === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SMS Compose */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-default">
              <div className="p-4 border-b border-default">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Smartphone size={20} className="text-green-400" />
                    {smsMode === 'single' ? 'Send Single SMS' : 'SMS Broadcast'}
                  </h2>
                  <div className="flex gap-1 bg-secondary rounded p-0.5">
                    <button onClick={() => setSmsMode('single')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${smsMode === 'single' ? 'bg-green-600 text-white' : 'text-secondary hover:text-primary'}`}>Single</button>
                    <button onClick={() => setSmsMode('bulk')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${smsMode === 'bulk' ? 'bg-green-600 text-white' : 'text-secondary hover:text-primary'}`}>Bulk Blast</button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Company + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-primary text-sm font-medium mb-1">Company</label>
                    <select value={smsCompany} onChange={e => setSmsCompany(e.target.value as Company)} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                      <option value="aim">AIM - Alberta Injury Management</option>
                      <option value="stigg">Stigg Security</option>
                      <option value="syncai">SyncAI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-primary text-sm font-medium mb-1">Category</label>
                    <select value={smsCategory} onChange={e => setSmsCategory(e.target.value as Category)} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                      <option value="marketing">Marketing</option>
                      <option value="alert">Alert</option>
                      <option value="reminder">Reminder</option>
                      <option value="notification">Notification</option>
                    </select>
                  </div>
                </div>

                {/* Recipients */}
                {smsMode === 'single' ? (
                  <div>
                    <label className="block text-primary text-sm font-medium mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-3 text-secondary" />
                      <input type="tel" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="+1 (780) 555-0123" className="w-full pl-10 pr-4 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-primary text-sm font-medium mb-1">
                      Recipients <span className="text-secondary font-normal">(one per line: phone,name)</span>
                    </label>
                    <textarea
                      value={bulkRecipients}
                      onChange={e => setBulkRecipients(e.target.value)}
                      placeholder={"7805550123,John Smith\n7805550124,Jane Doe\n7805550125"}
                      rows={6}
                      className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm font-mono focus:outline-none focus:border-green-500"
                    />
                    <p className="text-secondary text-xs mt-1">
                      {bulkRecipients.split('\n').filter(l => l.trim()).length} recipients loaded
                    </p>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-primary text-sm font-medium mb-1">Message</label>
                  <textarea
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    placeholder="Type your SMS message... Use ${name} for recipient name, ${clientFirstName} for first name."
                    rows={4}
                    className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm focus:outline-none focus:border-green-500"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-secondary text-xs">{smsMessage.length} chars {costEstimate && `| ${costEstimate.segments} segment${costEstimate.segments > 1 ? 's' : ''}`}</p>
                    {costEstimate && <p className="text-secondary text-xs">Est. cost: ${costEstimate.totalCost.toFixed(2)}</p>}
                  </div>
                </div>

                {/* Result Banner */}
                {smsResult && (
                  <div className={`flex items-center gap-2 p-3 rounded text-sm ${smsResult.success ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {smsResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {smsResult.message}
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={smsMode === 'single' ? handleSendSingle : handleSendBulk}
                  disabled={smsSending || !smsMessage.trim() || (smsMode === 'single' ? !smsPhone.trim() : !bulkRecipients.trim())}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold transition-colors"
                >
                  {smsSending ? (
                    <><Loader2 size={18} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={18} /> {smsMode === 'single' ? 'Send SMS' : `Send Broadcast (${bulkRecipients.split('\n').filter(l => l.trim()).length} recipients)`}</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SMS Quick Info */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-default p-4">
              <h3 className="text-primary font-semibold text-sm mb-3">SMS Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-secondary">Provider</span><span className="text-primary font-medium">Twilio</span></div>
                <div className="flex justify-between"><span className="text-secondary">Rate / segment</span><span className="text-primary font-medium">~$0.0079 CAD</span></div>
                <div className="flex justify-between"><span className="text-secondary">Chars / segment</span><span className="text-primary font-medium">160</span></div>
                <div className="flex justify-between"><span className="text-secondary">Batch size</span><span className="text-primary font-medium">10 / second</span></div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-default p-4">
              <h3 className="text-primary font-semibold text-sm mb-3">Template Variables</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 bg-secondary rounded"><span className="text-green-400">{'${name}'}</span> <span className="text-secondary ml-2">Full name</span></div>
                <div className="p-2 bg-secondary rounded"><span className="text-green-400">{'${clientFirstName}'}</span> <span className="text-secondary ml-2">First name</span></div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-default p-4">
              <h3 className="text-primary font-semibold text-sm mb-3">Bulk Import Format</h3>
              <div className="bg-secondary rounded p-3 text-xs font-mono text-secondary space-y-1">
                <p>7805551234,John Smith</p>
                <p>7805555678,Jane Doe</p>
                <p>7805559012</p>
              </div>
              <p className="text-secondary text-xs mt-2">Name is optional. One per line.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SMS LOGS TAB ===================== */}
      {activeTab === 'logs' && (
        <div className="bg-card rounded-lg border border-default">
          <div className="p-4 border-b border-default flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Clock size={20} className="text-blue-400" />
              SMS Delivery Logs
            </h2>
            <div className="flex items-center gap-2">
              <select value={logCompanyFilter} onChange={e => setLogCompanyFilter(e.target.value as Company | '')} className="px-3 py-1.5 bg-secondary rounded border border-default text-primary text-sm">
                <option value="">All Companies</option>
                <option value="aim">AIM</option>
                <option value="stigg">Stigg</option>
                <option value="syncai">SyncAI</option>
              </select>
              <button onClick={loadLogs} disabled={logsLoading} className="p-2 bg-secondary hover:bg-blue-500/20 rounded border border-default text-secondary hover:text-primary transition-colors">
                <RefreshCw size={16} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <span className="ml-2 text-secondary">Loading logs...</span>
            </div>
          ) : smsLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Smartphone size={48} className="text-secondary opacity-30 mb-2" />
              <p className="text-secondary text-sm">No SMS logs yet. Send your first message from the SMS Center tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="text-left p-3 text-secondary font-medium">Recipient</th>
                    <th className="text-left p-3 text-secondary font-medium">Message</th>
                    <th className="text-left p-3 text-secondary font-medium">Status</th>
                    <th className="text-left p-3 text-secondary font-medium">Company</th>
                    <th className="text-left p-3 text-secondary font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {smsLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <p className="text-primary font-medium">{log.recipient_name || 'Unknown'}</p>
                        <p className="text-secondary text-xs">{smsService.formatPhoneDisplay(log.recipient_phone)}</p>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="text-secondary text-xs truncate">{log.message_body}</p>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                          log.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                          log.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {log.status === 'delivered' && <CheckCircle size={12} />}
                          {log.status === 'failed' && <AlertCircle size={12} />}
                          {log.status === 'sent' && <Send size={12} />}
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-secondary uppercase">{log.company}</span>
                      </td>
                      <td className="p-3">
                        <p className="text-secondary text-xs">{new Date(log.sent_at).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-default max-w-md w-full">
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="p-1 hover:bg-secondary rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">To</label>
                <input type="text" placeholder="Search guard or contact..." className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Message</label>
                <textarea placeholder="Type your message..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
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
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Broadcast Announcement</h3>
              <button onClick={() => setShowBroadcast(false)} className="p-1 hover:bg-secondary rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Send to Channel</label>
                <select className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary text-sm">
                  {DEMO_CHANNELS.map(ch => (<option key={ch.id} value={ch.id}># {ch.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Title</label>
                <input type="text" placeholder="Announcement title..." className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
              </div>
              <div>
                <label className="block text-primary text-sm font-medium mb-2">Message</label>
                <textarea placeholder="Type your announcement..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
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
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Shift Handoff Notes</h3>
              <button onClick={() => setShowHandoff(false)} className="p-1 hover:bg-secondary rounded"><X size={20} /></button>
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
                <textarea placeholder="Key points for incoming guard..." rows={4} className="w-full px-3 py-2 bg-secondary rounded border border-default text-primary placeholder-secondary text-sm" />
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
