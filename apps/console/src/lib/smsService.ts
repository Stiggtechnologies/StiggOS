// SMS Service — Twilio integration via Supabase Edge Function
// Provides: sendSingle, sendBulk, sendBroadcast, getStatus, getLogs
// Used by: Communications.tsx, AutomationRules.tsx, NotificationsAlerts.tsx

import { supabase } from './supabase'

const EDGE_FUNCTION_URL = 'https://snlevbkyjipucmkpkqka.supabase.co/functions/v1/send-sms'

type Company = 'aim' | 'stigg' | 'syncai'
type Category = 'marketing' | 'alert' | 'reminder' | 'notification'

interface Recipient {
  phone: string
  name?: string
}

interface SMSResult {
  success: boolean
  messageSid?: string
  error?: string
  phone?: string
}

interface BroadcastResult {
  broadcastId: string
  totalRecipients: number
  sent: number
  failed: number
  status: string
}

interface BroadcastStatus {
  id: string
  company: string
  category: string
  message_template: string
  total_recipients: number
  sent_count: number
  failed_count: number
  status: string
  created_at: string
  updated_at: string
}

interface SMSLog {
  id: string
  broadcast_id: string | null
  recipient_phone: string
  recipient_name: string | null
  message_body: string
  status: string
  twilio_sid: string | null
  error_message: string | null
  company: string
  category: string
  sent_at: string
}

async function callEdgeFunction(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
      'apikey': 'sb_publishable_mVQHSs67SUw7oeuKrlGaHQ_1NX3ocs4',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const smsService = {
  // Send a single SMS
  async sendSingle(to: string, message: string, company: Company = 'aim', category: Category = 'notification'): Promise<SMSResult> {
    return callEdgeFunction({ action: 'send_single', to, message, company, category })
  },

  // Send bulk SMS to a list of recipients
  async sendBulk(recipients: Recipient[], message: string, company: Company = 'aim', category: Category = 'marketing'): Promise<BroadcastResult> {
    return callEdgeFunction({ action: 'send_bulk', recipients, message, company, category })
  },

  // Alias for sendBulk — more descriptive for mass marketing sends
  async sendBroadcast(recipients: Recipient[], message: string, company: Company = 'aim', category: Category = 'marketing'): Promise<BroadcastResult> {
    return callEdgeFunction({ action: 'send_broadcast', recipients, message, company, category })
  },

  // Get status of a broadcast
  async getStatus(broadcastId: string): Promise<BroadcastStatus> {
    return callEdgeFunction({ action: 'get_status', broadcastId })
  },

  // Get SMS logs (most recent 100)
  async getLogs(company?: Company, broadcastId?: string): Promise<SMSLog[]> {
    return callEdgeFunction({ action: 'get_logs', company, broadcastId })
  },

  // Format phone to display format
  formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  },

  // Estimate SMS cost (Twilio Canada rate ~$0.0079/segment, 160 chars per segment)
  estimateCost(recipientCount: number, messageLength: number): { segments: number; costPerRecipient: number; totalCost: number } {
    const segments = Math.ceil(messageLength / 160)
    const costPerRecipient = segments * 0.0079
    const totalCost = costPerRecipient * recipientCount
    return { segments, costPerRecipient, totalCost: Math.round(totalCost * 100) / 100 }
  },
}

export type { Recipient, SMSResult, BroadcastResult, BroadcastStatus, SMSLog, Company, Category }
