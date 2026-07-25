# TASK_QUEUE.md — Uygunayakkabi / Mentix
_Consolidated: 2026-03-23 — Steps 1–20 complete, Shopier live_

---

## 2026-07-18 Current Local Addendum

- D-491 order-to-lead relationship schema governance is local code/docs work, not deployed. Missing `orders.related_inquiry_id` schema blocks manual conversion before an order, lead-status, or audit write; Telegram points only to the confirmation-gated read-only relationship preflight. The apply helper is dry-run-first, adds only an absent nullable relationship after separate approval, and refuses incompatible existing schema for manual review. Focused test and dry run pass; no database preflight, DDL, Telegram, provider, Shopier, deployment, or commit action occurred.

- D-490 lead-status enum schema governance is local code/docs work, not deployed. A deployed CustomerInquiries enum drift now leaves the lead unchanged and creates no audit event; Telegram points only to the confirmation-gated read-only enum preflight rather than executable DDL. The apply helper is dry-run-first and remains separately approval-gated. `test:lead-status-schema`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally; no database preflight, DDL, Telegram, provider, Shopier, deployment, or commit action occurred.

- D-489 confirmation-wizard schema governance is local code/docs work, not deployed. Ordinary Telegram confirmation no longer creates `wizard_sessions` or alters a PostgreSQL enum. The session table is a pre-provisioned deployment dependency; missing-table handling logs remediation rather than issuing DDL. The confirmation-gated metadata check and dry-run-first apply helper remain unrun against the configured database pending separate approval.

- D-463 Mentix skill runtime-truth reconciliation is local code/docs work, validated locally, and not deployed. Repo-side skills, activation configuration, dashboard, installation matrix, and optional sync notes now name Hermes/Mentix as current; OpenClaw is optional/history and must be verified before any reactivation action. Product-flow is read-only, upload/research is draft-only, backend work advisory, and durable memory is PII-light project control knowledge only. Mentix/VPS, source/release/PR, retired-channel, n8n, ops, typecheck, lint, `git diff --check`, and full `npm run validate` passed with 0 lint errors / 71 warnings. No VPS, Telegram, provider, Shopier, dispatch, n8n, commit, PR, deploy, SupplierScout, retired-channel, or ad action occurred.

- D-462 BlogPosts featured-image schema drift repair was applied to the configured database on 2026-07-24. The additive migration created the declared `BlogPosts.featuredImage -> media` relationship column, exact `ON DELETE SET NULL` foreign key, and supporting index; the post-apply read-only check passes and the following build has no blog-schema fallback warning. `db:blog-featured-image:apply` remains dry-run by default and requires explicit operator approval for a confirmed apply in another environment.

- D-461 control-truth Memory Lock reconciliation is local code/docs work, not deployed.
- Both session-start Memory Lock files now name Payload/Next as current execution, Hermes as current control, OpenClaw/n8n as optional, and SupplierScout as dormant; the obsolete default Telegram-to-OpenClaw-to-n8n pipeline is guarded against regression.
- D-461 validation passed locally: `npm run test:retired-channels`, `npm run test:n8n-optional`, `npm run test:mentix-skills`, source/release/PR/ops governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

- D-460 product-flow dispatch recovery paths are local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now show a deterministic recovery action beside every non-published active-channel dispatch row, keeping the recorded state and reason together with the correct guarded next step.
- D-460 validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, source/release/PR/ops governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

