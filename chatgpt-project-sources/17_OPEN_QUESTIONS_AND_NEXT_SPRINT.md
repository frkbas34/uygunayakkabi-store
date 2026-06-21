# Open Questions And Next Sprint

Last updated: 2026-06-21

## Immediate Next Sprint

Current sprint status:

1. `AGENTS.md` added.
2. `CLAUDE.md` added.
3. Obsidian control notes added at repo root.
4. Validation scripts fixed.
5. Stale generated/session artifacts excluded from validation.
6. `npm run validate` passes with warnings and now includes brand-safety, product-lifecycle, and activation-guard assertions.
7. Product activation guard implemented: active creates and transitions into `status='active'` now require price, image, effective stock, active target, and brand-safety pass.
8. Code-level activation smoke test added at `src/lib/productActivationGuard.test.ts`, including actual `Products.beforeChange` hook behavior.
9. Product defaults changed to `draft`; content auto-activation now requires central publish readiness after audit.
10. Admin ReviewPanel and Telegram activation help now explicitly describe the Payload activation guard instead of implying readiness alone is enough.
11. Product lifecycle vocabulary is now canonicalized in `src/lib/productLifecycle.ts` and surfaced in ReviewPanel without changing the Payload status schema.
12. Next: smoke test admin/Telegram product activation at runtime and continue product workflow polish.

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
