import { describe, expect, it } from 'vitest';
import { parsePing } from '../src/findmy/index.js';

describe('parsePing', () => {
  it('parses a typical bridge POST', () => {
    const p = parsePing({ device_serial: 'AT-1', lat: 51.05, lng: -114.07, timestamp: 1746138000, accuracy_m: 6, battery_pct: 80 });
    expect(p!.device_serial).toBe('AT-1');
    expect(p!.lat).toBe(51.05);
    expect(p!.battery_pct).toBe(80);
  });
  it('accepts ms or seconds timestamps and ISO strings', () => {
    expect(parsePing({ id: 'X', lat: 0, lng: 0, timestamp: 1746138000000 })!.reported_at).toMatch(/2025-05-01/);
    expect(parsePing({ id: 'X', lat: 0, lng: 0, time: '2026-05-01T12:00:00Z' })!.reported_at).toBe('2026-05-01T12:00:00.000Z');
  });
  it('returns null on bad input', () => {
    expect(parsePing(null)).toBeNull();
    expect(parsePing({ lat: 1, lng: 1 })).toBeNull();
  });
});