- D-459 product-flow dispatch summary is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now show active-channel published/queued/failed/blocked/not-configured/unrecorded dispatch counts before the full dispatch rows.
- D-459 validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, source/release/PR/ops governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-458 product-flow checklist summary is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now show done/next/blocked/needs-work checklist counts before the full staged checklist.
- D-458 validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-457 loading-plan focus details is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show reason details beside each focus-queue command for the D-455/D-456 bottleneck.
- D-457 validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-456 loading-plan focus queue is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show focus refs and matching safe read commands for the D-455 bottleneck.
- D-456 validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-455 loading-plan batch focus is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a deterministic focus kind, operator label, reason, and next safe read before product rows.
- D-455 validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-454 loading-plan batch summary is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show worklist candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first exact repo-side product-flow smoke command before product rows.
- D-454 validation passed locally: `npm run test:loading-plan`, runtime/source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-453 source-pack latest-boundary guardrail is local code/docs work, not deployed.
- `test:source-pack` now requires next-sprint source-pack notes to carry D-453 as the latest local boundary, retain `Operator Live Smoke Plan (D-389/D-452)` as the actual smoke-plan title boundary, describe the D-380-D-406 plus D-422-D-453 release/PR stack, and reject stale current-D-449 or D-422-D-451 stack wording.
- D-453 validation passed locally: `npm run test:source-pack`, release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-452 ad-readiness storefront trust hint is local code/docs work, not deployed.
- `/adready` now shows `npm run test:storefront-trust` for review/ready products before `/adpack` and `/adreport`, while blocked products still point to `/productflow` and `/imageplan` diagnostics first.
- `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-452)` so the operator-facing checklist reflects the latest local handoff boundary.
- D-452 validation passed locally: `npm run test:ad-readiness`, `npm run test:operator-smoke-plan`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-451 PDP conversion trust guardrail is local code/docs work, not deployed.
- `test:storefront-trust` now also checks the public product detail page so draft hiding, gallery, variant-backed size/stock clarity, lead form context, WhatsApp CTA, Shopier CTA, FAQ fallback, and safe similar-products gating stay present before paid-traffic readiness.
- D-451 validation passed locally: `npm run test:storefront-trust`. Full source/release/PR/typecheck/lint/validate checks are next.
- D-450 retired-channel memory-lock guardrail is local code/docs work, not deployed.
- `test:retired-channels` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md` so active channels stay Website/Instagram/Facebook/X/Shopier and Dolap/Threads stay retired in session-start handoffs.
- D-450 validation passed locally: `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-449 smoke-plan latest-boundary label is local code/docs work, not deployed.
- `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-449)` so the operator-facing checklist reflects D-448 ad-readiness guidance and the latest local handoff boundary.
- D-449 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-448 ad-readiness next-action hints is local code/docs work, not deployed.
- `/adready` now shows safe next reads based on readiness state: `/productflow`, `/imageplan`, `/adpack <ref> manual_ads`, and `/adreport week`.
- D-448 validation passed locally: `npm run test:ad-readiness`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-447 funnel snapshot next-action hints is local code/docs work, not deployed.
- `/funnel` now shows safe next reads for lead-source/order/UTM evidence: `/leadplan`, `/orders`, and `/adreport week`.
- D-447 validation passed locally: `npm run test:funnel-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-446 business snapshot next-action hints is local code/docs work, not deployed.
- `/business` now shows safe next reads for urgency counts: `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock`.
- D-446 validation passed locally: `npm run test:business-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-445 order desk operator links is local code/docs work, not deployed.
- `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now show order-admin links, related product-admin and lead-admin links, and public-status-only PDP links.
- D-445 validation passed locally: `npm run test:order-desk`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-444 lead desk operator links is local code/docs work, not deployed.
- `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now show lead-admin links, related product-admin links, and public-status-only PDP links.
- D-444 validation passed locally: `npm run test:lead-desk`, `npm run test:lead-followup-plan`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-443 operator inbox product links is local code/docs work, not deployed.
- `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows now show Payload admin links plus public-status-only PDP links.
- D-443 validation passed locally: `npm run test:operator-inbox`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-442 lead follow-up operator links is local code/docs work, not deployed.
- `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` now show lead-admin links, related product-admin links, and public-status-only PDP links.
- D-442 validation passed locally: `npm run test:lead-followup-plan`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-441 Shopier preview credential holds is local code/docs work, not deployed.
- `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview rows now show whether `SHOPIER_PAT` is configured before confirm commands.
- Missing credentials keep preview available; configured credentials still tell the operator to verify webhook/account/quota outside chat before confirm.
- Guardrails: no secret print, direct Shopier call, provider call, publish, dispatch, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-441 validation passed locally: `npm run test:shopier-publish-control`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-440 Shopier preview/dashboard operator links is local code/docs work, not deployed.
- `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status.
- Confirmed queue/retry output stays free of preview-only link lines.
- Guardrails: no direct Shopier call, provider call, publish, dispatch, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-440 validation passed locally: `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-439 loading-plan worklist operator links is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status.
- Guardrails: no product write, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-439 validation passed locally: `npm run test:loading-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-438 Product Flow Snapshot operator links is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status.
- Guardrails: no product write, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-438 validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-437 operator smoke-plan Telegram access preflight is local code/docs work, not deployed.
- `/smokeplan` now runs `npm run test:telegram-access` after `smoke:load-plan:read` and before the first Telegram `/loadplan` read, keeping private Telegram DM allowlist behavior visible before live Telegram operator reads.
- Guardrails: no product write, lead/order mutation, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-437 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:telegram-access`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-436 operator smoke-plan sitemap preflight is local code/docs work, not deployed.
- `/smokeplan` now runs `npm run test:sitemap-entries` after attribution and before manual ad-readiness checks, keeping static route, website-visible product, and blog sitemap/degrade-safe checks in the paid-traffic preflight sequence.
- Guardrails: no product write, lead/order mutation, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-436 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:sitemap-entries`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## 2026-07-12 Current Local Addendum

- D-435 operator smoke-plan attribution preflight is local code/docs work, not deployed.
- `/smokeplan` now runs `npm run test:attribution` after inquiry guard and before manual ad-readiness checks, keeping first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge checks in the paid-traffic preflight sequence.
- D-434 operator smoke-plan inquiry guard preflight is local code/docs work, not deployed.
- `/smokeplan` now runs `npm run test:inquiry-guard` after storefront trust and before manual ad-readiness checks, keeping honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback checks in the paid-traffic preflight sequence.
- D-433 operator smoke-plan storefront trust preflight is local code/docs work, not deployed.
- `/smokeplan` now runs `npm run test:storefront-trust` after lead visibility and before manual ad-readiness checks, keeping fake-review and placeholder-testimonial guardrails in the paid-traffic preflight sequence.
- D-432 operator smoke-plan manual ad preflight alignment is local code/docs work, not deployed.
- `/smokeplan` now runs `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` after lead visibility and before Shopier queue preflights, without launching ads.
- D-431 operator smoke-plan Shopier credential hold is local code/docs work, not deployed.
- `/smokeplan` now includes a dedicated hold after Shopier row product-flow handoffs and before final queue approval, telling operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action.
- D-430 operator smoke-plan Shopier handoff alignment is local code/docs work, not deployed.
- `/smokeplan` now includes a dedicated operator hold after Shopier preview reads, telling operators to use row-provided `/productflow <ref>` plus exact repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
- D-429 Shopier preview product-flow handoff is local code/docs work, not deployed.
- `/shopier publish-ready` and `/shopier retry-errors` previews now show `/productflow <ref>` plus exact repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight commands before confirm. `SHOPIER_PAT` is required for confirm queueing/retry, not read-only preview.
- D-428 Shopier dashboard product-flow handoff is local code/docs work, not deployed.
- `/shopier dashboard` and `smoke:shopier:read` batch review rows now show the existing next action plus Telegram `/productflow <ref>` and exact repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight commands before Shopier queue decisions.
- D-427 load-plan runtime product-flow handoff is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show both Telegram `/productflow <ref>` and exact repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight commands.
- D-426 operator smoke-plan load-plan handoff alignment is local code/docs work, not deployed.
- `/smokeplan` now runs the worklist-selected `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` checks immediately after repo/Telegram `/loadplan`, before provider diagnostics.
- D-425 load-plan product-flow handoff is local code/docs work, not deployed.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show `/productflow <ref>` beside each first product worklist suggested action.
- D-424 product-flow primary operator step is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now show one primary operator step derived from the ordered checklist before the full checklist.
- D-423 product-flow checklist dependency ordering is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now keep operator checklist commands in workflow order: confirm before content, and content trigger/retry before audit.
- D-422 product-flow operator checklist is local code/docs work, not deployed.
- `/productflow`, `/flow`, and `smoke:product-flow:read` now include a read-only checklist for Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant.
- Guardrails: no product write, lead/order mutation, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, commit, branch, push, or PR.
- D-434 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:inquiry-guard`, source/release/PR checks, typecheck, lint with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-433 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-432 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-431 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-430 validation passed locally: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.
- D-429 validation passed locally: `npm run test:shopier-publish-control`, `npm run test:shopier-commands`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## 2026-07-11 Current Local Addendum

