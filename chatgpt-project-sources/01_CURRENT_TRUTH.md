# Current Truth

Verified 2026-07-26 from the checkout, a fresh `origin` fetch, package scripts, local validation, and the operator's subsequent strategic decision.

## Product and scope

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for the operator's own products. Payload is the durable source of truth for products, variants, media, orders, leads, stock, bot events, image-generation jobs, story jobs, Product Intelligence reports, and publishing state.

Active channels:

- Website
- Instagram
- Facebook
- X
- Shopier

Dolap and Threads are retired. SupplierScout is dormant. The protected-brand catalog backlog is deferred; existing activation, storefront, dispatch, Shopier, claims, approval, and ad guards stay enforced and no automatic catalog remediation is authorized.

## Runtime architecture

Next/Payload executes commerce workflows. Telegram is the primary operator workspace. Hermes is the current agent-control layer; Mentix/Uygunops is the Telegram-facing operator identity. OpenClaw is historical/optional unless explicitly reactivated. n8n is optional fallback glue, not the default workflow. Shopier remains the checkout/sales bridge; website-native checkout is deferred.

The deployed integration boundary includes PR #6 (catalog/release hardening through D-500) and PR #7 (D-501 mobile PDP CTA overflow correction). `origin/main` also contains later documentation merge commits. Deployment evidence does not prove current provider credentials, quotas, OAuth permissions, Telegram webhook delivery, or Shopier webhook delivery.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem; current work is analysis and architecture before any prompt, camera, slot, or provider redesign.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

## Verified health boundary

The 2026-07-26 audit passed `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`, `npm run test:ad-performance`, `npm run test:openclaw-vps-verification`, and `npm run test:shopier-webhook-local`.

The checkout was clean and tracked its feature branch exactly at the audit boundary, but it was not on `main`. The checked-out commit was merged into `origin/main`; local `main` diverged with one local-only documentation commit and was 28 commits behind the fetched remote. Old recovery and cleanup branches, one stash, and many unreachable objects remain.

## Current blockers

- Telegram webhook verification and empty allowlists can fail open.
- Telegram callback actions are handled before the message-path allowlist checks and need the same fail-closed authorization boundary.
- Partial image-slot and Media-save success can be associated with the wrong positional slot metadata.
- Rejected, regenerated, and partially approved image jobs leave generated Media records for manual cleanup.
- Image attempts, provider usage, per-slot results, retries, and long-running progress are not durably modeled.
- The Telegram route is a 7,820-line monolith with command ownership, callbacks, reads, and mutations in one handler.
- Local environment readiness is not production provider readiness.
