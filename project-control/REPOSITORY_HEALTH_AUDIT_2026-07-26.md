# Repository Health Audit — 2026-07-26

Scope: read-first repository, git, architecture, Telegram, image-generation, documentation, and validation audit. The only changes made by this audit are documentation and documentation-governance updates. No runtime behavior, schema, production data, provider, queue, deployment, commit, push, or cleanup action was performed.

## Executive result

Repository health: **74/100**.

The checkout has strong static correctness, broad local guardrail coverage, clear Payload/Next ownership, and mature transaction/publishing safety. It is not ready for unqualified new feature work because two critical control gaps remain: Telegram authorization can fail open, and active image-generation entry points bypass the retained protected-brand image gate. Generated-media retention, Telegram maintainability, branch/history hygiene, and production-evidence gaps are also unresolved.

## Scorecard

| Area | Score | Evidence |
| --- | ---: | --- |
| Static/build validation | 14/15 | Typecheck, lint, validate, and build passed; build used SiteSettings fallback. |
| Architecture boundaries | 13/15 | Payload/Next ownership is consistent; dormant/optional systems remain registered or documented. Some scheduling comments drift from runtime. |
| Commerce/data safety | 9/10 | Shared Shopier gate, HMAC/idempotency, order/stock transaction paths, floor-at-zero handling, and public visibility guards are covered. Live database evidence was not collected. |
| Telegram security/maintainability | 6/10 | Broad command coverage and tests exist, but secret/allowlist defaults can fail open and the route is 7,820 lines. |
| Image generation/governance | 8/15 | Five-slot Gemini flow, identity/fidelity processing, preview, approval, and Image QC are substantial. Brand-gate wiring and Media cleanup are incomplete. |
| Git/repository hygiene | 7/10 | Working branch was clean and already merged; local main, stale branches, stash, unreachable objects, and large ignored residue need controlled reconciliation. |
| Documentation/source pack | 12/15 | Source pack and agent docs are now compact/current; root and historical control ledgers still need staged cleanup. |
| Production readiness evidence | 5/10 | Local provider tests exist, but current production credentials, permissions, webhooks, quotas, DB state, and live delivery were not verified. |
| **Total** | **74/100** | |

## Git and synchronization audit