- Hermes current control layer reconciliation is local docs/governance work, validated locally, not deployed.
- Current truth: Hermes is the current agent-control layer; Mentix/Uygunops is the Telegram-facing operator identity/interface; Payload/Next remains source of truth/execution; OpenClaw is historical/optional unless explicitly reactivated.
- `test:openclaw-vps-verification` remains standalone for optional OpenClaw reactivation review, not normal `test:safe` while Hermes is current.
- Guardrails: no runtime commerce/image/ads code, provider call, Shopier call, live Telegram/OpenClaw action, deploy, commit/PR, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed locally: source-pack, Mentix skill, standalone optional OpenClaw verification, release/PR, ops governance, typecheck, lint with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## 2026-07-06 Current Local Addendum

- D-406 Shopier runtime-smoke batch review alignment is local code, not deployed.
- `smoke:shopier:read` now passes `buildShopierDashboardReviewRows()` output into `formatShopierOperatorDashboard()`, matching Telegram `/shopier dashboard` batch review rows.
- Guardrails: no product write, Shopier job queue, Shopier API call, provider call, external dispatch, SupplierScout activation, retired-channel activation, ad spend, or schema push.
- D-406 validation passed locally: runtime-smoke governance, source-pack, release/PR/ops governance, typecheck, lint with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.
- D-405 image-plan runtime smoke is local code, not deployed.
- `smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` now mirrors Telegram `/imageplan` against one real Payload product plus recent `image-generation-jobs`.
- `/smokeplan` runs the repo-side image-plan smoke before Telegram `/imageplan <id-or-sn>`.
- Guardrails: explicit READ_ONLY confirmation, `PAYLOAD_DB_PUSH=false`, no product write, image-generation queue, provider call, publish, dispatch, Shopier call, SupplierScout activation, retired-channel activation, ad spend, or schema push.
- D-405 validation passed locally: no-connect help, runtime-smoke governance, operator-smoke-plan, release/PR/source-pack/ops governance, typecheck, lint with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.
- D-404 image regeneration plan is local code, not deployed.
- `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>` now read product Image QC plus recent image-generation job state and suggest safe manual next commands.
- `/smokeplan` includes `/imageplan <id-or-sn>` after `/productflow`.
- Guardrails: no product write, image-generation queue, provider/Gemini call, publish, dispatch, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- `test:image-regeneration-plan`, `test:operator-smoke-plan`, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-05 Previous Local Addendum

