// POST /functions/v1/dispatch-router  (called by other edge fns)
// Body: { event: TriggerEvent }
//
// Looks up the org's linkage rules, arming schedules, and dispatch routes,
// runs the deterministic evaluator, persists dispatch_events for every action
// fired, and updates dispatch_routes.rotation_state. Side effects (SMS, voice,
// relay control) are best-effort: each is wrapped in try/catch so a single
// channel failure doesn't abort the chain.

import { authenticate } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/cors.ts';
import {
  evaluate, type ArmingSchedule, type DispatchRoute, type LinkageRule, type TriggerEvent, type Action,
} from '../_shared/dispatch.ts';
import { HikRelay } from '../_shared/hik-relay.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => ({}));
  const event = (body as { event?: TriggerEvent }).event;
  if (!event || !event.type) return json(req, 400, { error: 'event required' });
  // Coerce `at` to Date — JSON serialization made it a string.
  event.at = event.at ? new Date(event.at as unknown as string) : new Date();
  event.org_id = ctx.org_id;

  const [{ data: rules }, { data: schedules }, { data: routes }] = await Promise.all([
    ctx.user.from('linkage_rules').select('*').eq('is_active', true),
    ctx.user.from('arming_schedules').select('*').eq('is_active', true),
    ctx.user.from('dispatch_routes').select('*').eq('is_active', true),
  ]);

  const routesMap: Record<string, DispatchRoute> = {};
  for (const r of (routes ?? []) as DispatchRoute[]) routesMap[r.id] = r;

  const result = evaluate({
    event,
    ctx: {
      rules: (rules ?? []) as LinkageRule[],
      schedules: (schedules ?? []) as ArmingSchedule[],
      routes: routesMap,
    },
  });

  // Persist updated rotation state per route.
  for (const [routeId, state] of Object.entries(result.next_rotation_state)) {
    await ctx.service.from('dispatch_routes').update({ rotation_state: state }).eq('id', routeId);
  }

  // Fan out — best effort per action.
  const fired: Array<{ kind: string; ok: boolean; note?: string }> = [];
  for (const a of result.actions) {
    try {
      await execute(a, event, ctx, result.rule?.id);
      fired.push({ kind: a.kind, ok: true });
    } catch (err) {
      fired.push({ kind: a.kind, ok: false, note: err instanceof Error ? err.message : String(err) });
    }
  }

  return json(req, 200, {
    rule_id: result.rule?.id ?? null,
    trace: result.trace,
    fired,
  });
});

async function execute(
  action: Action & { resolved_targets?: any[] },
  event: TriggerEvent,
  ctx: { org_id: string; user_id: string; user: any; service: any },
  rule_id?: string,
): Promise<void> {
  const baseEvent = {
    org_id: ctx.org_id,
    rule_id: rule_id ?? null,
    source_kind: sourceKind(event),
    source_id: event.camera_id ?? event.vehicle_id ?? event.asset_id ?? null,
    site_id: event.site_id ?? null,
    payload: event.payload ?? {},
  };

  if (action.kind === 'create_incident') {
    const { data: inc } = await ctx.service.from('incidents').insert({
      org_id: ctx.org_id,
      site_id: event.site_id,
      title: `Auto-created from ${event.type}`,
      description: JSON.stringify(event.payload ?? {}),
      category: incidentCategory(event.type),
      severity: event.severity,
      status: 'open',
      occurred_at: event.at.toISOString(),
    }).select('id').single();
    await ctx.service.from('dispatch_events').insert({
      ...baseEvent, target: { kind: 'incident', id: inc?.id }, status: 'sent',
    });
    return;
  }

  if (action.kind === 'fire_relay') {
    // Relay actions need the NVR creds — look up the camera's nvr_system.
    if (!event.camera_id) throw new Error('fire_relay needs camera_id on the event');
    const { data: cam } = await ctx.user.from('cameras').select('nvr_system_id, channel_no').eq('id', event.camera_id).single();
    if (!cam?.nvr_system_id) throw new Error('camera has no nvr_system_id');
    const { data: nvr } = await ctx.service.from('nvr_systems').select('*').eq('id', cam.nvr_system_id).single();
    if (!nvr) throw new Error('nvr_system not found');
    const port = Number(action.params?.port ?? 1);
    const dur = Number(action.params?.duration_ms ?? 3000);
    await new HikRelay({
      baseUrl: `http://${nvr.hostname}:${nvr.api_port ?? 80}`,
      username: nvr.username, password: nvr.secret_ref ?? '',
    }).fireRelay(port, dur);
    await ctx.service.from('dispatch_events').insert({
      ...baseEvent, target: { kind: 'relay', port }, status: 'sent', route_id: action.route_id ?? null,
    });
    return;
  }

  if (action.kind === 'dispatch_route') {
    for (const t of (action.resolved_targets ?? [])) {
      // We log the dispatch_event row but don't actually send the SMS/voice.
      // The notifier worker (see notifier_drain edge fn or a queue worker)
      // claims pending rows and ships them via Twilio/email/webhook.
      await ctx.service.from('dispatch_events').insert({
        ...baseEvent, target: t, status: 'pending', route_id: action.route_id ?? null,
      });
    }
    return;
  }

  // Notifications: insert a notifications row keyed to the on-call user(s).
  if (action.kind.startsWith('notify_')) {
    await ctx.service.from('notifications').insert({
      org_id: ctx.org_id,
      user_id: null, // org-wide; per-user fan-out lives in notifier_drain
      channel: action.kind === 'notify_email' ? 'email'
             : action.kind === 'notify_sms'   ? 'sms'
             : action.kind === 'notify_voice' ? 'voice'
             : 'inapp',
      topic: `automation.${event.type}`,
      payload: { event, params: action.params ?? {} },
    });
    await ctx.service.from('dispatch_events').insert({
      ...baseEvent, target: { kind: 'notification', channel: action.kind }, status: 'sent', route_id: action.route_id ?? null,
    });
    return;
  }

  // Fall-through: log the action so it's auditable even when not yet wired.
  await ctx.service.from('dispatch_events').insert({
    ...baseEvent, target: { kind: action.kind, params: action.params }, status: 'pending', route_id: action.route_id ?? null,
  });
}

function sourceKind(ev: TriggerEvent): string {
  if (ev.camera_id) return 'camera_alert';
  if (ev.vehicle_id) return 'vehicle_alert';
  if (ev.asset_id) return 'asset_alert';
  if (ev.type === 'panic') return 'panic';
  if (ev.type === 'tour_miss') return 'tour_miss';
  return 'manual';
}

function incidentCategory(eventType: string): string {
  if (['linecrossing','intrusion','region_entrance'].includes(eventType)) return 'trespass';
  if (eventType === 'object_removal') return 'theft';
  if (eventType === 'tamper') return 'vandalism';
  if (eventType === 'panic') return 'medical';
  return 'other';
}
