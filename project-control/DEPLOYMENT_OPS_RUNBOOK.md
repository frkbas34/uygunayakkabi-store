# Deployment And Ops Runbook

Last updated: 2026-07-25

This is the current Phase 9 deploy, rollback, env, webhook, cron, job-runner, and PR workflow runbook for UygunAyakkabi.

For the daily product, catalog, Shopier-preview, lead, and manual-ad read-only
sequence, use `project-control/OPERATOR_RUNBOOK.md`. This deployment runbook
owns release, environment, schema, webhook, cron, and Git workflow approvals.

## Scope

Current product strategy:

- Own products only.
- Payload/Next is the source of truth for products, media, orders, leads, stock, bot events, AI jobs, publishing status, and job queues.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- n8n is optional glue only; it is not the project brain or a required deploy dependency.
- Shopier remains the checkout/sales bridge; website-native checkout is deferred.

Do not deploy, register, cron, or operate Dolap, Threads, or SupplierScout unless the operator explicitly reverses the current decision.

## Pre-Deploy Validation

Run the local checks before a deploy is considered ready:

```powershell
npm run typecheck
npm run lint
npm run validate
```

`npm run validate` must give a real signal. Lint warnings are currently acceptable; lint errors or failed assertions are not.

The safe suite includes current governance checks:

- `npm run test:source-pack`
- `npm run test:retired-channels`
- `npm run test:n8n-optional`
- `npm run test:ops-runbook`
- `npm run test:local-release-candidate`
- `npm run test:local-pr-review`
- `npm run test:runtime-smokes`
- `npm run test:lead-status-schema`
- `npm run test:lead-conversion-schema`
- `npm run test:soak-scripts`
- `npm run test:provider-reality`
- `npm run test:supplierscout-dormant`
- `npm run test:mentix-skills`
- `npm run test:product-flow-snapshot`
- `npm run test:product-storefront-images`
- `npm run test:product-structured-data`
- `npm run test:structured-data`
- `npm run test:blog-structured-data`
- `npm run test:operator-smoke-plan`
- `npm run test:image-qc-remediation-plan`
- `npm run test:image-regeneration-plan`

`npm run test:openclaw-vps-verification` is a standalone optional OpenClaw
reactivation check, not part of the normal `test:safe` chain while Hermes/Mentix
is current. D-488 also proves that bare and partially confirmed
`scripts/vps-deploy.sh` calls stop before a VPS write, skill copy, or restart.
After a separate reactivation decision and read-only VPS verification evidence,
the only script form that can reach legacy sync steps is:

```bash
bash scripts/vps-deploy.sh --reactivate-openclaw --confirm-vps-sync
```

Focused Shopier webhook stock/refund lifecycle check:

- `npm run test:shopier-webhook-local`
- `npm run test:payload-transaction`
- `npm run test:shopier-order-transaction`
- `npm run test:order-stock-transaction`
- `npm run test:shopier-order-stock`
- `npm run test:shopier-refund-lifecycle`

Focused order lifecycle check:

- `npm run test:order-desk`
- `npm run test:order-stock-transaction`

If the change touches source-pack truth, roadmap, bot ownership, channels, validation, or major milestones, update `chatgpt-project-sources/` in the same change and keep the folder at or below 20 Markdown documents. The current pack is at the limit, so update or merge an existing source file before adding another.

If the change adds, removes, or renames a read-only runtime smoke, update `project-control/RUNTIME_SMOKE_CHECKS.md`, this runbook, `AGENTS.md`, `CLAUDE.md`, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`; `npm run test:runtime-smokes` should catch inventory or guardrail drift.

If the change affects Product Flow Snapshot output, operator checklist/summary behavior, dispatch-summary or dispatch-recovery-path behavior, or `/productflow` handoff guidance, update `src/lib/productFlowSnapshot.test.ts`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `chatgpt-project-sources/06_PRODUCT_INTAKE_AND_OPERATOR_FLOW.md`, and `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`; `npm run test:product-flow-snapshot` should catch handoff drift.

If the change affects `/smokeplan` ordering or live-smoke sequencing, update `src/lib/operatorSmokePlan.test.ts`, `project-control/RUNTIME_SMOKE_CHECKS.md`, this runbook, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`; `npm run test:operator-smoke-plan` should catch unsafe or stale ordering.

