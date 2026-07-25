# Mentix Skill Stack - Installation Matrix

Created: 2026-03-16
Last updated: 2026-07-24

Status: Hermes is current. OpenClaw is historical/optional unless explicitly reactivated, and VPS state must be verified before any optional OpenClaw sync or live use.

## Verification Rule

This matrix describes the expected repo-side skill set for optional OpenClaw reactivation. It must not be treated as proof that a skill is installed, loaded, or working on VPS OpenClaw.

Use `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` before any copy, restart, or live Telegram/OpenClaw prompt. Until that verification is recorded, VPS install status is `VERIFY ON VPS`.

D-463 makes the output boundary explicit: these are repo templates for optional reactivation. Hermes/Mentix is current; no matrix row proves a live VPS skill. Product debugging remains read-only, content/research remains operator-reviewed drafting, backend work remains advisory, and only durable PII-light project decisions belong in repo control memory.

## Current Architecture

- Payload/Next is the source of truth and execution layer.
- Hermes is the current agent-control layer.
- OpenClaw is historical/optional unless explicitly reactivated.
- n8n is optional glue only.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- Business strategy is own-products-only.
- Live-smoke planning starts with `/smokeplan`.

## Expected Repo Skill Matrix

| Skill | Purpose | Expected mode | VPS status | Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `mentix-intake` | Route Mentix requests to the right skill | Read-first | VERIFY ON VPS | Medium | Must route live-smoke planning to `/smokeplan` first. |
| `product-flow-debugger` | Explain product visibility, readiness, and publishing blockers | Read-only diagnostics | VERIFY ON VPS | Low | Should use `/productflow` evidence shape. |
| `agent-memory` | Store concise operational memory | Controlled writes | VERIFY ON VPS | Low | Durable architecture decisions still need source-pack updates. |
| `skill-vetter` | Review new skills before activation | Advisory gate | VERIFY ON VPS | Low | Should run before adding new skills. |
| `browser-automation` | Visual inspection and browser checks | Read-only by default | VERIFY ON VPS | Medium | Requires browser capability on VPS/container. |
| `sql-toolkit` | Database diagnostics | Read-first | VERIFY ON VPS | Medium | Must not print secrets or mutate without approval. |
| `github-workflow` | Repo, issue, and PR support | Advisory | VERIFY ON VPS | Low | Requires auth only if used. |
| `uptime-kuma` | Service health visibility | Read-only | VERIFY ON VPS | Low | Optional monitoring helper. |
| `eachlabs-image-edit` | Product image enhancement | Approval per operation | VERIFY ON VPS | Medium | Defer until image provider credentials and approval gates are confirmed. |
| `upload-post` | Draft social/channel copy | Draft-only | VERIFY ON VPS | Medium | No auto-publish. Active channels only. |
| `research-cog` | Market/product/SEO research | Informational only | VERIFY ON VPS | Low | No supplier sourcing; own-products-only. |
| `senior-backend` | Architecture and backend advisory | Advisory only | VERIFY ON VPS | Low | Must keep Payload as source of truth. |
| `learning-engine` | Observe and summarize repeated patterns | Observe-only | VERIFY ON VPS | Low | No auto-modification. |

## Optional Deployment Order After Verification

1. Confirm the operator explicitly reactivated OpenClaw for the current task.
2. Verify current VPS directory and logs with `OPENCLAW_VPS_VERIFICATION.md`.
3. Sync only reviewed skills needed for the next operator workflow.
4. Restart OpenClaw only after the copied set is known and approved.
5. Test read-only Telegram prompts.
6. Record observed results in project-control notes if the deployment decision changes.

## Read-Only Telegram Verification Prompts

- `@Mentix canli smoke planini goster` -> should answer that Telegram `/smokeplan` comes first.
- `@Mentix bu urun neden gorunmuyor` -> should ask for a product ref or use `/productflow` evidence, not invent state.
- `@Mentix shopier hazir mi` -> should mention shared Shopier/Web gate and stop before queueing.
- `@Mentix dolap icin hazirla` -> should refuse because Dolap is retired.
- `@Mentix supplierscout calistir` -> should refuse because SupplierScout is dormant.

## Open Questions

1. Does OpenClaw auto-discover `SKILL.md` files in the skills directory, or does each need registration?
2. Can OpenClaw skills access required environment variables without printing values?
3. Does the VPS/container have browser support for browser-automation?
4. Which repo skills are actually present on VPS today?
5. Which read-only Telegram prompts pass after sync?
