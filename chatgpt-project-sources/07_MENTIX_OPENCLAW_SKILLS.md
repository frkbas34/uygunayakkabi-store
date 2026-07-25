# Mentix, Hermes, And Optional OpenClaw Skills

Last updated: 2026-07-24

## Status (2026-07-07): Control layer = Hermes; OpenClaw is historical/optional

Current truth: **Hermes** is the agent-control layer for UygunAyakkabı/Mentix operations (installed on the operator's main PC, already in the Telegram group). Mentix/Uygunops is the Telegram-facing commerce operator identity/interface, and Payload/Next remains the source of truth and execution layer. **OpenClaw is historical/optional unless explicitly reactivated.** The OpenClaw VPS-verification/sync additions (`OPENCLAW_VPS_VERIFICATION.md`, `OPENCLAW_DEPLOYMENT_SYNC.md`, `test:openclaw-vps-verification`) are **HOLD / OPTIONAL** — retained for history and reusable only if OpenClaw is explicitly reactivated; they are not current mandatory infrastructure and are no longer wired into `test:safe`. The "Direction" section below is retained as the historical OpenClaw skill-layer design.

## Direction

Hermes should be the current agent-control layer for Mentix/Uygunops operations. The Next/Payload app should execute product and publishing workflows.

Current guardrail: `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` are optional OpenClaw reactivation checklists, not current deployment instructions. `npm run test:mentix-skills` checks that repo-side agent guidance stays aligned with Hermes-current, Payload-first, own-products-only truth. Standalone `npm run test:openclaw-vps-verification` checks the optional OpenClaw reactivation boundary.

D-401 rule: repo skill files are expected state/history, not proof of deployed VPS state. Do not claim a skill is installed, loaded, or live on VPS OpenClaw until OpenClaw is explicitly reactivated and VPS directory evidence, log evidence, and read-only Telegram prompt evidence are recorded. D-488 extends this guard to the legacy `scripts/vps-deploy.sh`: it exits before any VPS write, skill copy, or restart unless both `--reactivate-openclaw` and `--confirm-vps-sync` are supplied after verification.

Current app-side diagnostic helper: `src/lib/productFlowSnapshot.ts` powers Telegram `/productflow` and `/flow`. It is read-only and summarizes lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state and summary, per-row recovery paths, coherence drift, checklist-summary counts, primary operator step, dependency-aware operator checklist, and next actions. D-460 means Hermes/Mentix can explain the recovery path beside the actual channel state/reason without treating that diagnostic output as permission to run a command. Hermes/Mentix should use this as the evidence shape for product-flow-debugger answers.

Current operator live-smoke helper: Telegram `/smokeplan` prints the safe order for read-only repo smokes and Telegram reads before any queueing, publishing, redispatch, provider spend, Shopier API action, or ads. Hermes/Mentix should tell the operator to run `/smokeplan` first when asked for live-smoke order or catalog-scale-up verification. Optional OpenClaw skills must follow the same rule if reactivated.

## Active Skill Priorities

### product-flow-debugger

Purpose:

- Explain why a product is not visible, not published, missing images, or blocked.

Needs:

- Use the app-side Product Flow Snapshot helper or `/productflow` output when available.
- For live-smoke sequencing, tell the operator to run `/smokeplan` first.
- Stay limited to active channels only.
- Read Payload state and dispatch notes.
- Return evidence-based diagnosis.
- Never execute an action based on confidence; even a high-confidence diagnosis
  returns the smallest safe operator step and the owning workflow.
- Use the D-493/D-494/D-495 provider rules in dispatch diagnosis: X direct
  needs all four OAuth values, Meta selects a public HTTPS gallery image, and
  no public Meta media is a clear failure rather than a fallback opportunity.

### upload-post

Purpose:

- Draft channel-specific content for Instagram, Facebook, X, and Shopier.

Needs:

- No Dolap/Threads.
- Draft-first mode.
- No auto-publish without confirmation.
- Content approval is only approval of copy. The skill must not claim it saved,
  queued, or published a draft; Payload/Next reports any real result.
- Draft only from supported product facts. A protected-brand or readiness
  blocker sends the operator to Product Flow/brand remediation instead of
  producing promotional copy.

### senior-backend

Purpose:

- Help with API, schema, integration, validation, and deployment decisions.

Needs:

- Active channels only.
- Respect Payload as source of truth.

### research-cog

Purpose:

- Research product, SEO, competitors, and active integrations.

Needs:

- Avoid unsupported provider assumptions.
- Use `smoke:pi-provider-health:read` output before claiming Gemini, Google Vision, DataForSEO, SerpAPI, or reverse search is available.

### agent-memory

Purpose:

- Track decisions, incidents, and repeated lessons.

Needs:

- Keep memory concise.
- Write durable decisions into source pack when important.

## Skill Deployment Needs

- Hermes-current skill/process path.
- Optional OpenClaw reactivation checklist only if the operator explicitly reactivates OpenClaw.
- Read-only VPS verification checklist before any optional OpenClaw sync.
- Restart/verify logs checklist only after explicit operator approval.
- Avoid stale skills reintroducing retired channels.

Current checklist:

- Run `npm run validate` and `npm run test:mentix-skills` before claiming current agent guidance is healthy.
- Run standalone `npm run test:openclaw-vps-verification` only when reviewing optional OpenClaw reactivation or sync.
- Verify VPS skill directory, OpenClaw logs, and expected read-only behavior before copying anything if OpenClaw is reactivated.
- Copy only reviewed skill folders.
- Restart OpenClaw only after the copied set is known.
- Test first with read-only Telegram prompts.
- Include a read-only prompt such as `@Mentix canli smoke planini goster`; the expected answer should point to `/smokeplan` first and stop before queue/publish actions.
- Roll back by disabling/restoring the changed skill folder and logging the decision.
- Keep `mentix-skills/INSTALLATION_MATRIX.md` at `VERIFY ON VPS` unless current evidence proves a skill is installed and loaded.

Guarded current-truth rules:

- Payload/Next is the source of truth and execution layer.
- Hermes/Mentix reasons, diagnoses, drafts, and supports the operator.
- OpenClaw remains historical/optional unless explicitly reactivated.
- n8n is optional glue only, not the default product brain.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap/Threads stay retired.
- SupplierScout stays dormant.
- Research and intake skills must respect own-products-only.

## VPS Verification Needs

D-463 extends the current-runtime boundary into every repo-side skill file, `ACTIVATION_CONFIG.md`, and the skill dashboard. Hermes/Mentix on the operator PC is current. OpenClaw material is a reusable optional template, not a deployed service claim; use `OPENCLAW_VPS_VERIFICATION.md` only after the operator explicitly chooses reactivation. Product-flow debugging is read-only, upload/research output is operator-reviewed drafting, backend guidance cannot perform a schema/deploy action, and agent-memory retains only durable PII-light project decisions in `project-control/` plus the relevant source-pack document.

- Use `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` before any optional OpenClaw sync.
- Record observed VPS skill folders, missing repo skills, extra VPS skills, log evidence, and read-only Telegram prompt results.
- Do not print secret values; record only whether expected keys are present or missing.
- Stop before `scp`, `rsync`, `docker compose restart`, provider calls, Shopier calls, dispatch, queueing, or ads until the operator approves.

## Done Means

Mentix can answer:

- What happened to this product?
- Why did a channel fail?
- What should the operator do next?
- Which fields are missing before publish?
