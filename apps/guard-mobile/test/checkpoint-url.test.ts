import { describe, expect, it } from 'vitest';
import { parseCheckpointUrl } from '../src/lib/checkpoint-url';

describe('parseCheckpointUrl', () => {
  it('parses the short /p/<code> form (the preferred NFC URL)', () => {
    expect(parseCheckpointUrl('/p/NW-1001')).toBe('NW-1001');
  });

  it('tolerates a trailing slash from the Vercel rewrite', () => {
    expect(parseCheckpointUrl('/p/NW-1001/')).toBe('NW-1001');
  });

  it('decodes percent-encoded codes (e.g. tags written with spaces)', () => {
    expect(parseCheckpointUrl('/p/NW%201001')).toBe('NW 1001');
  });

  it('parses the verbose ?checkpoint_id= form', () => {
    expect(parseCheckpointUrl('/patrol/checkin', '?checkpoint_id=NW-1003')).toBe('NW-1003');
  });

  it('also accepts ?code= as an alias for checkpoint_id', () => {
    expect(parseCheckpointUrl('/patrol/checkin', '?code=NW-1004')).toBe('NW-1004');
  });

  it('returns null for the app root', () => {
    expect(parseCheckpointUrl('/', '')).toBeNull();
  });

  it('returns null for an unrelated path', () => {
    expect(parseCheckpointUrl('/dashboard', '')).toBeNull();
    expect(parseCheckpointUrl('/p', '')).toBeNull();
    expect(parseCheckpointUrl('/p/', '')).toBeNull();
  });

  it('returns null when /patrol/checkin has no code parameter', () => {
    expect(parseCheckpointUrl('/patrol/checkin', '?foo=bar')).toBeNull();
  });

  it('does not match nested paths under /p/', () => {
    expect(parseCheckpointUrl('/p/NW-1001/extra', '')).toBeNull();
  });
});
