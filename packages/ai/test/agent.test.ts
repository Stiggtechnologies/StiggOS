import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAgent } from '../src/agent.js';
import { resetProviderForTests } from '../src/provider.js';
import { incidentSystemStatic, incidentTools } from '../src/agents/incident-copilot.js';
import { scheduleSystemStatic, scheduleTools } from '../src/agents/schedule-agent.js';
import { complianceSystemStatic, complianceTools } from '../src/agents/compliance-watcher.js';
import { forensicSystemStatic, forensicTools } from '../src/agents/forensic-search.js';
import { salesSystemStatic, salesTools } from '../src/agents/sales-assessment.js';

beforeEach(() => {
  process.env.AI_FORCE_MOCK = '1';
  resetProviderForTests();
});
afterEach(() => {
  delete process.env.AI_FORCE_MOCK;
  resetProviderForTests();
  vi.restoreAllMocks();
});

describe('runAgent — incident copilot', () => {
  it('emits exactly one create_incident tool call with required fields', async () => {
    let captured: any = null;
    const tools = incidentTools({
      createIncident: async (input) => { captured = input; return { id: 'i1' }; },
    });
    const r = await runAgent({
      surface: 'incident_copilot',
      systemStatic: incidentSystemStatic,
      userMessage: 'around 2 AM the east loading door alarm went off, two guys jumped into a dark sedan, partial plate ABC1',
      tools,
      ctx: { orgId: 'o', surface: 'incident_copilot' },
    });

    expect(captured).toBeTruthy();
    expect(captured.title).toBeTypeOf('string');
    expect(['trespass','vandalism','theft','disturbance','medical','fire','maintenance','suspicious_activity','vehicle','cyber','transport','other']).toContain(captured.category);
    expect(['low','medium','high','critical']).toContain(captured.severity);
    expect(captured.ai_confidence).toBeGreaterThanOrEqual(0);
    expect(captured.ai_confidence).toBeLessThanOrEqual(1);
    expect(captured.ai_structured?.what).toBeTypeOf('string');
    expect(r.iterations).toBeGreaterThanOrEqual(1);
    // The mock should not produce errors for a valid input.
    expect(r.events.find((e) => e.type === 'tool_error')).toBeUndefined();
  });

  it('respects the maxIterations bound', async () => {
    const tools = incidentTools({ createIncident: async () => { throw new Error('forced fail'); } });
    const r = await runAgent({
      surface: 'incident_copilot',
      systemStatic: incidentSystemStatic,
      userMessage: 'door alarm',
      tools,
      maxIterations: 2,
      ctx: { orgId: 'o', surface: 'incident_copilot' },
    });
    expect(r.iterations).toBeLessThanOrEqual(2);
  });
});

describe('runAgent — schedule agent', () => {
  it('emits propose_schedule with at least one proposal', async () => {
    let captured: any = null;
    const tools = scheduleTools({
      proposeSchedule: async (input) => { captured = input; return { accepted: 0 }; },
    });
    await runAgent({
      surface: 'schedule_agent',
      systemStatic: scheduleSystemStatic,
      userMessage: 'Propose a schedule for the week of 2026-05-04.',
      tools,
      ctx: { orgId: 'o', surface: 'schedule_agent' },
    });
    expect(captured).toBeTruthy();
    expect(Array.isArray(captured.proposals)).toBe(true);
    expect(captured.proposals.length).toBeGreaterThan(0);
    for (const p of captured.proposals) {
      expect(p.guard_id).toBeTypeOf('string');
      expect(p.site_id).toBeTypeOf('string');
      expect(p.rationale).toBeTypeOf('string');
    }
  });
});

describe('runAgent — compliance copilot', () => {
  it('emits insights with citations', async () => {
    let captured: any = null;
    const tools = complianceTools({
      emitInsights: async (input) => { captured = input; return { count: 0 }; },
    });
    await runAgent({
      surface: 'compliance',
      systemStatic: complianceSystemStatic,
      userMessage: 'Triage these findings: license expiry imminent.',
      tools,
      ctx: { orgId: 'o', surface: 'compliance' },
    });
    expect(captured.insights).toBeDefined();
    for (const i of captured.insights) {
      expect(['low','medium','high','critical']).toContain(i.severity);
      expect(i.citations).toBeInstanceOf(Array);
    }
  });
});

describe('runAgent — forensic search', () => {
  it('emits a structured search plan', async () => {
    let captured: any = null;
    const tools = forensicTools({
      runSearch: async (input) => { captured = input; return { rows: 0 }; },
    });
    await runAgent({
      surface: 'forensic_search',
      systemStatic: forensicSystemStatic,
      userMessage: 'incidents involving sedans in the last 7 days',
      tools,
      ctx: { orgId: 'o', surface: 'forensic_search' },
    });
    expect(captured.interpreted_filters?.tables).toBeInstanceOf(Array);
    expect(captured.interpreted_filters.time_window?.human).toBeTypeOf('string');
  });
});

describe('runAgent — sales assessment', () => {
  it('emits an assessment with monthly estimate and rationale', async () => {
    let captured: any = null;
    const tools = salesTools({
      emitAssessment: async (input) => { captured = input; return { id: 'a1' }; },
    });
    await runAgent({
      surface: 'sales',
      systemStatic: salesSystemStatic,
      userMessage: '4-storey residential, 86 units, parkade access, overnight loitering concerns.',
      tools,
      ctx: { orgId: 'o', surface: 'sales' },
    });
    expect(captured.estimated_monthly_cad).toBeGreaterThan(0);
    expect(captured.recommended_services.length).toBeGreaterThan(0);
    for (const s of captured.recommended_services) {
      expect(['guarding','surveillance','virtual_guard','it_security','secure_transport']).toContain(s.service);
    }
    expect(captured.risks_flagged).toBeInstanceOf(Array);
  });
});

describe('cost telemetry', () => {
  it('mock costs are zero (no pricing entry); structured field is present', async () => {
    const tools = incidentTools({ createIncident: async () => ({ id: 'i1' }) });
    const r = await runAgent({
      surface: 'incident_copilot',
      systemStatic: incidentSystemStatic,
      userMessage: 'door alarm',
      tools,
      ctx: { orgId: 'o', surface: 'incident_copilot' },
    });
    expect(r.usage.cost_usd).toBe(0);
    expect(r.provider).toBe('mock');
  });
});
