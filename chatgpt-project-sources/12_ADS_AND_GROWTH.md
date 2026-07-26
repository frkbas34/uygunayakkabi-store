# Ads and Growth

Current as of 2026-07-26.

## Operating boundary

Advertising support is manual, read-first, and operator-controlled. Repo commands may evaluate readiness, prepare copy, create UTM links, and summarize Payload attribution. They must not create campaigns, posts, pixels, provider calls, Shopier calls, or ad spend.

## Operator tools

- `/adready <sn-or-id>` evaluates hard blockers and points blocked products to `/productflow` and `/imageplan` where relevant.
- `/adpack <sn-or-id> [campaign]` prepares copy drafts and Meta paid-social UTM links only after hard blockers are clear.
- `/adreport [today|week|month]` summarizes UTM leads, related orders, revenue, stale leads, unattributed leads, and direct/unattributed orders from Payload.
- `/utm` tooling creates deterministic campaign links without calling an ad platform.

## Safety rules

- D-495 remains the active Meta safety rule: direct Instagram/Facebook dispatch requires a public HTTPS media URL and fails before provider calls when none exists.
- Generated images are not ad-ready until structured Image QC records PASS.
- Storefront trust, inquiry guard, attribution, and sitemap tests precede any paid-traffic recommendation.
- Provider configuration or local credentials do not prove production provider readiness.

## Evidence before operator approval

Use a secret-safe Operator Evidence record. Record provider/key-name presence, selected public media URL, account/webhook/quota readiness, and test scope without printing secret values. Evidence is not authorization.

## Validation

Use `test:ad-readiness`, `test:ad-performance`, `test:utm-builder`, `test:utm-command`, `test:storefront-trust`, `test:inquiry-guard`, `test:attribution`, and `test:sitemap-entries` for local behavior. Runtime reporting requires the explicit read-only confirmation flow.
