# Product Intake And Operator Flow

Last updated: 2026-07-12

## Target Flow

Telegram/admin upload -> Payload draft -> media attached -> confirmation wizard -> optional AI image/content -> operator approval -> publish.

## Intake Sources

- Payload admin
- Telegram bot
- Automation endpoint

## Product Draft Requirements

At minimum:

- Title
- Price
- Product photo
- Stock or sizes
- Category/product family when possible
- Channel targets
- Source metadata

## Review Requirements

Before publish:

- Price greater than zero
- Image exists
- Stock is valid
- Brand safety passes
- Content does not make risky claims
- Target channels are active and intentional

## Protected-Brand Remediation

`/brandplan [limit]` is the read-only queue for products that fail the protected-brand hard gate. It groups blockers by severity and brand, shows the matched stored fields, latest valid provenance-review audit record when present, gives a safe `/productflow <ref>` handoff, and shows Payload admin links plus a public PDP link only for public products. `npm run smoke:brand-safety:read -- --confirm-read-only` mirrors that queue against a bounded real Payload sample with `PAYLOAD_DB_PUSH=false`.

Neither surface rewrites product text, changes status, retires, activates, publishes, redispatches, queues jobs, calls providers or Shopier, spends on ads, activates SupplierScout, revives Dolap/Threads, or pushes schema. A brand term may be removed only after an operator verifies the product is genuinely an unbranded own product; otherwise it remains excluded from publication.

`/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` records that human review process. Without `confirm`, it only previews the exact decision and explains that product/gate state is unchanged. With explicit `confirm`, it creates one `brand_safety.provenance_reviewed` BotEvent only. The same Telegram delivery is idempotent: its opaque delivery key returns the original review if Telegram retries it, rather than creating a duplicate. It cannot change wording, clear the hard gate, activate, publish, dispatch, queue Shopier, or call any provider. Make a separately reviewed product edit only after genuine provenance evidence supports it.

## Current Activation Guard

As of 2026-06-21, `src/collections/Products.ts` uses `src/lib/productActivationGuard.ts` to block new active creates and new transitions into `status='active'` unless the product has:

- price greater than zero
- at least one product image or approved generated image
- effective stock greater than zero, using variant stock when variants exist
- at least one active target among website, Instagram, Shopier, X, Facebook
- brand-safety scan passing, including the `brand` field

New products now default to `draft`. On successful activation, the hook also normalizes workflow state to `workflowStatus='active'`, `sellable=true`, and non-sold-out stock state so the storefront/homepage do not silently hide the product. The guard does not block edits to products that are already active. It is meant to prevent hidden storefront activation failures while keeping existing live products editable.

Direct admin saves to `status='soldout'` now normalize workflow state in the same hook: `workflowStatus='soldout'`, `stockState='sold_out'`, and `sellable=false`. This makes the Payload admin path match Telegram/operator sold-out actions and prevents stale active workflow labels on sold-out products.

Code-level smoke coverage exists in `src/lib/productActivationGuard.test.ts` and `src/lib/publishDesk.test.ts`, and runs through `npm run validate`. It covers helper logic, actual `Products.beforeChange` hook behavior, direct sold-out admin-save normalization, and the Telegram/Publish Desk activation wrapper for readiness failures, Payload guard failures, idempotent active products, and successful activation events.

