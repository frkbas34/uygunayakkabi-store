# Open Questions And Next Sprint

Last updated: 2026-06-22

## Immediate Next Sprint

Current sprint status:

1. `AGENTS.md` added.
2. `CLAUDE.md` added.
3. Obsidian control notes added at repo root.
4. Validation scripts fixed.
5. Stale generated/session artifacts excluded from validation.
6. `npm run validate` passes with warnings and now includes brand-safety, product-lifecycle, publish-readiness, channel-dispatch, dispatch-state, redispatch, activation-guard, and Publish Desk activation assertions.
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
28. Next: smoke test the live admin UI and live Telegram operator path with an operator present, then continue product workflow polish.

## Open Questions

### n8n Intake

Should intake remain OpenClaw -> n8n -> Payload, or simplify to OpenClaw -> Payload directly?

Recommended: keep only if currently useful; otherwise simplify.

### OpenClaw Skill Deployment

Which skills are actually deployed on the VPS, and which only exist in the repo?

Needed: deployment verification and skill sync checklist.

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
