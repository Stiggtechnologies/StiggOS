// AI eval harness. Uses the mock provider by default so CI runs without a key.
// Each surface gets a tiny set of fixtures asserting structured-output shape.
//
// When ANTHROPIC_API_KEY is set and AI_PROVIDER=anthropic, the same fixtures
// run against real Claude — useful for nightly regression checks.

import { runAgent } from '../src/agent.js';
import { incidentSystemStatic, incidentTools } from '../src/agents/incident-copilot.js';
import { scheduleSystemStatic, scheduleTools } from '../src/agents/schedule-agent.js';

let failures = 0;

async function evalIncidentCopilot() {
  console.log('• incident-copilot: structures a basic narration');
  let createdInput: any = null;
  const tools = incidentTools({
    createIncident: async (input) => { createdInput = input; return { id: 'eval' }; },
  });
  const r = await runAgent({
    surface: 'incident_copilot',
    systemStatic: incidentSystemStatic,
    userMessage: 'around 2 AM the east loading door alarm went off, two guys jumped into a dark sedan and peeled off, partial plate ABC1',
    tools,
    ctx: { orgId: 'eval-org', surface: 'incident_copilot' },
  });
  if (!createdInput) { console.error('  ✗ no create_incident tool call'); failures++; return; }
  if (createdInput.severity !== 'high') console.warn('  ! severity', createdInput.severity, '(expected high)');
  if (!['trespass','suspicious_activity','other'].includes(createdInput.category)) {
    console.error('  ✗ unexpected category', createdInput.category); failures++;
  }
  if (!createdInput.ai_structured?.what) { console.error('  ✗ ai_structured.what missing'); failures++; }
  console.log(`  ✓ ${r.iterations} iter, cost ~$${r.usage.cost_usd.toFixed(4)}`);
}

async function evalScheduleAgent() {
  console.log('• schedule-agent: emits propose_schedule');
  let proposed: any = null;
  const tools = scheduleTools({
    proposeSchedule: async (input) => { proposed = input; return { accepted: 0 }; },
  });
  const r = await runAgent({
    surface: 'schedule_agent',
    systemStatic: scheduleSystemStatic,
    userMessage: 'Propose a schedule for the week of 2026-05-04.',
    tools,
    ctx: { orgId: 'eval-org', surface: 'schedule_agent' },
    maxIterations: 3,
  });
  if (!proposed) { console.error('  ✗ no propose_schedule call'); failures++; return; }
  if (!Array.isArray(proposed.proposals)) { console.error('  ✗ proposals not array'); failures++; }
  console.log(`  ✓ ${r.iterations} iter, ${proposed.proposals?.length ?? 0} proposals`);
}

async function main() {
  await evalIncidentCopilot();
  await evalScheduleAgent();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nall evals passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
