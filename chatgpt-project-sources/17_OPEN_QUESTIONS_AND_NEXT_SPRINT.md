# Open Questions and Next Sprint

Current as of 2026-07-26. This is a prioritized decision list, not a milestone ledger.

## P0 — Telegram and image correctness

1. Define a fail-closed production policy for webhook secret, DM/group allowlists, and callback actions. Callback payload ownership must not substitute for operator authorization.
2. Make Payload schema push fail closed. Authenticated Vercel evidence proves `PAYLOAD_DB_PUSH` is absent in preview and production while the current config interprets absence as true. The same pooled Neon `DATABASE_URI` spans development, preview, and production scopes. Do not authorize expansion or push until explicit false is proven for every production/preview build/runtime path.
3. Remove the rejected protected-brand generation helper/test and brand-first generation advice without weakening claims, approval, activation, publishing, advertising, Shopier, or dispatch guards.
4. Define cleanup ownership and recoverability for rejected, regenerated, failed-save, partial-approval, and otherwise orphaned generated Media.

## P1 — image platform and Telegram UX

1. Complete and operator-review `project-control/GOLDEN_PRODUCT_SET_V1.md`: confirm the one draft source and acquire 35 missing repository-safe originals, including all 12 loafers. Do not use generated outcomes, hero decoration, screenshots, or production-only media as Layer A truth.
2. Evolve the additive job-JSON attempt snapshots into normalized immutable attempt/slot records when separately authorized; preserve the new semantic contract and refuse ambiguous legacy backfills.
3. Add provider usage/timing/cost, structured retries, transforms, evaluators, checkpoints, cancellation, and recovery to those normalized records.
4. Bind Telegram task receipts and progress to exact jobs; unify deduplication across all image entry points.
5. Introduce a typed command/callback registry, then split the 7,820-line route without changing operator behavior.
6. Resolve `.env.example` drift: stale Claid/Luma entries, Gemini model comments, missing DataForSEO text-depth configuration, and obsolete three-scene language.
7. Correct jobs/cron comments so they match the Vercel 30-minute schedule and manual GitHub workflow.

## P2 — repository hygiene after product risks

1. Reconcile local/remote branches, recovery branches, the stash, and unreachable objects with explicit operator approval.
2. Decide retention for ignored `sessions`, `tmp`, and `backups`, plus tracked raw chat archives.
3. Classify duplicate exports/dashboards and retained SupplierScout schema after checking live data dependencies.
4. Keep the D-403 provider reality audit as the evidence boundary: local environment readiness is not production provider readiness, and live verification requires separate operator approval.

## Local governance references

- D-386 keeps Telegram Shopier publishing on the shared guarded queue path.
- D-397 local release candidate boundary added and governance-tested locally.
- D-398 local PR review package added and governance-tested locally.
- D-402 historical soak-script quarantine remains outside normal validation and operator-safe smoke flows.

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
- Is preview intentionally allowed to use the same Neon target as production, or must it be isolated before the lineage runtime is pushed?
- Who will supply and approve the Neon project/branch, PostgreSQL version, backup/PITR recovery point, direct migration endpoint, and dedicated read-only metadata-role evidence?

## Exact recommended next task

**MAKE PAYLOAD SCHEMA PUSH FAIL CLOSED V1**: change the configuration and environment governance so absence can never enable Payload schema push; prove explicit `PAYLOAD_DB_PUSH=false` for local validation, CI, Vercel preview build/runtime, Vercel production build/runtime, read-only smokes, and controlled migration processes. Do not apply production schema, push the lineage chain, deploy, promote, or run live smokes in that task.