Read-only runtime activation diagnostics now exist in `scripts/activation-runtime-smoke.ts`, exposed as `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. The script forces `PAYLOAD_DB_PUSH=false`, reads one Payload product through a minimal read-only Payload config, and prints lifecycle, readiness, stock, active targets, activation blockers, and state-coherence issues. It performs no product update, dispatch, Shopier queue write, or schema push. Product `359` passed this check on 2026-06-23.

Read-only Product Flow Snapshot diagnostics now exist in `src/lib/productFlowSnapshot.ts`, Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>`, and runtime smoke `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`. The snapshot combines lifecycle, central readiness, Payload activation blockers, image QC, Shopier queue gate, active-channel dispatch state, summary, and row-level recovery paths, channel/coherence drift, a checklist summary, a primary operator step, an operator checklist, deterministic operator links, and next actions. D-422 adds the checklist so Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state appear in one read-only product handoff. D-423 makes the checklist command order dependency-aware: content and audit point back to `/confirm` until confirmation passes, audit points to `/content <ref> trigger` while content is pending, and audit points to `/content <ref> retry` when content failed. D-424 derives the single primary operator step from that checklist so the first next command/manual step appears before the full list. D-458 adds checklist-summary counts for done/next/blocked/needs-work states so operators can scan progress before reading every checklist row. D-459 adds dispatch-summary counts for active-channel published/queued/failed/blocked/not-configured/unrecorded states so operators can scan publishing health before reading every dispatch row. D-460 keeps each non-published dispatch state, reason, and deterministic recovery command together; the helper does not execute it. D-438 adds operator links: Payload admin when the product has an id, and public PDP only when the product has a slug plus public status, so draft products are not implied to be public. The runtime smoke accepts a Payload id or stock number, forces `PAYLOAD_DB_PUSH=false`, uses the same helper as Telegram, prints the same checklist summary, dispatch summary, per-row recovery paths, checklist, dispatch rows, and links, and performs no writes, jobs, dispatches, provider calls, Shopier calls, URL checks, or schema pushes.

Read-only Product Loading Plan diagnostics now exist in `src/lib/productLoadingPlan.ts`, Telegram `/loadplan [limit]`, and Telegram `/loadingplan [limit]`. Runtime preflight exists at `npm run smoke:load-plan:read -- --confirm-read-only`. The plan composes Catalog QA and Category Fill into prioritized daily loading/fix actions for catalog scale-up. D-425 adds `flowCommand` to first product worklist rows so `/loadplan`, `/loadingplan`, and the runtime smoke show `/productflow <ref>` beside the suggested action before manual follow-up. D-427 adds `runtimeFlowCommand` beside that flow command so the worklist also prints the exact repo preflight command, `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`. D-439 adds worklist operator links: Payload admin when the product has an id, and public PDP only when the product has a slug plus public status, so draft loading candidates are not implied to be public. It is visibility only: no product writes, no publish, no Shopier queue, no provider calls, no URL checks, no SupplierScout activation, no Dolap/Threads revival, and no ads.

Read-only Operator Live Smoke Plan guidance now exists in `src/lib/operatorSmokePlan.ts` and Telegram `/smokeplan`. It prints the safe order for repo read-only smokes and Telegram reads before any live operator queueing/publishing step: load plan, Telegram access check, worklist-selected product-flow check, image-plan read, provider diagnostics, business/funnel visibility, lead follow-up, storefront trust check, inquiry guard check, attribution check, sitemap check, manual ad readiness/performance reads, and Shopier dashboard/error/retry previews. D-437 keeps `npm run test:telegram-access` after the repo load-plan runtime smoke and before the first Telegram `/loadplan` read, so private Telegram DM allowlist behavior is checked before live Telegram operator reads. D-426 keeps the D-425 `/loadplan` worklist `/productflow <ref>` handoff before provider diagnostics. D-432 keeps `smoke:ad-readiness:read`, `/adready`, `smoke:ad-performance:read`, and `/adreport week` read-only and before Shopier queue preflights. D-433 keeps `npm run test:storefront-trust` before ad-readiness checks so fake-review and placeholder-testimonial guardrails are part of paid-traffic preflight. D-434 keeps `npm run test:inquiry-guard` after storefront trust and before ad-readiness checks so honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior are verified before paid-traffic readiness. D-435 keeps `npm run test:attribution` after inquiry guard and before ad-readiness checks so first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge behavior are verified before paid-traffic readiness. D-436 keeps `npm run test:sitemap-entries` after attribution and before ad-readiness checks so static route, website-visible product, and blog sitemap/degrade-safe behavior are verified before paid-traffic readiness. It does not read or write Payload directly and stops before queueing, publishing, redispatch, provider spend, Shopier API action, ad-platform API calls, campaign creation, or ad spend.

D-489 removes all request-time schema DDL from confirmation handling. The wizard
still reads and writes ephemeral session rows in pre-provisioned
`public.wizard_sessions` storage, but a missing table is now an explicit
deployment/schema-preflight issue rather than something a Telegram request may
create. `smoke:wizard-sessions:schema` is metadata-only; its guarded apply
helper is dry-run by default and requires separate operator approval.

