# Product Intake And Operator Flow

Last updated: 2026-06-21

## Target Flow

Telegram/admin upload -> Payload draft -> media attached -> confirmation wizard -> optional AI image/content -> operator approval -> publish.

## Intake Sources

- Payload admin
- Telegram bot
- Automation endpoint

## Product Draft Requirements

At minimum:

- Title
- Price
- Product photo
- Stock or sizes
- Category/product family when possible
- Channel targets
- Source metadata

## Review Requirements

Before publish:

- Price greater than zero
- Image exists
- Stock is valid
- Brand safety passes
- Content does not make risky claims
- Target channels are active and intentional

## Current Activation Guard

As of 2026-06-21, `src/collections/Products.ts` uses `src/lib/productActivationGuard.ts` to block new active creates and new transitions into `status='active'` unless the product has:

- price greater than zero
- at least one product image or approved generated image
- effective stock greater than zero, using variant stock when variants exist
- at least one active target among website, Instagram, Shopier, X, Facebook
- brand-safety scan passing, including the `brand` field

New products now default to `draft`. On successful activation, the hook also normalizes workflow state to `workflowStatus='active'`, `sellable=true`, and non-sold-out stock state so the storefront/homepage do not silently hide the product. The guard does not block edits to products that are already active. It is meant to prevent hidden storefront activation failures while keeping existing live products editable.

Code-level smoke coverage exists in `src/lib/productActivationGuard.test.ts` and runs through `npm run validate`. It covers helper logic plus actual `Products.beforeChange` hook behavior. Runtime admin/Telegram smoke is still a next step.

Operator-facing activation surfaces have been aligned with the guard. The Payload admin ReviewPanel now treats zero/missing stock, missing active channel target, and visible title/brand brand-safety hits as blockers. Its success message says Payload still runs the final guard. Telegram `/activate` and `/approvepublish` help text now says both central publish readiness and the Payload activation guard must pass.

Lifecycle wording is canonicalized by `src/lib/productLifecycle.ts`: current Payload fields map to `draft`, `needs_review`, `ready_to_publish`, `active`, and `sold_out`. ReviewPanel shows this derived lifecycle label while keeping top-level `status` as the storefront visibility switch.

The content-generation pipeline re-fetches after audit and requires central `evaluatePublishReadiness()` before any auto-activation. If readiness is not complete, it sends an operator "Yayına Al" button with blockers instead of activating.

## Operator Controls

Important controls:

- Confirm missing fields
- Generate/approve AI images
- Run GEO/content generation
- Audit readiness
- Activate product
- Redispatch one channel
- Mark sold out or restock

## Main Improvements Needed

- Make admin product creation smoother.
- Make Telegram intake and admin intake produce consistent product shape.
- Make product status names clearer.
- Reduce hidden failures in media attach and channel dispatch.
- Smoke test the activation guard through Payload admin and Telegram publish paths.