- D-403 provider reality audit is local code, not deployed.
- `project-control/PROVIDER_REALITY_AUDIT.md` documents that local env readiness is not production provider readiness for channel providers, Product Intelligence/GEO providers, reverse-search selection, and n8n fallback webhooks.
- Guardrails: no env load, secret print, provider call, credit spend, queue write, publish, live Telegram action, Shopier action, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- `test:provider-reality`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, Product Intelligence provider-health, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- D-402 historical soak-script quarantine is local code, not deployed.
- `project-control/HISTORICAL_SOAK_SCRIPTS.md` documents old `scripts/d*-soak*.ts` files as historical live-data soak harnesses, not validation and not read-only runtime smokes.
- Guardrails: no soak run, live data connection, write, provider call, Shopier call, queue write, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- `test:soak-scripts`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- D-401 OpenClaw VPS verification guardrail is local code, not deployed or synced to VPS.
- `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` now defines the read-only evidence checklist before any OpenClaw skill copy, restart, or live prompt.
- `mentix-skills/INSTALLATION_MATRIX.md` now marks VPS skill state as `VERIFY ON VPS` unless current evidence exists.
- Guardrails: no VPS command, sync, restart, live Telegram/OpenClaw prompt, provider call, Shopier call, queue write, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- `test:openclaw-vps-verification`, `test:mentix-skills`, release/PR/source-pack/ops/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- D-400 Shopier dashboard batch review sample is local code, not deployed.
- `/shopier dashboard` now includes read-only ready/blocked/queued/synced sample rows with product ref, detail/blocker, and suggested manual command.
- Guardrails: no publish, Shopier queue, Shopier API call, provider call, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- `test:shopier-publish-control`, release/PR/source-pack/ops/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- D-399 loading-plan first product worklist is local code, not deployed.
- `/loadplan` and `smoke:load-plan:read` now show a first product worklist with product ref, title, priority, reasons, and suggested manual command.
- Guardrails: read-only planning only; no product writes, publish, Shopier queue, provider call, SupplierScout activation, retired-channel activation, or ad spend.
- Focused `test:loading-plan`, release/PR/source-pack/ops/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- D-398 local PR review package is local doc/governance, not deployed.
- `project-control/LOCAL_PR_REVIEW_PACKAGE.md` prepares the D-380-D-404 stack for human review with proposed PR title, scope summary, reviewer focus, validation commands, and not-run/not-done guardrails.
- `test:local-pr-review` was added and included in `test:safe`.
- Focused PR-review governance, release-candidate governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- Guardrails: no commit, branch, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- D-397 local release candidate boundary is local doc/governance, not deployed.
- `project-control/LOCAL_RELEASE_CANDIDATE.md` records the D-380-D-404 stack as not committed and not deployed.
- `test:local-release-candidate` was added and included in `test:safe` so the handoff manifest, source-pack count, active-channel rules, SupplierScout dormancy, and operator approval guardrails stay checked.
- Focused release-candidate governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- Guardrails: no commit, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- D-396 smokeplan lead-followup alignment is local code, validated, not deployed.
- `/smokeplan` now puts `smoke:lead-followup:read` before Telegram `/leadplan`, then continues to Shopier preflights.
- Guardrails: sequence-only/read-only guidance; no live Telegram run, no lead writes, no customer messages, no queueing, no provider/Shopier calls, no SupplierScout activation, no retired-channel activation, and no ad spend.
- `test:operator-smoke-plan`, source-pack governance, retired-channel governance, runtime-smoke governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally.
- D-395 lead-followup runtime smoke is local code, validated, not deployed.
- `smoke:lead-followup:read` mirrors `/leadplan` and `/followupplan` against real Payload leads after `--confirm-read-only`.
- Guardrails: PII-light terminal output, no lead writes, no customer messages, no provider calls, no Shopier calls, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push.
- No-connect help, runtime-smoke governance, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally.
- D-394 lead follow-up plan is local code, validated, not deployed.
- `/leadplan` and `/followupplan` read open Payload leads and suggest existing manual lead commands only.
- `npm run test:lead-followup-plan` is included in `test:safe`.
- Guardrails: no lead status write, no customer message, no ad action, no provider call, no Shopier call, no SupplierScout activation, and no retired-channel activation.
- Focused `test:lead-followup-plan`, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally.

