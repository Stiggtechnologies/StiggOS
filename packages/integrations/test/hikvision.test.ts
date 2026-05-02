import { describe, expect, it } from 'vitest';
import { mapHikEventType, parseEvent, verifyHmac } from '../src/hikvision/index.js';

describe('verifyHmac', () => {
  it('accepts a correctly-signed payload', async () => {
    const body = '{"a":1}';
    const secret = 'shh';
    // Pre-computed: HMAC-SHA256("shh", '{"a":1}')
    // We compute it once via the same function to avoid copying hex by hand.
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(await verifyHmac(body, hex, secret)).toBe(true);
    expect(await verifyHmac(body, 'sha256=' + hex, secret)).toBe(true);
  });
  it('rejects a wrong signature', async () => {
    expect(await verifyHmac('{"a":1}', '00'.repeat(32), 'shh')).toBe(false);
  });
  it('rejects empty inputs', async () => {
    expect(await verifyHmac('x', '', 'shh')).toBe(false);
    expect(await verifyHmac('x', 'aa', '')).toBe(false);
  });
});

describe('mapHikEventType', () => {
  it.each([
    ['linedetection',    'linecrossing'],
    ['fielddetection',   'intrusion'],
    ['regionEntrance',   'region_entrance'],
    ['objectremoval',    'object_removal'],
    ['tamperDetection',  'tamper'],
    ['videoloss',        'video_loss'],
    ['motiondetection',  'motion'],
    ['IO',               'alarm_input'],
    ['somethingExotic',  'hik_somethingexotic'],
  ])('maps %s → %s', (hik, normalized) => {
    expect(mapHikEventType(hik)).toBe(normalized);
  });
});

describe('parseEvent', () => {
  it('parses an EventNotificationAlert envelope', () => {
    const evt = parseEvent({
      EventNotificationAlert: {
        eventType: 'linedetection',
        dateTime: '2026-05-01T18:00:00-06:00',
        channelID: 3,
      },
    });
    expect(evt).toBeTruthy();
    expect(evt!.type).toBe('linecrossing');
    expect(evt!.severity).toBe('medium');
    expect(evt!.channel).toBe(3);
  });

  it('parses a flat envelope without the wrapper', () => {
    const evt = parseEvent({ eventType: 'fielddetection', dateTime: '2026-05-01T18:00:00Z', channelID: '7' });
    expect(evt!.type).toBe('intrusion');
    expect(evt!.severity).toBe('high');
    expect(evt!.channel).toBe(7);
  });

  it('returns null on garbage', () => {
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent({})).toBeNull();
    expect(parseEvent({ EventNotificationAlert: {} })).toBeNull();
  });
});