D-443 updates the older `/inbox` product triage surface to match the newer operator-link pattern: product rows in `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` now include Payload admin links plus public PDP links only for public products. The inbox remains read-only.

A guarded reversible mutation smoke also exists in `scripts/activation-mutation-smoke.ts`, exposed as `npm run smoke:activation:mutate`. Existing-product mode uses `--product=<smoke-product-id> --confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`. Admin-direct temp mode adds `--admin-direct-update`. It is operator-run only and not part of `validate`. It refuses normal products, requires a `SMOKE`/`TEST` marker, requires `draft` status, requires website-only targets and no external channel flags, activates through either `approveAndActivateProduct()` or a plain Payload `status='active'` update, then rolls back the product snapshot and deletes smoke bot-events. Temp mode can create a website-only smoke draft from an existing media item, run the activation path, then delete the temp product. Product `359` correctly refused before mutation. On 2026-06-22, helper temp-smoke passed with product `363`, two smoke bot-events cleaned up, no external channel dispatch, and no Shopier queue. Admin-direct temp-smoke passed with product `364`, `workflowStatus=active`, `publishStatus=published`, no external dispatch, and no Shopier queue.

Operator-facing activation surfaces have been aligned with the guard. The Payload admin ReviewPanel now treats zero/missing stock, missing active channel target, and visible title/brand brand-safety hits as blockers. Its success message says Payload still runs the final guard. Telegram `/activate` and `/approvepublish` help text now says both central publish readiness and the Payload activation guard must pass.

