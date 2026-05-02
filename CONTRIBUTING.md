# Contributing

## Local dev

```bash
npm install
npm run setup        # boots Supabase locally + applies migrations + seed
npm run dev          # all four apps, parallel
npm test             # vitest across packages
npm run test:e2e     # Playwright smoke
npm run test:rls     # pgTAP — needs a local Postgres
npm run ai:eval      # agent harness vs. mock provider
```

## Code style

- TypeScript strict, no `any` except at well-marked boundaries.
- React: function components, hooks, no class components.
- Comments only when the *why* is non-obvious. Don't narrate code.
- One feature per PR. Schema changes ship with their RLS test.

## Schema changes

1. Add a new file under `supabase/migrations/000N_*.sql`. Never modify an
   existing migration that has been deployed.
2. Add or update RLS policies (`0002_rls.sql` is the canonical reference).
3. Add or extend the pgTAP test in `supabase/tests/`.
4. Add the new shape to `packages/shared/src/types.ts` (the hand-curated
   types) and re-run `npm run db:types` to regenerate `db.generated.ts`.

## Adding an AI agent

1. New file in `packages/ai/src/agents/<name>.ts` exporting `<name>SystemStatic` and `<name>Tools()`.
2. Add a vitest case using the mock provider that asserts the tool call shape.
3. Add an edge function under `supabase/functions/<name>/index.ts` that wires it to real DB I/O.
4. Add a UI surface in the console (or wherever).
5. Update `docs/LLM-PROVIDERS.md` if the agent has a model-capability requirement.

## Branches

- `main` — protected, all changes via PR.
- `os-v2-rebuild` — long-lived branch for the v2 rebuild; will be merged to main when stakeholder sign-off lands.
- Feature branches: `feat/<short-slug>`, `fix/<short-slug>`, `chore/<short-slug>`.

## Commit messages

Conventional, but the body matters more than the subject prefix. Imperative subject < 70 chars; body explains *why*.

## Code review expectations

- Tests required for new code paths.
- For UI: a screenshot or short Loom in the PR description.
- For schema: the RLS test is in scope.
- Reviewer checks the PR template's checklist.
