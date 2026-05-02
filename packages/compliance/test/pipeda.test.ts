import { describe, it, expect } from 'vitest';
import { runCompliance } from '../src/index.js';

const NOW = new Date('2026-05-01T12:00:00Z');

describe('PIPEDA breach notification rule', () => {
  it('flags high severity when breach is < 3 days old without notification', async () => {
    const f = await runCompliance({
      org_id: 'o1', now: NOW, guards: [], sites: [], contracts: [],
      privacy_breaches: [{
        id: 'b1',
        detected_at: '2026-04-30T12:00:00Z', // 1 day old
        notification_sent: false, opc_reported: false, records_affected: 12,
      }],
    });
    const x = f.find((r) => r.rule_id === 'PIPEDA-NOTIF');
    expect(x).toBeDefined();
    expect(x!.severity).toBe('high');
  });

  it('escalates to critical when breach is 3+ days old', async () => {
    const f = await runCompliance({
      org_id: 'o1', now: NOW, guards: [], sites: [], contracts: [],
      privacy_breaches: [{
        id: 'b1',
        detected_at: '2026-04-25T12:00:00Z', // 6 days old
        notification_sent: false, opc_reported: false, records_affected: null,
      }],
    });
    const x = f.find((r) => r.rule_id === 'PIPEDA-NOTIF');
    expect(x!.severity).toBe('critical');
  });

  it('emits nothing when both notifications complete', async () => {
    const f = await runCompliance({
      org_id: 'o1', now: NOW, guards: [], sites: [], contracts: [],
      privacy_breaches: [{
        id: 'b1', detected_at: '2026-04-25T12:00:00Z',
        notification_sent: true, opc_reported: true, records_affected: 12,
      }],
    });
    expect(f.find((r) => r.rule_id === 'PIPEDA-NOTIF')).toBeUndefined();
  });
});

describe('PIPEDA drill cadence rule', () => {
  it('reminds when no events recorded this quarter', async () => {
    const f = await runCompliance({
      org_id: 'o1', now: NOW, guards: [], sites: [], contracts: [],
      privacy_breaches: [],
    });
    const x = f.find((r) => r.rule_id === 'PIPEDA-DRILL');
    expect(x).toBeDefined();
    expect(x!.severity).toBe('low');
  });

  it('skips reminder when at least one event was logged this quarter', async () => {
    const f = await runCompliance({
      org_id: 'o1', now: NOW, guards: [], sites: [], contracts: [],
      privacy_breaches: [{
        id: 'b1', detected_at: '2026-04-15T00:00:00Z',
        notification_sent: true, opc_reported: true, records_affected: 0,
      }],
    });
    expect(f.find((r) => r.rule_id === 'PIPEDA-DRILL')).toBeUndefined();
  });
});
