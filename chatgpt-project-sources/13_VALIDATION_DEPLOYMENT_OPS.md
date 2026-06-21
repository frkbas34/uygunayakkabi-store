# Validation, Deployment, And Ops

Last updated: 2026-06-21

## Current Validation Status

As of 2026-06-21, `npm run validate` passes. It runs TypeScript, ESLint, brand-safety assertions, product-lifecycle assertions, publish-readiness assertions, product-activation-guard assertions, and Publish Desk activation smoke assertions. Lint warnings remain (81 warnings in the latest run), but lint errors or failed assertions fail the command.

## Previous Validation Problem

The repo has existing validation noise:

- `npm run lint` uses `next lint`, which is invalid for the current Next version.
- TypeScript is blocked by stale generated files and old scripts.
- `sessions` and `tmp/next-build` can mislead type checks.
- Old soak scripts import stale absolute paths.

## Phase 1 Fixes

Added reliable scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run test:brand-safety`
- `npm run test:lifecycle`
- `npm run test:publish-readiness`
- `npm run test:activation-guard`
- `npm run test:publish-desk`
- `npm run test:safe`
- `npm run validate`

Excluded from validation:

- `sessions`
- `tmp`
- stale generated Next validator files
- broken historical soak scripts

## Deployment Checks

Before deploy:

- Typecheck/lint/validate pass or known exceptions are documented.
- Env var changes are listed.
- Payload schema changes are understood.
- Vercel cron changes are checked.
- Telegram webhooks are checked when bot code changes.
- Shopier job processing is checked when publishing changes.

## Webhook Health

Track:

- Telegram webhook URL
- pending update count
- last error
- secret/header status
- slow handler/read-timeout risk

## Rollback Needs

Maintain:

- deployment log
- last known good commit
- env var map
- manual rollback steps
