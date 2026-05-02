<!-- Thanks for a PR. Two minutes filling this in saves the reviewer ten. -->

## Summary

<!-- 1–3 lines: what changed and why. Link to issue / Linear if applicable. -->

## Surfaces affected

- [ ] schema / migrations
- [ ] RLS / audit
- [ ] AI agents (`packages/ai`)
- [ ] compliance rules (`packages/compliance`)
- [ ] edge functions (`supabase/functions`)
- [ ] console
- [ ] client-portal
- [ ] guard-mobile
- [ ] monitoring
- [ ] CI / infra / docs

## Test plan

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] If schema touched: `supabase db reset` succeeds locally + RLS suite green
- [ ] If AI agent touched: `npm run ai:eval` passes against the mock
- [ ] If a UI page touched: manual smoke against the seeded dev org

## Checklist

- [ ] Comments only where the *why* is non-obvious — no narration of *what*.
- [ ] No new placeholder pages — every route is real.
- [ ] No new `DEMO_DATA` fallbacks. Errors surface.
- [ ] Anything PII-related respects PIPEDA (only observed data).
- [ ] If the change requires a runbook update, it's in this PR.
