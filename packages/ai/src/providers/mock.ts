// Deterministic mock provider. Same surface, same shape — no network.
// Routes by surface keyword in the system prompt to return realistic outputs.

import type { Provider, ProviderRequest, ProviderResponse, NormalizedMessage } from './types.js';

export function makeMock(): Provider {
  return {
    name: 'mock',
    capabilities: { tools: true, promptCache: true },
    async complete(req: ProviderRequest): Promise<ProviderResponse> {
      const sys = req.system.map((s) => s.text).join('\n');
      const lastUser = lastUserText(req.messages).toLowerCase();

      if (sys.includes('Incident Copilot') || lastUser.includes('incident')) return mockIncident(req, lastUser);
      if (sys.includes('Schedule Agent')   || lastUser.includes('schedule')) return mockSchedule();
      if (sys.includes('Compliance Co-pilot') || lastUser.includes('compliance')) return mockCompliance();
      if (sys.includes('Forensic Search')  || lastUser.includes('search'))   return mockForensic(lastUser);
      if (sys.includes('Sales Assessment') || lastUser.includes('assessment'))return mockSales();
      return text(`(mock provider) Echo for ${req.model}.`);
    },
  };
}

function lastUserText(msgs: NormalizedMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || m.role !== 'user') continue;
    return m.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n');
  }
  return '';
}

function text(t: string): ProviderResponse {
  return { model: 'mock', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: { input_tokens: 0, output_tokens: 0 } };
}

function toolCall(name: string, input: unknown): ProviderResponse {
  return {
    model: 'mock', stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: `mock_${name}_${Date.now()}`, name, input }],
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function mockIncident(_req: ProviderRequest, lower: string): ProviderResponse {
  const category =
    lower.includes('fire')      ? 'fire' :
    lower.includes('medical')   ? 'medical' :
    lower.includes('theft')     ? 'theft' :
    lower.includes('vehicle')   ? 'vehicle' :
    lower.includes('breach') || lower.includes('intrud') || lower.includes('door') ? 'trespass' : 'other';
  const severity =
    lower.includes('weapon') || lower.includes('injur') ? 'critical' :
    lower.includes('breach') || lower.includes('forced') ? 'high' :
    lower.includes('alarm')                              ? 'medium' : 'low';
  return toolCall('create_incident', {
    title: 'Auto-structured incident from guard narration',
    description: lower.slice(0, 1000),
    category, severity,
    ai_structured: {
      who: 'Reporting guard + 2 unidentified individuals',
      what: 'Possible attempted unauthorized access',
      when: new Date().toISOString(),
      where: 'East loading area',
      how: 'Motion sensor triggered; physical inspection found no entry',
      actions_taken: 'Patrol responded; subjects fled in dark sedan',
      witnesses: [],
      evidence_needed: ['CCTV review'],
    },
    ai_confidence: 0.78,
  });
}

function mockSchedule(): ProviderResponse {
  return toolCall('propose_schedule', {
    week_of: new Date().toISOString().slice(0, 10),
    proposals: [
      { guard_id: 'GUARD_JEMAL',   site_id: 'SITE_FM',      scheduled_start: new Date(Date.now() + 24*3600*1000).toISOString(), scheduled_end: new Date(Date.now() + 32*3600*1000).toISOString(), rationale: 'Within commute; license valid; no overlap.' },
      { guard_id: 'GUARD_SOLOMON', site_id: 'SITE_CALGARY', scheduled_start: new Date(Date.now() + 26*3600*1000).toISOString(), scheduled_end: new Date(Date.now() + 34*3600*1000).toISOString(), rationale: '⚠ SSIA license expires in 25 days — renew first.' },
    ],
    notes: ['Solomon license expiry binds the week.'],
  });
}

function mockCompliance(): ProviderResponse {
  return toolCall('emit_insights', {
    insights: [
      {
        surface: 'compliance', scope_type: 'guard', scope_id: 'GUARD_SOLOMON',
        title: 'SSIA license expires in 25 days — Solomon Abdi',
        description: 'License AB-12346 expires soon. AB Justice renewal lead time is 4–6 weeks.',
        confidence: 1.0, severity: 'high',
        recommended_action: 'Open renewal task; pre-book replacement coverage.',
        citations: [{ table: 'guards', id: 'GUARD_SOLOMON', note: 'ssia_license_expiry' }],
      },
    ],
  });
}

function mockForensic(q: string): ProviderResponse {
  return toolCall('run_search', {
    query: q,
    interpreted_filters: {
      tables: ['incidents'],
      time_window: { human: 'last 7 days' },
      severity_min: 'medium',
      keywords: ['breach', 'sedan'],
    },
  });
}

function mockSales(): ProviderResponse {
  return toolCall('emit_assessment', {
    summary: 'Mid-rise residential complex with overnight loitering concerns at parkade.',
    recommended_services: [
      { service: 'guarding',      hours_per_week: 56, rationale: '8h overnight × 7 days.' },
      { service: 'virtual_guard', hours_per_week: 84, rationale: '12h evening AI camera coverage.' },
      { service: 'surveillance',  one_time: true,    rationale: '6 HD IP cameras + NVR install.' },
    ],
    estimated_monthly_cad: 8950,
    estimated_oneoff_cad: 12500,
    risks_flagged: ['Adjacent vacant lot increases overnight loitering risk.'],
    rationale_md: '**Estimate, subject to site survey.**',
  });
}
