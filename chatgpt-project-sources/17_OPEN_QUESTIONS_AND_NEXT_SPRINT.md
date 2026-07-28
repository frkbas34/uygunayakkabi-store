# Open Questions and Next Sprint

Current as of 2026-07-28. This is a prioritized decision list, not a milestone ledger.

## P0 — Telegram and image correctness

1. Define a fail-closed production policy for webhook secret, DM/group allowlists, and callback actions. Callback payload ownership must not substitute for operator authorization.
2. Define `GENERATED MEDIA RETENTION AND RECOVERABLE CLEANUP POLICY V1` for rejected, regenerated, failed-save, partial-approval, and otherwise orphaned generated Media. The controlled smoke passed but intentionally retained Job 428 Media 1951-1955; the completed legacy triage also leaves 43 preview sets pending exact operator decision and one invalid-reference set retained as failure evidence. No deletion is approved.
3. Remove the rejected protected-brand generation helper/test and brand-first generation advice without weakening claims, approval, activation, publishing, advertising, Shopier, or dispatch guards.
4. Convert the controlled-smoke limitations into future runtime requirements: persist Telegram preview/keyboard receipts, bind callbacks to immutable attempts, retain BotEvent/source evidence, and normalize provider usage, latency, retry, and cost records.
5. Reconcile the 44 stale legacy previews only through exact-job operator decisions, then separately review the 35 quarantine recommendations. Preserve all job/Media provenance, do not infer product equivalence from byte identity, and leave the two ambiguous duplicate groups and two no-image products in manual review.

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
- Is preview intentionally allowed to use the same Neon target as production, or should it be isolated before broader runtime smoke and iteration?
- When should Preview/Development database isolation replace the intentionally shared pooled production target now that the runtime credential is least-privilege?

## Exact recommended next task

**GENERATED MEDIA RETENTION AND RECOVERABLE CLEANUP POLICY V1**: define ownership, retention states, recovery windows, exact-job targeting, preview/approval/rejection/regeneration transitions, and audit evidence before authorizing any generated-Media deletion or detachment. Preserve Job 428 and Media 1951-1955 as controlled-smoke evidence, and do not reconcile the 44 stale legacy previews in the same task.