---

## ⚠️ Active Blockers

### Blocker 0: push:true reliability — ONGOING RISK ⚠️
`push: true` on Neon serverless cannot reliably complete multi-table migrations.
**Critical:** `push: true` does NOT run in production (`NODE_ENV=production` guard).
Before adding any new collection or global: manually verify the new table exists in Neon after first deployment.

### Blocker 1: Instagram Token Expiry — ACTION NEEDED by 2026-05-20
Long-lived token expires ~2026-05-20. No automatic refresh mechanism.
Manual refresh: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`
**Decision needed:** implement n8n scheduled refresh, or switch to System User token (no expiry)?

---

## ✅ COMPLETED — Phase 1 (Core Admin + Storefront)
All Phase 1 items validated in production 2026-03-13. Full list in source TASK_QUEUE.md.

---

## ✅ COMPLETED — Phase 2A Steps 1–15 (Automation Backbone)

| Step | What | Validated |
|------|------|-----------|
| 1 | Security rotation (tokens, API keys) | ✅ 2026-03-15 |
| 2 | Docker network persistence (gateway → web) | ✅ 2026-03-15 |
| 3 | Telegram group allowlist + mention-only | ✅ 2026-03-15 |
| 4 | OpenClaw → n8n intake webhook | ✅ 2026-03-15 |
| 5 | n8n → Payload draft product creation | ✅ 2026-03-15 |
| 6 | Media pipeline (Telegram → Payload → Vercel Blob) | ✅ 2026-03-15 |
| 7 | Duplicate protection (chatId+messageId idempotency) | ✅ 2026-03-15 |
| 8 | Admin review UI (ReviewPanel, SourceBadge, StatusCell) | ✅ 2026-03-15 |
| 9 | Inventory baseline (stockQuantity, variant color, SKU) | ✅ 2026-03-15 |
| 10 | Publish guard (price validation, draft 404) | ✅ 2026-03-15 |
| 11 | Caption parser enhancement (TR/EN, confidence, warnings) | ✅ 2026-03-16 |
| 12 | Automation settings / global toggle layer | ✅ 2026-03-16 |
| 13 | Channel adapter scaffolding (channelDispatch.ts) | ✅ 2026-03-16 |
| 14 | Channel workflow stubs + admin dispatch visibility | ✅ 2026-03-16 |
| 15 | E2E verification pass + media URL hardening | ✅ 2026-03-16 |

---

## ✅ COMPLETED — Phase 2B Channel Integrations (Steps 16–20)

| Step | What | Validated |
|------|------|-----------|
| 16 | Instagram real n8n workflow (Graph API v21.0) | ✅ 2026-03-18 |
| 17 | Instagram token exchange + OAuth hardening | ✅ 2026-03-22 |
| 18 | Instagram direct publish (bypasses n8n) | ✅ 2026-03-22 |
| 19 | Facebook direct publish (Graph API) | ✅ 2026-03-22 |
| 20 | Shopier integration (REST API v1, jobs queue, webhooks) | ✅ 2026-03-23 |

### Social Media Channel Scaffolds (code complete, not yet live):
- [x] X (Twitter) — scaffold + OAuth callback + n8n stub
- [x] Facebook Page — scaffold + n8n stub (real publish via Step 19)
- [x] Threads — scaffold + n8n stub

---

## 🔜 IMMEDIATE — Step 21: Shopier Order Fulfillment

### Step 21 — Shopier Order → Payload Order Flow (NEXT PRIORITY)
1. [ ] Parse `order.created` webhook body → create `Order` document in Payload CMS
2. [ ] Decrement `products.stockQuantity` for each ordered item
3. [ ] Send Telegram notification with customer name, items, and total
4. [x] Handle `order.fulfilled` via shared order lifecycle helper (`shopier_webhook` source)
5. [x] Handle `refund.requested` / `refund.updated` → update order + optional Telegram alert (`refund.requested` is idempotent before stock restore; `refund.updated` is local note/audit only)

### Mentix — Real Ops Tests (ongoing)
1. [ ] Product intake test — photo + caption + `@Mentix bunu ürüne çevir` → verify full pipeline
2. [ ] Debug test — `@Mentix bu ürünün veri akışını debug et` → verify product-flow-debugger
3. [ ] Add `DATABASE_URI` to OpenClaw Docker env (needed for sql-toolkit)
4. [ ] Add `GITHUB_TOKEN` to OpenClaw Docker env (needed for github-workflow)

---

## ⏭️ NEXT — Remaining Phase 2B

### Instagram Carousel Posts
- [ ] Multi-image products → `media_type=CAROUSEL` + children array
- [ ] Extend `publishInstagramDirectly()` in channelDispatch.ts

### X (Twitter) — Real Integration
- [ ] X API v2 POST /2/tweets + OAuth 2.0 PKCE token exchange
- [ ] Token refresh automation (tokens expire ~2hr, refresh valid 6mo)

### Threads — Real Integration
- [ ] Threads API /{user_id}/threads + publish
- [ ] Reuses Meta App credentials

### Dolap — Research Required
- [ ] No public API found yet — research needed before committing
- [ ] Stub workflow exists: `n8n-workflows/stubs/channel-dolap.json`

---

## 📅 LATER — Phase 2C: Content Growth Layer

### AI SEO Blog Engine
- [x] BlogPosts collection scaffolded (2026-03-15)
- [ ] n8n workflow: active product + generateBlog flag → AI prompt → BlogPosts
- [ ] Blog post template: product-centered, natural language, Turkish
- [ ] Duplicate prevention: check if blog exists for product
- [ ] `autoGenerateBlog` / `autoPublishBlog` toggles

### Blog Frontend
- [ ] `/blog` listing page
- [ ] `/blog/[slug]` detail page
- [ ] SEO meta tags from BlogPosts fields
- [ ] Internal linking to product pages

---

## 📅 FUTURE — Phase 3: Visual & Experience

### Visual Expansion Engine
- [ ] 2–4 AI-generated additional product angles
- [ ] Prompt library: `/ai-knowledge/prompts/product-visuals/`
- [ ] Per-family angle prompts (shoes, wallets, bags)
- [ ] Media type tracking: original / enhanced / generated_angle

### Photo-Based AI Try-On
- [ ] "Kendi fotoğrafında dene" button on product pages
- [ ] Upload validation, AI try-on, result gallery
- [ ] Privacy: auto-delete user photos after processing
- [ ] Provider selection needed (external VTO vs custom)

---

## 📅 FUTURE — Mentix Skill Stack Expansion

**Level A (active from day 1):** skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma, product-flow-debugger
**Level B (controlled activation):** eachlabs-image-edit, upload-post, research-cog, senior-backend
**Level C (observe-only):** learning-engine

### VPS Operator Actions (pending):
- [ ] Deploy 12 skill files to VPS
- [ ] Deploy mentix-memory/ system
- [ ] Configure OpenClaw env vars (DATABASE_URI, GITHUB_TOKEN)
- [ ] Test Level A skills individually via Telegram

---

## 🔧 CLEANUP (non-blocking)
- [ ] Add favicon.ico
- [ ] Re-implement admin dark mode without `!important` overrides
- [ ] Switch `push: true` to Payload migrations
- [ ] Update `ai-knowledge/automation/vps-infrastructure.md` — Docker network fix listed as unresolved but is done
- [ ] Remove or update static products array from UygunApp.jsx
## 2026-07-03 D-390 Current Local Queue Addendum

- D-390 Mentix/OpenClaw live-smoke alignment is local code, not deployed or synced to VPS.
- Repo-side `mentix-intake` and `product-flow-debugger` now route live-smoke planning toward Telegram `/smokeplan` first.
- OpenClaw deployment sync now requires `npm run test:operator-smoke-plan`.
- The skill dashboard now treats n8n as optional glue, not the default product creation path.
- Full local validation passed: `test:mentix-skills`, `test:operator-smoke-plan`, and `npm run validate` completed locally. Lint reported 0 errors and 70 existing warnings.

## 2026-07-04 D-391 Current Local Queue Addendum

- D-391 Shopier refund update traceability is local code, not deployed.
- New helper/test: `src/lib/shopierRefundLifecycle.ts` and `src/lib/shopierRefundLifecycle.test.ts`.
- New validation: `npm run test:shopier-refund-lifecycle`, included in `test:safe`.
- Shopier `refund.updated` now records an idempotent order note and best-effort `order.refund_updated` BotEvent.
- It does not change order status, restore stock, call Shopier, dispatch channels, queue jobs, activate SupplierScout, revive retired channels, or spend on ads.
- Full local validation passed: `test:shopier-refund-lifecycle`, `test:shopier-order-stock`, `test:order-desk`, and `npm run validate` completed locally. Lint reported 0 errors and 70 existing warnings.

## 2026-07-04 D-392 Current Local Queue Addendum

- D-392 Shopier refund-request idempotency is local code, not deployed.
- `refund.requested` now records an idempotent marker before stock restore.
- Duplicate or legacy-recorded refund requests return `shouldRestoreStock=false`, preventing duplicate stock restore.
- Focused checks passed: `test:shopier-refund-lifecycle`, `test:shopier-order-stock`, `test:order-desk`, and `typecheck`.
- Full local validation passed: `npm run validate` completed locally with typecheck, lint (0 errors, 70 warnings), and `test:safe`.

## 2026-07-04 D-393 Current Local Queue Addendum

- D-393 operator smoke-plan Shopier webhook preflight is local code, not deployed.
- New `npm run test:shopier-webhook-local` combines local Shopier stock/refund webhook assertions.
- `/smokeplan` now places that local preflight before `smoke:shopier:read`.
- Full local validation passed: `npm run validate` completed locally with typecheck, lint (0 errors, 70 warnings), and `test:safe`.

## 2026-07-03 Current Local Queue Addendum

- D-389 operator live smoke plan is local code, not deployed.
- New Telegram command: `/smokeplan`.
- New validation: `npm run test:operator-smoke-plan`, included in `test:safe`.
- Purpose: show the safe read-only repo-smoke and Telegram-read order before any queueing, publishing, redispatch, provider calls, Shopier action, or ads.
- Local validation passed: `test:operator-smoke-plan`, `test:retired-channels`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