- Fresh `origin` fetch placed `origin/main` at `c817cbd` (PR #10 merge).
- Checked-out branch: `codex/d501-mobile-smoke-record` at `09201d6`.
- Before this documentation refresh, the branch was clean, had no staged/untracked files, and matched its upstream (`0 ahead / 0 behind`).
- The checked-out commit is an ancestor of `origin/main`; the branch is `0 ahead / 2 behind` remote main. Its content delta to main is documentation-only.
- Local `main` is `1 ahead / 28 behind` `origin/main`. Its unique commit, `8a9cfcb`, changes `project-control/BUGS_AND_FIXES.md` and `project-control/TASK_QUEUE.md` only.
- One stash remains: `checkpoint-before-website-click-audit-fixes-2026-07-01`.
- `git fsck --no-reflogs --unreachable` reported 129 unreachable commits. They must not be pruned before human/history review.
- Several old local cleanup/recovery branches are hundreds of commits behind; remote cleanup/test/docs branches also remain. Their unique commits need classification before deletion.
- No merge, rebase, or cherry-pick was in progress; no conflict markers or exact tracked-file duplicate hashes were found.

## Repository structure audit

### Current core

- Next.js 16.2 canary, Payload 3.79, React 19, PostgreSQL, and Vercel Blob.
- Payload collections cover products, variants, brands, categories, Media, inquiries, inventory logs, orders, banners, blog posts, image jobs, bot events, story jobs, and Product Intelligence reports.
- Payload jobs are `image-gen` and `shopier-sync`.
- Vercel invokes `/api/payload-jobs/run` every 30 minutes. The GitHub workflow is manual-only.

### Structural debt

- `src/app/api/telegram/route.ts` is 7,820 lines (about 365 KB). Command ownership, authorization, parsing, callbacks, reads, and mutations are concentrated in one handler.
- Command ownership/help arrays are scattered rather than generated from one registry.
- `project-control` contains 46 files and about 1.92 MB of append-only/history-heavy control material. The largest ledgers are `DECISIONS.md`, `PROJECT_STATE.md`, `TASK_QUEUE.md`, and `CLAUDE_MEMORY.md`.
- `ai-knowledge` contains 14 tracked raw-chat archives. These are historical, potentially sensitive, and unsuitable as active project instructions.
- Historical soak/backfill/destructive scripts remain tracked, including `d*-soak*.ts`, `delete-all-products.ts`, and `production-cleanup.ts`. Existing quarantine rules should remain.
- Duplicate-purpose exports/dashboards and preview HTML exist but were not exact hash duplicates; visual/operational review is required before removal.
- SupplierScout routes, collections, globals, and libraries remain registered for dormant-data compatibility. Dormancy is enforced at the route, but schema removal requires database/data-dependency evidence.
- Checked-in n8n JSON is optional compatibility/fallback material, not proof of imported workflows.

## Telegram audit

The single Telegram POST route supports product intake, image generation/approval, content/audit/activation, Shopier, merchandising, brand, blog, story, lead, order, inbox, business/funnel, UTM/ad, ProductFlow, loading, Image QC, and operator diagnostics for Uygunops/Mentix and GeoBot.

### Critical security finding

- When `TELEGRAM_WEBHOOK_SECRET` is absent, webhook verification logs a warning but accepts the request.
- Empty DM and group allowlists retain legacy-open behavior. Tests currently characterize that open default.
- Production should fail closed unless an explicit local-development override is present. This requires a separate behavior change and migration/rollout decision.

### Maintainability finding

- The route needs behavior-preserving decomposition behind characterization tests and a central command/ownership registry.
- Dead/legacy surfaces include an unused `sendTelegramMessageAs` helper, removed/disabled `#chatgpt` handling remnants, and older parser/photo-intake compatibility paths.

## Image-generation and Product Intelligence audit

### Current active flow

- `#gorsel`, `#geminipro`, and inline controls queue Gemini (`provider=gemini-pro`) through `imageGenTask`; `#chatgpt` is disabled.
- A real reference image is required. Gemini Vision validates it and extracts an identity lock.
- Standard generation uses five slot contracts. Fidelity retries, centering/background normalization, pair handling, stock-number overlay, and 2x upscale run before Media persistence.
- Telegram preview approval attaches selected generated Media to `Products.generativeGallery`; original product images remain separate.
- Structured Image QC PASS is required before generated media can pass public/Shopier/ad gates.
- Product Intelligence can use Gemini and optional Google Vision, DataForSEO, or SerpAPI with honest confidence degradation when providers are absent.

### Critical governance drift

- `evaluateImageBrandGate` remains implemented and tested by `test:image-brand-gate`.
- Active `#gorsel`, `#geminipro`, inline-button, and job execution paths do not call it; the job contains an explicit comment that the gate was removed by operator decision D-415.
- Newer diagnostics and planning documents say provenance review must precede protected-brand image generation. The test and the active queue path therefore describe different safety contracts.
- Resolution should use defense in depth: entry-point guard plus job-time guard, while preserving the operator's deferred catalog-cleanup decision.

### Media lifecycle debt

- Rejected previews remain in Media for manual/future cleanup.
- Regeneration clears job references but does not delete prior generated Media.
- Partial approvals leave unapproved generated records.
- Define retention, ownership, dry-run reporting, and exact deletion eligibility before implementing cleanup.

### Legacy/provider drift

- `imageProviders.ts` retains OpenAI editing support and stale comments claiming it is the only/default path; actual operator default is Gemini.
- `imagePromptBuilder.ts` is legacy and not the current slot-contract prompt path.
- Some comments/labels still say three standard scenes despite the five-slot contract.
- `.env.example` retains unused Claid/Luma variables, documents a stale Gemini Vision model override that code ignores, omits `DATAFORSEO_TEXT_DEPTH`, contains old three-scene terminology, and has visible encoding artifacts.

## Validation evidence

Passed on 2026-07-26:

- `npm run typecheck` — PASS.
- `npm run lint` — PASS, zero warnings.
- `npm run validate` — PASS.
- `npm run build` — PASS; SiteSettings load failed and defaults were used, with 9 merchandising-eligible products out of 14 total during build-time output.
- `npm run test:ad-performance` — PASS, four checks.
- `npm run test:openclaw-vps-verification` — PASS.
- `npm run test:shopier-webhook-local` — PASS.
- Focused documentation/governance checks after the refresh: source pack, runtime-smoke governance, provider reality, local release candidate, local PR review, ops runbook, n8n optionality, retired channels, Mentix skills, soak-script quarantine, and Shopier command governance all passed. SupplierScout dormancy was rechecked after its exact source-pack sentence was restored.

Important boundary: `npm run test:safe` governs runtime-smoke scripts but does not execute them. `test:ad-performance` and optional OpenClaw verification are not part of `test:safe`. There is no generic `npm test` script.

Not run:

- Any read-only runtime smoke against a configured Payload database.
- Any schema apply/mutation smoke.
- Live Telegram, Shopier webhook/provider, social provider, reverse-search, n8n, or OpenClaw operations.
- Deployment or production verification.

## Documentation refresh result

- `chatgpt-project-sources` remains exactly 20 Markdown files.
- Size fell from 445,708 bytes to 39,656 bytes (about 91% reduction).
- Largest source-pack file is now 4,699 bytes; before the refresh, files 13 and 17 were about 69 KB and 118 KB.
- Append-only milestone narration was replaced with current architecture, boundaries, blockers, operations, decisions, roadmap, and evidence.
- `AGENTS.md` and `CLAUDE.md` were rebuilt as concise current repository rules.
- `README.md` now describes scope, setup, validation, and canonical documentation.
- `scripts/source-pack-governance.ts` now enforces the exact canonical file set, per-file/total size budgets, current boundaries, and critical audit topics rather than hundreds of historical milestone phrases.
- `scripts/provider-reality-governance.ts` now checks the actual deployed D-501 boundary instead of stale D-500 wording.

## Cleanup classification

### Completed safely in this audit

- Compact current-truth source-pack rewrite.
- Agent-guidance and README synchronization.
- Documentation-governance rewrite and stale deployed-boundary assertion correction.

### Candidate cleanup after operator approval and exact-target review

- Reconcile local `main`, stale local/remote branches, the one stash, and unreachable objects.
- Remove generated `.next`/cache outputs when no process depends on them.
- Classify and reduce ignored `sessions` (2,174 files, about 890 MB), `tmp` (939 files, about 88 MB), and `backups` (2 files, about 1.3 MB). These may contain audit/recovery evidence, so none were deleted.
- Move/archive tracked raw-chat archives under an approved retention/privacy policy.
- Consolidate duplicate-purpose dashboards, exports, and preview HTML after visual review.
- Compact historical `project-control` ledgers while retaining version-control discoverability.

### Keep/quarantine until dependency evidence exists

- SupplierScout collections/globals/routes/libraries: dormant, but possible stored-data/schema dependencies.
- Historical soak/backfill/destructive scripts: operator-only quarantine; never normal validation.
- Database migration SQL and schema checks: retain as migration/audit evidence.
- OpenClaw deployment/verification material: historical/optional and guarded by explicit reactivation flags.
- Local release/PR/deployment manifests: historical evidence, not current-checkout truth.

### Blocking fixes that require a new implementation request

1. Fail-closed Telegram webhook and allowlist policy.
2. Protected-brand image gate on every active entry point and again at job execution.
3. Generated-Media retention/orphan cleanup with dry-run and auditability.
4. Telegram command registry and route decomposition behind characterization coverage.
5. `.env.example` and job-schedule comment cleanup.

## Recommended next sequence

1. Reconcile the working branch and local `main` with remote history; preserve the unique docs commit and stash until reviewed.
2. Implement and roll out fail-closed Telegram security.
3. Restore defense-in-depth image brand gating without reopening deferred catalog remediation.
4. Add generated-Media inventory/dry-run cleanup reporting, then agree retention rules.
5. Decompose the Telegram route with no behavior change.
6. Clean env/comments and historical repository residue in separately reviewable changes.
7. Only then request approved database/provider/live smokes and resume feature work.