If the change touches historical soak scripts, update `project-control/HISTORICAL_SOAK_SCRIPTS.md` and keep them out of default validation, package scripts, and read-only runtime smoke inventory; `npm run test:soak-scripts` should catch drift.

If the change touches provider readiness, provider env assumptions, AI/GEO provider claims, channel publishing credentials, or n8n fallback provider claims, update `project-control/PROVIDER_REALITY_AUDIT.md` and source-pack provider notes; `npm run test:provider-reality` should catch drift.

If the change affects the release/PR boundary, update `project-control/LOCAL_RELEASE_CANDIDATE.md`, `AGENTS.md`, `CLAUDE.md`, `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`, and `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`; `npm run test:local-release-candidate` should catch handoff drift.

If the change affects PR review scope, validation notes, or not-run/not-done claims, update `project-control/LOCAL_PR_REVIEW_PACKAGE.md`; `npm run test:local-pr-review` should catch review-package drift.

If the change affects OpenClaw skill sync, VPS assumptions, or Mentix deployment claims, update `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`, `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`, `mentix-skills/INSTALLATION_MATRIX.md`, `chatgpt-project-sources/04_BOTS_AND_AUTOMATIONS.md`, `chatgpt-project-sources/07_MENTIX_OPENCLAW_SKILLS.md`, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`; `npm run test:openclaw-vps-verification` should catch verification-first drift.

## Environment Review

Review env var names and presence without printing secret values.

Core app:

- `DATABASE_URI`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_SERVER_URL`
- `BLOB_READ_WRITE_TOKEN`

Telegram/operator:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

Automation and jobs:

- `AUTOMATION_SECRET`
- `CRON_SECRET`

AI/provider keys:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_VISION_API_KEY`
- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`
- `SERPAPI_API_KEY`
- `REVERSE_SEARCH_PROVIDER`
- Provider-specific optional keys only when the active feature needs them.

Provider reality rule: local env readiness is not production provider readiness. Use `project-control/PROVIDER_REALITY_AUDIT.md` before claiming Gemini, Google Vision, DataForSEO, SerpAPI, Meta, X, Shopier, or n8n fallback providers are production-ready.

Commerce and publishing:

- `SHOPIER_PAT`
- `SHOPIER_WEBHOOK_TOKEN`
- `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` for Meta OAuth.
- Payload AutomationSettings `instagramTokens.accessToken` and `instagramTokens.userId` after OAuth.
- `INSTAGRAM_PAGE_ID` for Facebook direct publishing; it is a deployment env value, not a Payload field.
- `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET` for direct X publishing.
- Optional `N8N_CHANNEL_*_WEBHOOK` values only if n8n fallback dispatch is intentionally used.

Dormant/retired guard:

- Do not add SupplierScout env vars as a deploy prerequisite while SupplierScout is dormant.
- Do not add Dolap or Threads env vars.
- If `SUPPLIER_SCOUT_ENABLED` exists, it must remain unset or false unless the operator explicitly reactivates SupplierScout.

## Database And Schema Changes

Payload schema changes must be understood before deploy. Do not rely on production auto-push.

The committed Image Slot Lineage V1 runtime is blocked until its seven nullable
columns are expanded and verified. The canonical zero-downtime plan is
`project-control/IMAGE_SLOT_LINEAGE_SCHEMA_MIGRATION_PLAN_V1.md`. Expand while
the old runtime is active, verify, deploy the new runtime, then verify again.
Do not backfill or drop columns during this rollout.

The corrected migration uses one transaction owner: `THE GUARDED APPLY PROCESS
OWNS THE TRANSACTION`. Current SQL SHA-256 is
`06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2`; the
superseded Attempt 1 hash is
`45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`.
The SQL file contains no transaction controls. The helper owns begin,
verification, commit, and failure rollback. Manual `psql` use must specify
`--single-transaction`; do not wrap the artifact in a second transaction model.