Shopier operator queueing now has a D-356 guard too. `/shopier dashboard` is read-only and summarizes queue readiness, top blockers, error classes, and safe retry counts. `/shopier publish-ready` previews active Shopier-intent products and shows which are queueable or blocked. It does not write. `/shopier publish-ready confirm` queues only gate-passing products. Single `/shopier publish <sn-or-id>` and `/shopier republish <sn-or-id>` resolve the product and call `queueShopierSync()`, so the same gate writes `sourceMeta.shopierSyncStatus='queued'` and adds a `shopier-sync` job only when eligible. `test:shopier-commands` blocks direct Telegram route-level queue writes for those commands. The gate requires active website visibility, explicit Shopier target/flag alignment, category, generated-gallery media, Image QC PASS, sellable stock, brand-safety pass, central publish readiness, and no duplicate queued/syncing job. `/shopier errors` gives first-pass sync error triage and suggests the next operator action without retrying or mutating products. `/shopier retry-errors` is preview-only; `/shopier retry-errors confirm` queues only retryable error products that still pass the same gate. D-440 adds deterministic operator links to `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows: Payload admin when the product has an id, and public PDP only when the product has a slug plus public status. Confirmed queue/retry output stays free of preview-only links. D-441 adds preview-only credential holds to publish-ready/retry previews and the runtime smoke, showing whether `SHOPIER_PAT` is configured without printing secrets, keeping preview available when credentials are missing, and keeping confirmed queue/retry output free of preview-only credential hints. `npm run smoke:shopier:read -- --confirm-read-only` checks these previews against real Payload state without mutation.

Media readiness is shared across activation guard, central publish readiness, and the admin ReviewPanel. Empty placeholder image rows do not count as product visuals, so the panel no longer shows a false green when Payload activation would reject the product for missing real media.

Stock readiness is also shared across central publish readiness and the admin ReviewPanel through `src/lib/productStock.ts`. Populated variant stock takes precedence over product-level stock, unpopulated variant IDs fall back to `stockQuantity`, and `workflow.stockState='sold_out'` or `workflow.sellable=false` blocks the stock check even when quantity is positive. This prevents ReviewPanel from showing a stock false green that activation/readiness would reject.

The ReviewPanel ready/not-ready banner is now driven by central `evaluatePublishReadiness()` plus local field blockers/warnings. A draft with price, image, stock, and channel targets can no longer show as ready if confirmation, content, audit, brand safety, or any other central readiness dimension is still blocking.

Telegram `/pipeline` diagnostics now share the same media and stock definitions too. The visual stage ignores placeholder media rows and the stock stage reports effective stock from populated variants when available, while showing sold-out/not-sellable blockers from the shared stock summary.

The Payload admin ReviewPanel is no longer limited to automation-sourced products. Admin-created/manual products now show the same readiness checklist, lifecycle label, channel target check, brand-safety result, and activation-guard warning. This makes the admin upload path closer to the Telegram/operator path.

The admin source/dispatch metadata group now stays hidden for fresh manual drafts, but appears for active/sold-out manual products and any manual product with real dispatch, Shopier, or story metadata. That keeps first upload cleaner while preserving redispatch, dry-run preview, and publish diagnostics after activation.

Manual/admin saves now normalize product channel selection before activation. `channelTargets` and `channels.publish*` are synced to the same active channel set, so a selected Instagram/Facebook/X/Shopier target does not get silently blocked later by a stale publish flag. Telegram and confirmation-wizard paths already set both shapes; this brings admin saves closer to that shape.

State-coherence diagnostics now detect older channel drift as warnings: retired/unsupported targets, selected targets blocked by false publish flags, or true publish flags missing from `channelTargets`. Future saves normalize the shape; diagnostics make existing drift visible before activation or redispatch.

The `/repair` operator command now has direct code coverage in `src/lib/stateCoherence.test.ts`. The tested contract: preview is dry-run by default, confirmed repair updates only derived workflow fields (`workflowStatus`, `publishStatus`, `sellable`), archived products are skipped, confirmed repairs emit a `state.repaired` bot event, repeated confirmed repair is idempotent, and scan mode is read-only.

Lifecycle wording is canonicalized by `src/lib/productLifecycle.ts`: current Payload fields map to `draft`, `needs_review`, `ready_to_publish`, `active`, and `sold_out`. ReviewPanel shows this derived lifecycle label while keeping top-level `status` as the storefront visibility switch.

The content-generation pipeline re-fetches after audit and requires central `evaluatePublishReadiness()` before showing the operator a "Yayına Al" button. It no longer auto-activates ready products. GeoBot's activation button now uses the same shared `approveAndActivateProduct()` helper as `/activate`, `/approvepublish`, and Publish Desk, so operator approval is recorded and Payload's activation guard remains final.

Automation intake through n8n/API is also draft-first. Even when legacy auto-activate settings, confidence, and readiness all pass, `resolveProductStatus()` returns `draft` with an operator-approval reason. Legacy Telegram photo intake was also changed to create drafts instead of active products.

Central publish readiness is still 6 dimensions, but now stricter: visuals require shared usable media rows, sellable requires valid price plus shared stock-summary approval, publish targets must resolve to active channels only, and brand safety blocks the audit/safety dimension. ReviewPanel and `/pipeline` now use these shared definitions, reducing cases where `/publishready`, ReviewPanel, pipeline diagnostics, or Payload activation disagree.

Telegram caption intake can now parse all active channel targets: Website, Instagram, Shopier, X, and Facebook. `twitter` maps to X, `fb` maps to Facebook, and the legacy `Instagram: evet` shorthand maps to Website + Instagram. Dolap/Threads are ignored by parser tests and cannot become supported channel targets. The legacy photo+caption fallback now uses the same `resolveChannelTargets()` decision layer and sets all active channel flags from the effective target list instead of relying on the removed `postToInstagram` shape.

The Telegram confirmation wizard channel step now offers the same active target set, including X. Its normalizer drops Dolap/Threads and unknown targets from target checks, summaries, and confirmation updates, and the Telegram callback handler rejects invalid `wz_tgt:*` values before saving them to the wizard session. Covered by `npm run test:confirmation-wizard`.

## Operator Controls

Important controls:

- Confirm missing fields
- Generate/approve AI images
- Run GEO/content generation
- Audit readiness
- Activate product
- Redispatch one channel
- Mark sold out or restock

## Main Improvements Needed

- Continue making admin product creation smoother.
- Make Telegram intake and admin intake produce consistent product shape.
- Make product status names clearer.
- Reduce hidden failures in media attach and channel dispatch.
- Smoke test activation through the live Payload admin UI and live Telegram operator path on prepared products when an operator is ready.
