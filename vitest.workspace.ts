import { defineWorkspace } from 'vitest/config';

// Single config so the root `npm test` runs every package's vitest suite.
export default defineWorkspace([
  'packages/compliance',
  'packages/ai',
  'packages/shared',
  'packages/dispatch',
  'packages/integrations',
]);