```powershell
npm run test:image-slot-lineage-schema
npm run test:image-slot-lineage-helper
npm run db:image-slot-lineage:apply -- --dry-run --print-sql
npm run db:image-slot-lineage:apply -- --apply --confirm-apply-image-slot-lineage-schema-v1
```

The apply helper does not connect in its default/dry-run mode. Confirm the
target, current provider-native backup, pre-migration schema fingerprint, and
operator approval before the confirmed form. The confirmed process requires
an explicit `IMAGE_SLOT_LINEAGE_DATABASE_URI`; it never falls back to
`DATABASE_URI`, and the two must not resolve to the same host/port/database.
Keep `PAYLOAD_DB_PUSH=false` in
Codex, CI, preview, production, read-only smokes, and the Payload process used
around migration operations. The configured default-on behavior is not an
approved production migration mechanism. If rollback is required, roll back
runtime first and retain the harmless nullable columns; column removal is a
later separately approved contract migration.

The disposable WSL PostgreSQL schema harness passed rollback, guarded apply,
exact schema checks, old/new compatibility, five-slot round trips, idempotency,
runtime-first rollback, strict task-database CONNECT isolation, and cleanup.
This is not full Payload application compatibility and did not touch production.

D-355 Image QC drift has a guarded repair helper:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

The default apply helper mode is dry-run only. Do not run confirmed apply mode without explicit operator approval.

D-462 BlogPosts featured-image drift has the same guarded pattern. A local build found `blog_posts.featured_image_id` missing even though `BlogPosts.featuredImage` is already declared against `media`; sitemap blog URLs safely fall back until this additive relationship is restored.

```powershell
npm run smoke:blog-schema:read -- --confirm-read-only
npm run db:blog-featured-image:apply
npm run db:blog-featured-image:apply -- --dry-run --print-sql
npm run db:blog-featured-image:apply -- --apply --confirm-apply-d462-blog-featured-image-schema
```

The schema smoke reads PostgreSQL metadata only and refuses mutation flags. The apply helper is dry-run by default and does not open a database connection until the separately confirmed apply mode is used. Do not run confirmed apply mode without explicit operator approval. After an approved apply, rerun the read-only check and `npm run build`.

D-489 removes request-time confirmation-wizard DDL. `public.wizard_sessions`
must be pre-provisioned through the same review process, never created by a
Telegram request:

```powershell
npm run smoke:wizard-sessions:schema -- --confirm-read-only
npm run db:wizard-sessions:apply -- --dry-run --print-sql
npm run db:wizard-sessions:apply -- --apply --confirm-apply-d489-wizard-sessions-schema
```

The schema smoke reads metadata only and refuses mutation flags. The apply
helper is dry-run by default, does not connect without the explicit confirmed
form, and creates only a missing `public.wizard_sessions` table. Do not run the
confirmed form without explicit operator approval; rerun the read-only check
before using a fresh environment for Telegram confirmation sessions.

D-490 removes raw enum-DDL instructions from Telegram lead-status failures.
The `customer_inquiries` status enum must include the declared lead statuses
before an operator can write them. Review it through the same explicit schema
workflow, never from chat:

```powershell
npm run smoke:lead-status-schema:read -- --confirm-read-only
npm run db:lead-status-enum:apply -- --dry-run --print-sql
npm run db:lead-status-enum:apply -- --apply --confirm-apply-d490-lead-status-enum
```

The metadata smoke is read-only and refuses mutation flags. The helper is
dry-run by default and opens no database connection until both explicit apply
flags are supplied. It refuses an absent or incompatible baseline enum instead
of creating one. Do not run the confirmed form without explicit operator
approval; rerun the read-only check before using lead-status actions after an
approved deploy.

