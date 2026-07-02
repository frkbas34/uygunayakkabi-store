# Mentix And OpenClaw Skills

Last updated: 2026-07-02

## Direction

OpenClaw should be the agent brain for Mentix. The Next/Payload app should execute product and publishing workflows.

Current guardrail: `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` is the deployment checklist for VPS sync, and `npm run test:mentix-skills` checks that OpenClaw/Mentix skill guidance stays aligned with the current truth.

Current app-side diagnostic helper: `src/lib/productFlowSnapshot.ts` powers Telegram `/productflow` and `/flow`. It is read-only and summarizes lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, coherence drift, and next actions. OpenClaw should use this as the evidence shape for product-flow-debugger answers.

## Active Skill Priorities

### product-flow-debugger

Purpose:

- Explain why a product is not visible, not published, missing images, or blocked.

Needs:

- Use the app-side Product Flow Snapshot helper or `/productflow` output when available.
- Stay limited to active channels only.
- Read Payload state and dispatch notes.
- Return evidence-based diagnosis.

### upload-post

Purpose:

- Draft channel-specific content for Instagram, Facebook, X, and Shopier.

Needs:

- No Dolap/Threads.
- Draft-first mode.
- No auto-publish without confirmation.

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

- Clear VPS/OpenClaw path.
- Skill sync checklist.
- Restart/verify logs checklist.
- Avoid stale skills reintroducing retired channels.

Current checklist:

- Run `npm run validate` and `npm run test:mentix-skills` before copying skills to VPS.
- Verify VPS skill directory before copying anything.
- Copy only reviewed skill folders.
- Restart OpenClaw only after the copied set is known.
- Test first with read-only Telegram prompts.
- Roll back by disabling/restoring the changed skill folder and logging the decision.

Guarded current-truth rules:

- Payload/Next is the source of truth and execution layer.
- OpenClaw/Mentix reasons, diagnoses, drafts, and supports the operator.
- n8n is optional glue only, not the default product brain.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap/Threads stay retired.
- SupplierScout stays dormant.
- Research and intake skills must respect own-products-only.

## Done Means

Mentix can answer:

- What happened to this product?
- Why did a channel fail?
- What should the operator do next?
- Which fields are missing before publish?
