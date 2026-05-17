// Supabase Edge Function: send-sms
// Handles single SMS, bulk SMS, and mass broadcast via Twilio
// Used by: AIM (patient blasts, reminders), Stigg (security alerts, guard notifications)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  action: 'send_single' | 'send_bulk' | 'send_broadcast' | 'get_status' | 'get_logs'
  to?: string
  message?: string
  recipients?: Array<{ phone: string; name?: string }>
  broadcastId?: string
  company?: 'aim' | 'stigg' | 'syncai'
  category?: 'marketing' | 'alert' | 'reminder' | 'notification'
  batchSize?: number
}

interface SMSResult {
  success: boolean
  messageSid?: string
  error?: string
  phone?: string
  name?: string
}

// Format phone to E.164
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.startsWith('+')) return phone.replace(/\s/g, '')
  return `+${digits}`
}

// Send a single SMS via Twilio REST API
async function sendSMS(to: string, body: string): Promise<SMSResult> {
  const formattedTo = formatPhone(to)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: TWILIO_PHONE_NUMBER,
        Body: body,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true, messageSid: data.sid, phone: formattedTo }
    } else {
      return { success: false, error: data.message || 'Twilio API error', phone: formattedTo }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message, phone: formattedTo }
  }
}

// Send bulk SMS with rate limiting (10 per second to stay under Twilio limits)
async function sendBulkSMS(
  recipients: Array<{ phone: string; name?: string }>,
  messageTemplate: string,
  supabase: any,
  broadcastId: string,
  batchSize: number = 10
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  let sent = 0
  let failed = 0
  const results: SMSResult[] = []

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    const batchPromises = batch.map(async (recipient) => {
      // Replace template variables
      let message = messageTemplate
      if (recipient.name) {
        message = message.replace(/\$\{name\}/g, recipient.name)
        message = message.replace(/\$\{clientFirstName\}/g, recipient.name.split(' ')[0])
      }

      const result = await sendSMS(recipient.phone, message)
      result.name = recipient.name

      // Log to database
      await supabase.from('sms_logs').insert({
        broadcast_id: broadcastId,
        recipient_phone: formatPhone(recipient.phone),
        recipient_name: recipient.name || null,
        message_body: message,
        status: result.success ? 'delivered' : 'failed',
        twilio_sid: result.messageSid || null,
        error_message: result.error || null,
        sent_at: new Date().toISOString(),
      }).catch(() => {}) // Don't fail on logging errors

      if (result.success) sent++
      else failed++

      return result
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Update broadcast progress
    await supabase.from('sms_broadcasts').update({
      sent_count: sent,
      failed_count: failed,
      status: i + batchSize >= recipients.length ? (failed === 0 ? 'completed' : 'completed_with_errors') : 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', broadcastId).catch(() => {})

    // Rate limit: wait 1 second between batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return { sent, failed, results }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify required env vars
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(JSON.stringify({
        error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Supabase secrets.'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body: SMSRequest = await req.json()

    switch (body.action) {
      case 'send_single': {
        if (!body.to || !body.message) {
          return new Response(JSON.stringify({ error: 'Missing "to" or "message"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const result = await sendSMS(body.to, body.message)

        // Log it
        await supabase.from('sms_logs').insert({
          recipient_phone: formatPhone(body.to),
          message_body: body.message,
          status: result.success ? 'delivered' : 'failed',
          twilio_sid: result.messageSid || null,
          error_message: result.error || null,
          company: body.company || 'aim',
          category: body.category || 'notification',
          sent_at: new Date().toISOString(),
        }).catch(() => {})

        return new Response(JSON.stringify(result),
          { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'send_bulk':
      case 'send_broadcast': {
        if (!body.recipients?.length || !body.message) {
          return new Response(JSON.stringify({ error: 'Missing "recipients" array or "message"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Create broadcast record
        const { data: broadcast, error: createError } = await supabase.from('sms_broadcasts').insert({
          company: body.company || 'aim',
          category: body.category || 'marketing',
          message_template: body.message,
          total_recipients: body.recipients.length,
          sent_count: 0,
          failed_count: 0,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().single()

        const broadcastId = broadcast?.id || crypto.randomUUID()

        // Send all messages
        const result = await sendBulkSMS(
          body.recipients,
          body.message,
          supabase,
          broadcastId,
          body.batchSize || 10
        )

        return new Response(JSON.stringify({
          broadcastId,
          totalRecipients: body.recipients.length,
          sent: result.sent,
          failed: result.failed,
          status: result.failed === 0 ? 'completed' : 'completed_with_errors',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'get_status': {
        if (!body.broadcastId) {
          return new Response(JSON.stringify({ error: 'Missing broadcastId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data } = await supabase.from('sms_broadcasts')
          .select('*')
          .eq('id', body.broadcastId)
          .single()

        return new Response(JSON.stringify(data || { error: 'Broadcast not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'get_logs': {
        const query = supabase.from('sms_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(100)

        if (body.company) query.eq('company', body.company)
        if (body.broadcastId) query.eq('broadcast_id', body.broadcastId)

        const { data } = await query
        return new Response(JSON.stringify(data || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${body.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
