// Local mirror of the type map; kept inline so the edge bundle is self-contained.

const TYPE_MAP: Record<string, string> = {
  linedetection: 'linecrossing', linecrossing: 'linecrossing',
  fielddetection: 'intrusion', intrusion: 'intrusion',
  regionentrance: 'region_entrance', regionexiting: 'region_exiting',
  objectremoval: 'object_removal', unattendedbaggage: 'unattended_baggage',
  videoloss: 'video_loss', tamperdetection: 'tamper', shelteralarm: 'tamper',
  io: 'alarm_input', alarminput: 'alarm_input', pir: 'pir',
  motion: 'motion', motiondetection: 'motion',
};

export function mapHikEventType(eventType: string): string {
  const k = String(eventType ?? '').toLowerCase();
  return TYPE_MAP[k] ?? `hik_${k}`;
}