D-491 makes the order-to-lead relationship an explicit deployment
prerequisite. Lead conversion will make no order, lead-status, or audit write
when `orders.related_inquiry_id` or its foreign key is missing. Review it only
through the approved schema workflow, never from chat:

```powershell
npm run smoke:lead-conversion-schema:read -- --confirm-read-only
npm run db:lead-conversion-schema:apply -- --dry-run --print-sql
npm run db:lead-conversion-schema:apply -- --apply --confirm-apply-d491-order-lead-relationship
```

The metadata smoke is read-only and refuses mutation flags. The helper is
dry-run by default and opens no database connection until both explicit apply
flags are supplied. It adds only an absent nullable relationship and refuses
an incompatible existing column or foreign key for manual review. Do not run
the confirmed form without explicit operator approval; rerun the read-only
check before using lead conversion after an approved deploy.

D-481 hardens inbound Shopier order idempotency. `shopierOrderId` is now a
unique application contract and duplicate-key create conflicts stop before the
stock decrement. After approved preflight and dry-run review, the backing
concurrent partial unique index was applied and post-apply verified on
2026-07-25. It protects non-empty Shopier IDs in the configured database; this
does not prove live Shopier webhook delivery.

```powershell
npm run smoke:shopier-order-id-schema:read -- --confirm-read-only
npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql
npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique
```

The read-only check inspects `information_schema`, `pg_indexes`, and duplicate
non-empty IDs only; it refuses mutation flags. The apply helper refuses to
connect or run DDL unless both apply flags are present, then rejects the index
apply if duplicate non-empty Shopier IDs exist. The approved D-481 apply used
SQL fingerprint `c79810ec7a084bfc`; its post-apply check passes and
`npm run test:shopier-webhook-local` passes. Do not run the confirmed form
again without a new explicit operator decision. Before any live webhook smoke,
use the passing local suite as a preflight and obtain separate approval.

D-482 keeps the local Shopier `order.created` core atomic: local Order create,
product/variant stock updates, and InventoryLog writes share one Payload adapter
transaction request. The handler fails closed before writes if no transaction
can start; a verified event that cannot complete returns `500` so Shopier can
retry. The generic Orders alert hook skips Shopier and the webhook alert runs
after commit. Run the local-only transaction and combined webhook checks before
any separately approved live webhook smoke:

```powershell
npm run test:payload-transaction
npm run test:shopier-order-transaction
npm run test:shopier-webhook-local
```

These commands do not connect to PostgreSQL or call Shopier. D-482 does not
apply or replace the D-481 unique index; the index is already applied and
read-only verified, while live delivery still needs a separate approved smoke.

After an approved D-355 apply:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only
npm run smoke:load-plan:read -- --confirm-read-only
npm run smoke:brand-safety:read -- --confirm-read-only
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:provider-health:read -- --confirm-read-only
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:ad-performance:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:lead-followup:read -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

Never run DDL, migrations, schema push, external dispatch, Shopier calls, or queue writes from a smoke command that is documented as read-only.

## Historical Soak Scripts

Old `scripts/d*-soak*.ts` files are quarantined as historical live-data soak harnesses. They are documented in `project-control/HISTORICAL_SOAK_SCRIPTS.md` and guarded by `npm run test:soak-scripts`.

They are not part of normal validation, not read-only runtime smokes, and not operator-safe default commands. Do not run them unless the operator explicitly approves a current live-data soak after reviewing the exact script in this worktree.

## Provider Reality Audit

Provider reality is documented in `project-control/PROVIDER_REALITY_AUDIT.md` and guarded by `npm run test:provider-reality`.

The audit exists because local provider-health checks only prove local diagnostic state. They do not prove production env values, account balance, quota, webhook reachability, provider permissions, OAuth validity, Shopier remote access, or actual content/search/image generation.

Before a provider or webhook proof, use the secret-safe `## Operator Evidence
Record` format in `project-control/PROVIDER_REALITY_AUDIT.md`. Record the
deployed revision, credential names (never values), selected direct/fallback
path, permission/quota result, approved probe, outcome, and next safe action
in `PROJECT_STATE.md` and `DEPLOYMENT_LOG.md`.

