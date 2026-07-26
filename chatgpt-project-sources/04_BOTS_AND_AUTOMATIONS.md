# Bots and Automations

## Uygunops / Mentix

Uygunops is the primary operator bot and Telegram commerce interface. It handles product intake, the confirmation wizard, image-generation requests and approvals, catalog diagnostics, leads, orders, Shopier previews, merchandising, and guarded mutations.

Telegram operator productivity is the immediate engineering focus. Commands, callbacks, task receipts, progress, summaries, and approval state must be designed as one operator product, not unrelated route branches.

## GeoBot

GeoBot handles content, audit, preview, activation/publishing-oriented commands, story operations, and Product Intelligence handoff. Both bot identities expose selected shared read-only desks. Ownership is currently encoded inside the Telegram route rather than a central registry.

## Hermes

Hermes is the current agent-control layer. It may diagnose, draft, plan, and help the operator; it must not become the database, publish autonomously, or claim a provider action succeeded without evidence.

## Payload jobs

- `image-gen`: reference-based product image previews, Media persistence, Telegram preview, and approval handoff.
- `shopier-sync`: guarded Shopier listing synchronization.

The Vercel cron runs the Payload job endpoint every 30 minutes. Route handlers sometimes call the job runner immediately after queueing.

## Current Telegram risks

- Missing webhook secrets and empty allowlists can fail open.
- Callback actions are processed before the later message-path allowlist checks and need the same authorization policy.
- The 7,820-line route concentrates command ownership, parsing, reads, mutations, callbacks, and long-running work.
- Image entry points have inconsistent deduplication/status behavior, and immediate `jobs.run({ limit: 1 })` is not bound to the newly queued job.
- Multi-minute tasks lack a durable operator receipt, progress milestones, cancellation, and recovery read.

## Dormant and optional systems

SupplierScout is dormant. `/api/supplier-scout` ignores actions unless `SUPPLIER_SCOUT_ENABLED=true`. Do not enable it without an explicit operator reversal.

n8n Status: optional glue. Direct Payload/Next operation is the default. Checked-in channel JSON files are compatibility/fallback artifacts, not proof of imported or active workflows.

OpenClaw is historical/optional. Before reactivation, follow `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and run `npm run test:openclaw-vps-verification`. The legacy deploy script requires both `--reactivate-openclaw` and `--confirm-vps-sync`.

## Safety rule

Read-only diagnostics may inspect Payload. Any product mutation, queue, publish, provider call, Shopier confirm, external message, or ad action requires the applicable explicit operator command and gate.
