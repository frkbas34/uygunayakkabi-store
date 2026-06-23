# Open Questions And Next Sprint

Last updated: 2026-06-23

## Immediate Next Sprint

Current sprint status:

1. `AGENTS.md` added.
2. `CLAUDE.md` added.
3. Obsidian control notes added at repo root.
4. Validation scripts fixed.
5. Stale generated/session artifacts excluded from validation.
6. `npm run validate` passes with warnings and now includes brand-safety, product-media, product-stock, product-lifecycle, operator-readiness, source-pack governance, SupplierScout dormancy, Mentix/OpenClaw skill governance, admin-visibility, product-channel-normalization, publish-readiness, state-coherence repair, Telegram caption parsing, confirmation-wizard channel handling, channel-dispatch, dispatch-state, provider-health, redispatch, activation-guard, and Publish Desk activation assertions.
7. Product activation guard implemented: active creates and transitions into `status='active'` now require price, image, effective stock, active target, and brand-safety pass.
8. Code-level activation smoke test added at `src/lib/productActivationGuard.test.ts`, including actual `Products.beforeChange` hook behavior.
9. Product defaults changed to `draft`; content generation and automation intake no longer auto-activate. Ready products wait for explicit operator approval.
10. Admin ReviewPanel and Telegram activation help now explicitly describe the Payload activation guard instead of implying readiness alone is enough.
11. Product lifecycle vocabulary is now canonicalized in `src/lib/productLifecycle.ts` and surfaced in ReviewPanel without changing the Payload status schema.
12. Publish Desk activation smoke test added for readiness blocks, Payload guard blocks, idempotent active products, and successful activation events.
13. Central publish readiness tightened to include usable media, valid price, real stock, active channel targets only, and brand safety.
14. Per-channel dispatch state is now canonicalized in `src/lib/channelDispatchStatus.ts` and surfaced in ReviewPanel.
15. Channel dispatch eligibility now has direct tests proving Website is native, Dolap/Threads are not eligible, active external channels are limited to Instagram/Shopier/X/Facebook, and brand safety blocks dispatch.
16. Telegram redispatch is now tested for exact-one-channel behavior, other-channel note preservation, website refusal, inactive-product refusal, and Shopier queueing.
17. Read-only runtime activation smoke command added: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It reads one Payload product with `PAYLOAD_DB_PUSH=false` and reports readiness/stock/targets/blockers without writes.
18. Read-only runtime smoke verified on product `359`: readiness `6/6`, effective stock `10`, all active targets, no activation blockers, no coherence issues.
19. GeoBot `Yayına Al` activation now uses the same `approveAndActivateProduct()` helper as `/activate`, `/approvepublish`, and Publish Desk, with `sourceBot=geobot`.
20. Automation decision tests now prove n8n/API intake remains draft-first even when legacy auto-activate gates pass.
21. Guarded activation mutation smoke command added: `npm run smoke:activation:mutate`.
22. Mutation smoke usage and confirmation gates are verified; product `359` correctly refuses before mutation because it is a real active product with external targets.
23. Helper temp-smoke verified the runtime Telegram/Publish Desk activation path: product `363` was created as a website-only smoke draft, activated through `approveAndActivateProduct()`, verified active, restored, had `2` smoke bot-events deleted, and was deleted. No external channel dispatched and no Shopier job was queued.
24. Admin-direct temp-smoke verified direct Payload admin-save behavior: product `364` was created as a website-only smoke draft, activated through a plain Payload update, verified `status=active`, `workflowStatus=active`, `publishStatus=published`, restored, and deleted. No external channel dispatched and no Shopier job was queued.
25. Telegram caption parsing now recognizes all active channel targets, including X/Facebook aliases and legacy `Instagram: evet`; tests prove Dolap/Threads stay ignored.
26. Telegram legacy photo+caption fallback now uses `resolveChannelTargets()` and sets all active channel flags from the effective target list instead of the removed `postToInstagram` shape.
27. Automation-decision tests now prove all active channels pass when globally enabled, globally disabled active channels are reported as blocked, and retired/unknown channels are dropped.
28. Payload admin ReviewPanel now appears for admin/manual products too, so admin creation gets readiness, lifecycle, channel, brand-safety, and activation-guard visibility.
29. Admin/manual products now expose source/dispatch metadata after activation or when real dispatch/sync/story metadata exists, while fresh manual drafts keep that group hidden. Covered by `test:admin-visibility`.
30. Product channel selection now normalizes `channelTargets` and `channels.publish*` before activation, with shared helper coverage and direct `Products.beforeChange` hook coverage.
31. State-coherence diagnostics now detect channel drift on older records: unsupported targets, target selected while publish flag is false, or publish flag true while target is missing.
32. Direct Payload admin saves to `status='soldout'` now normalize workflow status, stock state, and sellable state, with direct `Products.beforeChange` hook coverage.
33. Media readiness now uses one shared usable-media helper across activation guard, central publish readiness, and ReviewPanel; empty placeholder rows do not count.
34. Stock readiness now uses one shared helper across central publish readiness and ReviewPanel; populated variants take precedence, unpopulated variant IDs fall back to `stockQuantity`, and sold-out/not-sellable workflow state blocks stock false greens. Covered by `test:product-stock`.
35. Active control artifacts were cleaned so the publish policy, skill dashboard, and current architecture diagrams no longer present Dolap/Threads as active channels. Historical decision/export archives may still mention them as old context.
36. ReviewPanel's ready banner now uses central six-dimension publish readiness plus field blockers/warnings, so confirmation/content/audit blockers cannot be hidden behind a basic-field green state. Covered by `test:operator-readiness`.
37. `/pipeline` diagnostics now use shared usable-media and stock-summary helpers, so placeholder media rows and top-level-only stock cannot produce misleading pipeline output. Covered by `test:publish-readiness`.
38. Source-pack governance is now mechanically tested by `test:source-pack`: document count stays under 20, required source files exist, active channel truth remains Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.
39. SupplierScout dormancy is now mechanically tested by `test:supplierscout-dormant`: the route must keep the `SUPPLIER_SCOUT_ENABLED=true` gate before webhook processing, daily reports, and webhook registration; Vercel must not register a SupplierScout cron; package scripts must not activate it; and source-pack guidance must still say it is dormant.
40. Telegram confirmation wizard channel handling is now tested by `test:confirmation-wizard`: the target picker includes the active channel set including X, retired/unknown targets are dropped from wizard checks and summaries, and spoofed `wz_tgt:*` callbacks are rejected before entering the session.
41. State-coherence repair is now tested by `test:state-coherence`: `/repair` preview remains dry-run, confirmed repair updates only derived workflow fields, archived products are skipped, confirmed repairs emit `state.repaired`, repeated repair is idempotent, and scan mode is read-only.
42. Mentix/OpenClaw skill governance is now tested by `test:mentix-skills`: repo skills must keep OpenClaw as Mentix's skill layer, Payload/Next as source of truth, n8n optional, active channels Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and the OpenClaw deployment checklist present.
43. Dispatch overview now shows active targets even when no dispatch note exists: Website appears as native published, missing external results appear as `unrecorded`, and historical non-target notes stay visible. Covered by `test:dispatch-status`.
44. Provider health is now tested by `test:provider-health` and surfaced in Telegram `/diagnostics`: states are `ready`, `fallback`, `disabled`, or `missing`, and diagnostics prints key names only, never secret values.
45. Next: smoke test the live admin UI and live Telegram operator path with an operator present, then continue product workflow polish and deeper retry handling.

## Open Questions

### n8n Intake

Should optional n8n intake remain after the product flow is stable, or should intake stay app-side through Payload/Next by default?

Recommended: keep n8n frozen unless it proves useful for a current operator need.

### OpenClaw Skill Deployment

Which skills are actually deployed on the VPS, and which only exist in the repo?

Repo-side checklist now exists at `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and is guarded by `npm run test:mentix-skills`. Still needed: verify which skills are deployed on the VPS and test read-only Telegram/OpenClaw prompts before any live operator use.

### Validation Cleanup

Which old soak scripts should be archived, fixed, or excluded?

Needed: prevent TypeScript/lint from failing on stale historical artifacts.

### AI Provider Reality

Which AI/search providers are truly configured in production?

Needed: provider/env audit without exposing secrets.

### Pixel And Ads

When should Meta Pixel/CAPI be added?

Recommended: after product pages, lead tracking, and privacy/KVKK wording are stable.

### Checkout

Should website-native checkout be built, or should Shopier remain the checkout path for now?

Recommended: keep Shopier as main checkout until product/publishing flow is stable.