Do not print secret values, call providers, spend credits, queue jobs, publish products, dispatch channels, run live Telegram commands, activate SupplierScout, or revive retired channels from a provider audit without explicit operator approval.

## Webhook Health

Check webhooks after code changes that affect Telegram, Shopier, Geo/Product Intelligence, or optional n8n fallback routing.

Telegram/Mentix:

- Verify webhook URL points to the current deployment.
- Verify secret/header validation is configured.
- Check pending update count and last error.
- Run `npm run smoke:provider-health:read -- --confirm-read-only` before using `/diagnostics` as provider/credential evidence.
- Send an operator-safe command such as `/diagnostics` only when an operator is present.

Shopier:

- Verify `SHOPIER_WEBHOOK_TOKEN` is configured.
- D-480 rejects the webhook before JSON parsing or any order/stock/refund/Telegram side effect when that token is absent (`503`) or its raw-body HMAC signature is missing, malformed, or invalid (`401`). Keep any token value out of chat and source control.
- Check recent order webhook logs.
- Run `npm run test:shopier-webhook-security` after touching webhook authenticity logic.
- Run `npm run test:shopier-webhook-local` before any live Shopier webhook smoke.
- Run `npm run test:shopier-order-stock` before any live order/refund webhook smoke.
- Run `npm run test:shopier-refund-lifecycle` before any live refund webhook smoke. It covers `refund.requested` idempotency before stock restore plus `refund.updated` note/audit traceability.
- Use read-only smoke before relying on publish queue commands:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
```

- D-406 keeps `smoke:shopier:read` aligned with Telegram `/shopier dashboard` by including the same ready/blocked/queued/synced batch review sample rows. It remains read-only and must not queue jobs, call Shopier, dispatch channels, call providers, spend on ads, activate SupplierScout, activate retired channels, or push schema changes.

Geo/Product Intelligence:

- Keep outputs operator-controlled.
- Do not let AI content activate or publish a product without the product readiness and brand-safety gates.
- Run `npm run smoke:pi-provider-health:read -- --confirm-read-only` before relying on Product Intelligence, GEO content, or comparison automation provider readiness.
- Treat that smoke as local/env-only evidence. Production provider readiness still requires `project-control/PROVIDER_REALITY_AUDIT.md` evidence.

Catalog scale-up:

- Use Telegram `/smokeplan` as the operator checklist before live smoke steps. It is read-only guidance and must stop before queueing, publishing, redispatch, provider calls, Shopier API calls, or ads.
- `/smokeplan` starts with `smoke:load-plan:read`, Telegram access, and `smoke:brand-safety:read` before `/loadplan` and `/brandplan`; it then uses the selected `smoke:product-flow:read` plus Telegram `/productflow <id-or-sn>` before provider diagnostics, includes `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before `/imageplan <id-or-sn>`, then `npm run smoke:lead-followup:read -- --confirm-read-only` before live `/leadplan`, then `npm run test:shopier-webhook-local` before the Shopier runtime smoke, so repo-side catalog/product/image evidence, lead follow-up, and Shopier lifecycle assertions run before live Telegram/Shopier smoke.
- Use Telegram `/imageplan <sn-or-id>` or `/regenplan <sn-or-id>` before running live image regeneration from an Image QC REVIEW/FAIL state. These commands are read-only and must not queue image generation, call providers, publish, dispatch, call Shopier, or spend on ads.
- Run `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before relying on Telegram `/imageplan`; it reads one product and recent image-generation jobs but must not write, queue image generation, call providers, dispatch, call Shopier, spend on ads, activate SupplierScout, activate retired channels, or push schema changes.
- Run `npm run smoke:load-plan:read -- --confirm-read-only` before relying on `/loadplan` for daily catalog loading/fix priorities. D-454/D-457 make the smoke print the same batch summary, batch focus, focus queue, and focus details as `/loadplan`: candidate count, priority/blocker totals, first safe product-flow command, bottleneck label, reason, next safe read, focus refs, matching safe read commands, and reason details beside each focus-queue command.
- The command mirrors Telegram `/loadplan` and must not write products, publish, queue jobs, call providers, call Shopier, spend on ads, activate SupplierScout, activate retired channels, or push schema changes.
- Run `npm run smoke:brand-safety:read -- --confirm-read-only` before using `/brandplan` to resolve protected-brand backlog. It reads stored product text and prior provenance-review BotEvents, then prints severity, brands, matched fields, latest recorded decision, and safe product-flow handoffs; it must not rewrite text, change status, stop sale, activate, publish, redispatch, call providers or Shopier, spend on ads, activate SupplierScout, revive retired channels, or push schema changes.
- After reviewing the evidence, `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` is preview-first. Only the explicit `confirm` form records one `brand_safety.provenance_reviewed` BotEvent; a replay of the same Telegram delivery returns that existing record instead of creating another. It never edits the product, clears the protected-brand gate, publishes, dispatches, queues Shopier, or calls a provider. Do not run it in live Telegram without the operator present and an intentional provenance decision.

Storefront/manual ads:

- Ads remain deferred until catalog depth and image quality are strong.
- Run `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` before treating any product as ready for manual paid traffic.
- The command mirrors Telegram `/adready` and must not write, publish, queue jobs, call providers, call Shopier, spend on ads, or push schema changes.
- Run `npm run test:ad-launch-pack`, `npm run test:utm-builder`, and `npm run test:utm-command` before deploying `/adpack`, UTM vocabulary, direct `/utm` behavior, or manual ad copy-pack changes.
- Telegram `/adpack <sn-or-id> [campaign]` is read-only. It may prepare copy drafts and UTM links, but it must not create campaigns, posts, pixels, provider calls, Shopier calls, or ad spend.
- Run `npm run smoke:ad-performance:read -- --confirm-read-only` before relying on `/adreport` or Payload-based manual campaign performance numbers.
- The command mirrors Telegram `/adreport` and must not mutate leads/orders, publish, queue jobs, call providers, call Shopier, call external ad APIs, spend on ads, or push schema changes.

Orders/leads/funnel:

- Run `npm run test:order-desk` before deploying order lifecycle, `/ship`/`/deliver`/`/cancelorder`, or Shopier `order.fulfilled` behavior changes.
- Run `npm run smoke:business-funnel:read -- --confirm-read-only` before relying on `/business`, `/funnel`, lead source visibility, order counts, stock urgency, or basic funnel analytics.
- Use `--period=week` when source attribution or 7-day funnel visibility matters.
- The command must not mutate leads, orders, stock, products, jobs, channels, providers, Shopier, ads, or schema.
- Run `npm run smoke:lead-followup:read -- --confirm-read-only` before relying on `/leadplan` or `/followupplan` against live Payload data.
- The command must print a PII-light summary and must not mutate leads, message customers, queue jobs, dispatch channels, call providers, call Shopier, activate SupplierScout, activate retired channels, spend on ads, or push schema changes.

n8n:

- Treat n8n webhooks as optional fallback paths.
- Missing `N8N_CHANNEL_*_WEBHOOK` values should skip dispatch without throwing.
- Do not import or activate new n8n workflows as part of a normal app deploy.

SupplierScout:

- SupplierScout webhook registration must stay disabled while SupplierScout is dormant.
- Do not call `/api/supplier-scout?action=register_webhook` unless SupplierScout is explicitly reactivated.

## Cron And Job Runner Health

Before deploy:

- Confirm `CRON_SECRET` is present if Payload jobs are expected to run.
- Confirm Vercel cron or the chosen runner is configured for `/api/payload-jobs/run`.
- Confirm no SupplierScout cron is registered while SupplierScout is dormant.
- Confirm no retired Dolap or Threads jobs are registered.

After deploy:

- Check the latest job-runner response.
- Check failed Payload jobs.
- Check Shopier sync queue counts.
- Check image/AI job queues if the change touched AI images, GEO, or product intelligence.

## Deploy Sequence

1. Review code diff and ensure no secrets or raw chat archives are included.
2. Run `npm run validate`.
3. Run targeted read-only smoke checks if the change affects runtime behavior.
4. Confirm env var changes are documented without exposing values.
5. Confirm schema/DDL steps are documented and approved if needed.
6. Deploy through the normal hosting path.
7. Watch build logs until success or failure is clear.
8. Verify storefront loads.
9. Verify Payload admin loads.
10. Verify Telegram/operator health only with safe commands.

## Post-Deploy Smoke

Use read-only smoke first:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
npm run smoke:load-plan:read -- --confirm-read-only
npm run smoke:brand-safety:read -- --confirm-read-only
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:provider-health:read -- --confirm-read-only
npm run smoke:pi-provider-health:read -- --confirm-read-only
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:ad-performance:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:lead-followup:read -- --confirm-read-only
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

Then, with the operator present, run only the relevant manual checks:

- `/smokeplan`
- `/loadplan`
- `/productflow <id-or-sn>`
- `/diagnostics`
- `/pipeline <id>`
- `/catalogqa`
- `/categoryfill`
- `/adready <id-or-sn>`
- `/adpack <id-or-sn> [campaign]`
- `/adreport week`
- `/business`
- `/funnel`
- `/shopier dashboard`
- `/shopier publish-ready`
- `/shopier errors`
- `/shopier retry-errors`

Do not use confirm variants such as `/shopier publish-ready confirm` or `/shopier retry-errors confirm` unless the operator approves queueing.

## Rollback Sequence

1. Identify the last known good deployment or commit.
2. Record what failed: build, schema, webhook, job queue, dispatch, storefront, admin, or checkout.
3. Disable risky feature flags or optional env vars first when that stops the incident safely.
4. Redeploy the last known good version or revert the specific PR.
5. If schema changed, use the reviewed rollback SQL or documented manual repair. Do not improvise destructive SQL.
6. Re-run read-only smoke checks.
7. Log the incident and recovery in `project-control/DEPLOYMENT_LOG.md`.

## GitHub PR Workflow

For Codex/Claude changes:

- Work in small branches when possible.
- Keep the source pack synced when current truth changes.
- Run `npm run validate` before asking for review.
- Keep `project-control/LOCAL_RELEASE_CANDIDATE.md` current when a local stack is ready for commit/PR review.
- Keep `project-control/LOCAL_PR_REVIEW_PACKAGE.md` current when preparing review notes for Claude, Codex, or GitHub.
- Include validation output and known warnings in the PR notes.
- Mention any operator-only smoke checks that were not run.
- Do not stage, commit, push, or open a PR unless the operator asks for it.
- Do not merge while D-355 DB drift or another live DB blocker is unresolved unless the PR is explicitly documentation-only or validation-only.

## After Action

After each meaningful deploy or rollback:

- Update `project-control/DEPLOYMENT_LOG.md`.
- Update `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md` if validation/deploy rules changed.
- Update `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md` if a milestone or blocker changed.
- Leave retired channels retired, SupplierScout dormant, and n8n optional unless the operator explicitly changes strategy.
# D-499 Image QC Remediation Preflight

Before an operator performs any batch Image QC decision or manual image
generation, run `npm run smoke:image-qc-plan:read -- --confirm-read-only`.
It is a Payload read only: it classifies missing originals, QC failures/reviews,
and protected-brand rows, then points to `/imageplan` and `/productflow`.
It must not record QC, queue generation, call a provider or Shopier, publish,
dispatch, activate SupplierScout, revive retired channels, or spend.

For a protected-brand product, confirm `/productflow` and `/imageplan` lead
with preview-first `/brandreview <id-or-sn> needs-evidence` and withhold Image
QC, generation, activation, Shopier, redispatch, and ad action suggestions.
After a confirmed review, re-run both reads to verify the latest provenance
BotEvent changes the manual diagnostic but does not lift the hard safety gate.
