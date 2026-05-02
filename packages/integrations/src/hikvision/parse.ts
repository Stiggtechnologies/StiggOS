// Normalize Hikvision ISAPI event-push payloads into our TriggerEvent shape.
//
// The shapes vary widely across firmware versions. We accept a few common
// envelopes and pull the meaningful fields out:
//   • EventNotificationAlert (Smart events: linedetection, fielddetection,
//     intrusion, regionEntrance, regionExiting, objectremoval, etc.)
//   • Tamper / video-loss events
//   • PIR / I/O alarm input
// Anything unrecognized passes through with type='other_hikvision'.

export interface HikEvent {
  /** The original payload, untouched. We persist this in dispatch_events.payload. */
  raw: Record<string, unknown>;
  /** ISO timestamp from `dateTime` if present. */
  at: string;
  /** Hikvision eventType string, lowercased. */
  hikEventType: string;
  /** Channel ID (1-based) if present. */
  channel?: number;
  /** Optional human description. */
  description?: string;
}

export interface NormalizedHikEvent {
  /** Mapped to the keys that linkage_rules.event_types uses. */
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channel?: number;
  at: string;
  raw: Record<string, unknown>;
}

const TYPE_MAP: Record<string, string> = {
  // Smart / VCA
  linedetection:    'linecrossing',
  linecrossing:     'linecrossing',
  fielddetection:   'intrusion',
  intrusion:        'intrusion',
  regionentrance:   'region_entrance',
  regionexiting:    'region_exiting',
  objectremoval:    'object_removal',
  unattendedbaggage:'unattended_baggage',
  videoloss:        'video_loss',
  tamperdetection:  'tamper',
  shelteralarm:     'tamper',
  // I/O / PIR
  io:               'alarm_input',
  alarminput:       'alarm_input',
  pir:              'pir',
  // Generic
  motion:           'motion',
  motiondetection:  'motion',
};

const DEFAULT_SEVERITY: Record<string, NormalizedHikEvent['severity']> = {
  motion:           'low',
  pir:              'low',
  alarm_input:      'medium',
  linecrossing:     'medium',
  region_entrance:  'medium',
  region_exiting:   'medium',
  object_removal:   'high',
  unattended_baggage:'medium',
  intrusion:        'high',
  tamper:           'high',
  video_loss:       'medium',
};

export function mapHikEventType(eventType: string): string {
  const k = String(eventType ?? '').toLowerCase();
  return TYPE_MAP[k] ?? `hik_${k}`;
}

function getString(o: any, path: string[]): string | undefined {
  let cur: any = o;
  for (const p of path) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur != null ? String(cur) : undefined;
}

export function parseEvent(input: unknown): NormalizedHikEvent | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, any>;

  // The most common envelope: { EventNotificationAlert: { eventType, dateTime, channelID, … } }
  const env = obj.EventNotificationAlert ?? obj.eventNotificationAlert ?? obj;
  const hikType = String(env.eventType ?? env.EventType ?? '').trim();
  if (!hikType) return null;
  const at = getString(env, ['dateTime']) ?? getString(env, ['Time']) ?? new Date().toISOString();
  const channel = (() => {
    const raw = env.channelID ?? env.ChannelID ?? env.channel;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  })();
  const type = mapHikEventType(hikType);
  const severity = DEFAULT_SEVERITY[type] ?? 'medium';
  return { type, severity, channel, at, raw: obj };
}
