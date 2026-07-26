# Open Questions and Next Sprint

Current as of 2026-07-26. This is a prioritized decision list, not a milestone ledger.

## P0 — Telegram and image correctness

1. Define a fail-closed production policy for webhook secret, DM/group allowlists, and callback actions. Callback payload ownership must not substitute for operator authorization.
2. Preserve one durable result per requested image slot so partial generation or Media persistence cannot mislabel later slots.
3. Remove the rejected protected-brand generation helper/test and brand-first generation advice without weakening claims, approval, activation, publishing, advertising, Shopier, or dispatch guards.
4. Define cleanup ownership and recoverability for rejected, regenerated, failed-save, partial-approval, and otherwise orphaned generated Media.

## P1 — image platform and Telegram UX

1. Complete and operator-review `project-control/GOLDEN_PRODUCT_SET_V1.md`: confirm the one draft source and acquire 35 missing repository-safe originals, including all 12 loafers. Do not use generated outcomes, hero decoration, screenshots, or production-only media as Layer A truth.
2. Independently of the still-blocked visual-quality corpus gate, implement **Pure Metadata Contracts and Durable Slot Identity Foundation** when separately authorized, with stable slot IDs, non-positional failure records, immutable attempt IDs, versioned contracts, and legacy compatibility; do not change prompt, camera, slot-purpose, provider, or generation quality.
3. Add immutable image attempts, structured slot lineage, provider usage/timing, retries, and transform/evaluator results.
4. Bind Telegram task receipts and progress to exact jobs; unify deduplication across all image entry points.
5. Introduce a typed command/callback registry, then split the 7,820-line route without changing operator behavior.
6. Resolve `.env.example` drift: stale Claid/Luma entries, Gemini model comments, missing DataForSEO text-depth configuration, and obsolete three-scene language.
7. Correct jobs/cron comments so they match the Vercel 30-minute schedule and manual GitHub workflow.

## P2 — repository hygiene after product risks

1. Reconcile local/remote branches, recovery branches, the stash, and unreachable objects with explicit operator approval.
2. Decide retention for ignored `sessions`, `tmp`, and `backups`, plus tracked raw chat archives.
3. Classify duplicate exports/dashboards and retained SupplierScout schema after checking live data dependencies.
4. Keep the D-403 provider reality audit as the evidence boundary: local environment readiness is not production provider readiness, and live verification requires separate operator approval.

## Operator decisions needed

- Should empty Telegram allowlists remain backward-compatible locally, or fail closed in every environment?
- What generated-media retention period and recovery window are acceptable?
- What provider/evaluator cost and latency budget should each future image profile enforce?
- Should long-running task progress edit one receipt, send milestone messages, or use both?
- Which evaluator scores remain advisory and which may block publishing after human review?
- Should `children_shoe` remain a Product Understanding routing family with a required base morphology, or become only an orthogonal wearer/scale attribute?
- Which non-critical machine-inferred facts, if any, may enter the locked fact set before operator confirmation?
- Which drift dimensions may eventually block preview, and which must remain advisory to the human operator?
- What pack completeness and generated-Media retention policy should apply after partial slot failure or targeted regeneration?
- When should the protected-brand catalog review backlog reopen?
