# Historical Soak Scripts

Last updated: 2026-07-05

## Current Status

These scripts are historical live-data soak harnesses. They are not part of normal validation, not part of `npm run validate`, not part of `test:safe`, and not read-only runtime smokes.

Do not run them unless the operator explicitly approves a live-data soak and the script has been reviewed in the current worktree first.

## Why They Are Quarantined

- Several scripts use live Neon/Payload data.
- Several scripts perform writes, cleanup, or audit-event updates.
- Several scripts reference stale absolute `/sessions/...` paths.
- They are useful as historical evidence, but they should not be treated as current operator-safe tooling.

## Known Historical Soak Files

- `scripts/d241-soak-sql.ts`
- `scripts/d241-soak.ts`
- `scripts/d242-soak.ts`
- `scripts/d243-soak.ts`
- `scripts/d244-soak.ts`
- `scripts/d245-soak.ts`
- `scripts/d246-soak.ts`
- `scripts/d247-soak.ts`
- `scripts/d248-soak.ts`
- `scripts/d249-soak.ts`

## Current Safe Alternatives

Use the maintained local tests and read-only runtime smokes instead:

- `npm run validate`
- `npm run test:safe`
- `npm run test:runtime-smokes`
- `npm run smoke:activation:read -- --product=<id> --confirm-read-only`
- `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`
- `npm run smoke:load-plan:read -- --confirm-read-only`
- `npm run smoke:provider-health:read -- --confirm-read-only`
- `npm run smoke:pi-provider-health:read -- --confirm-read-only`
- `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`
- `npm run smoke:ad-performance:read -- --confirm-read-only`
- `npm run smoke:business-funnel:read -- --confirm-read-only`
- `npm run smoke:lead-followup:read -- --confirm-read-only`
- `npm run smoke:imageqc:schema -- --confirm-read-only`
- `npm run smoke:shopier:read -- --confirm-read-only`

## Rules For Future Agents

- Do not add package scripts that run these soak files by default.
- Do not add these soak files to `test:safe` or `validate`.
- Do not rename them into a `smoke:*` path unless they are rewritten to be read-only, confirmation-gated, and covered by `test:runtime-smokes`.
- If a historical soak is replaced by a safe local test or runtime smoke, record the replacement in this file, `project-control/TASK_QUEUE.md`, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`.
