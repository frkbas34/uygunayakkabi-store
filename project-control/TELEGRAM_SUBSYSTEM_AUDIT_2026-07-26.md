# Telegram Subsystem Audit

Audit date: 2026-07-26. This report is read-only. No webhook, command, callback, queue, database, provider, or production behavior was changed.

## Executive finding

Telegram is already the operational center of the product, but the code is not organized as a Telegram product platform. One 7,820-line route owns bot selection, authorization, parsing, command ownership, product intake, long-running tasks, callbacks, approvals, diagnostics, and many database mutations. The workflow breadth is a business strength; the concentration and inconsistent authorization are the main engineering risks.

The next engineering cycle should treat Telegram UX, safety, task visibility, and command architecture as product work—not as a thin integration layer.

## Current operating model

- Uygunops/Mentix is the primary operator identity for intake, confirmation, images, catalog desks, leads, orders, Shopier, and guarded changes.
- GeoBot owns content/audit/publishing-oriented command families and Product Intelligence handoffs.
- Both identities share one webhook route and isolate bot tokens through request context.
- Command and callback ownership are represented by several arrays and prefix checks inside the route rather than one registry.
- Payload is the source of truth. Telegram commands are interfaces over Payload records and jobs.

The route contains approximately 535 conditional branches, 136 dynamic imports, 18 `after()` uses, nearly 500 message-send references, and more than 100 callback-answer references. These counts illustrate orchestration density, not code quality by themselves.

## Authorization and webhook safety

Message-path security is legacy-open: missing webhook secrets and empty DM/group allowlists can permit access. The authoritative repository audit identified this as critical.

A second critical boundary exists in callback handling. Callback queries are processed before the later message-path DM/group allowlist checks. Bot-role prefix routing is present, but operator authorization is not consistently re-evaluated before approval, reject, regenerate, Shopier, or other callback actions. An old or forwarded inline keyboard is therefore a more privileged surface than a typed command.

Target safety rule: every update type—message, callback, edited message, and future inline update—must pass the same fail-closed identity and chat policy before command-specific parsing or mutation. Callback payload ownership is not authorization.

## Product intake and image UX

Telegram photo intake creates or enriches draft products and can auto-start the image path. Media-group handling associates album photos with a product. Caption parsing supports current and legacy formats.

Image generation can begin through photos, `#gorsel`, `#geminipro`, or inline callbacks. Entry points are not behaviorally identical:

- `#gorsel` checks for some active jobs before queueing.
- Inline and `#geminipro` paths do not use the same deduplication boundary.
- The check/create sequence is not transactional, so concurrent requests can still duplicate work.
- `#geminipro` does not mirror every visual-status update made by the main path.
- Immediate `jobs.run({ limit: 1 })` execution is not bound to the newly created job.

The image preview and selective approval UX is valuable. However, approval is based on positional indices, raw relationship fallback queries, and route-local wizard coupling. Regeneration reuses the job, forces Gemini, and does not preserve a clean attempt history.

Protected-brand classification must not block any of these generation entry points. Brand safety belongs in the later claims, approval, activation, publishing, and external-dispatch stages.

## Long-running tasks and operator feedback

Image generation can take minutes and may involve more than a dozen provider calls. The route schedules execution with `after()` and usually sends the operator only final success/failure. There is no durable Telegram task receipt, queue position, last-progress timestamp, cancel action, per-slot progress, or concise completion summary linked to an attempt.

A Telegram-first system needs a consistent task interaction:

1. Immediate acknowledgement with task ID and product.
2. Durable queued/running status in Payload.
3. Coalesced progress updates at meaningful milestones, not chat spam.
4. Final preview or failure summary with retryable/non-retryable cause.
5. `/task <id>` or equivalent read for recovery after webhook/runtime interruptions.

This is a proposal only; no commands were added.

## Command and callback architecture

The route mixes static help/ownership declarations with independently implemented handlers. Dynamic imports reduce startup coupling but do not create subsystem boundaries. Handler order and broad condition chains make collisions, stale help, and authorization drift difficult to test.

The target should be one typed registry containing command/callback identity, owning bot, authorization policy, chat scope, mutation class, parser, handler, help metadata, and long-running-task behavior. Registry entries can then be characterized and extracted by domain without changing operator vocabulary.

Suggested domains:

- access and system health
- product intake and confirmation
- image generation and Image QC
- catalog diagnostics and loading
- content/audit/activation/publishing
- Shopier
- leads/orders/stock/business/funnel
- ads/read-only growth
- callbacks and task status

## Diagnostics and summaries

The repository already has strong read-only desks: `/productflow`, `/imageplan`, `/imageqcplan`, `/loadplan`, `/business`, `/funnel`, `/leadplan`, order reminders, inbox views, and Shopier dashboard/previews. These are the foundation of Telegram-first operations.

The next UX pass should standardize summary shape:

- clear state and severity
- one primary next safe action
- compact blocker list
- Payload/PDP links under the current public-safety rules
- stable task/product reference
- explicit read-only or mutation label
- pagination instead of silent truncation near Telegram's message limit

Message helpers currently vary in error handling, and some failures are ignored. Missing tokens can result in silent no-op behavior. Long messages may be truncated rather than paginated.

## Publishing and operator approval

Shopier paths have the strongest pattern: preview-first, shared evaluator, explicit confirm, credential hold, and queued execution. Image approval, activation, and other mutations should converge on the same structural pattern:

- preview/read state
- explicit callback or command decision
- server-side authorization and current-state recheck
- idempotency key
- durable event/audit record
- concise result summary

Content approval must remain separate from image approval, product confirmation, activation approval, and external publishing approval.

## Technical debt and risk ranking

### P0

- Webhook secret and allowlists fail open.
- Callback actions are not consistently protected by the message-path authorization boundary.
- Duplicate image job creation is possible across entry points and races.
- Long-running execution receipt is not deterministically bound to the queued job.

### P1

- One 7,820-line route is the control hotspot.
- Command ownership/help/handler metadata can drift.
- Image approval/retry logic is coupled to raw relationship details and the confirmation wizard.
- Long-running tasks lack durable progress, cancellation, and recovery UX.
- Callback actions need current-state/idempotency checks, not only payload parsing.

### P2

- Current/legacy caption parsing coexist.
- Message formatting, pagination, and API error reporting are inconsistent.
- Command families duplicate product resolution, queue creation, and status updates.
- Provider-specific vocabulary leaks into operator commands and regeneration behavior.

## Preserve during refactoring

- Existing operator command vocabulary unless a migration is explicit.
- Payload as the only durable source of truth.
- Preview-first changes and explicit confirmation.
- Shared Shopier and activation gates.
- Telegram photo intake and selective image approval.
- Image QC, public-media, stock, order/refund, and dispatch safeguards.
- Retired channel and dormant SupplierScout boundaries.

The target architecture and implementation order are documented in `project-control/TELEGRAM_FIRST_IMAGE_ARCHITECTURE_2026-07-26.md`.
