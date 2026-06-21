# Active Channels And Publishing

Last updated: 2026-06-21

## Active Channels

- Website
- Instagram
- Facebook
- X
- Shopier

## Removed Channels

- Dolap
- Threads

These should not be offered in UI, parser output, automation settings, n8n stubs, Claude prompts, or Codex plans.

## Website

Website publishing is native. If a product is active and passes storefront filters, it appears on the site.

Needed:

- Runtime smoke test and refine the new activation gate. Code-path smoke exists in `src/lib/publishDesk.test.ts`.
- Clear product readiness state.
- Better PDP conversion.

## Instagram

Direct Graph API path exists when tokens and HTTPS image are valid.

Needed:

- Token health visibility.
- Better carousel support if useful.
- Clear dispatch result display.

## Facebook

Direct Graph API Page publishing path exists.

Needed:

- Page ID/token health visibility.
- Clear dispatch result display.

## X

Direct posting path exists with configured credentials.

Needed:

- Credential health check.
- Better result display.
- Retry handling.

## Shopier

Shopier sync is handled through Payload jobs.

Needed:

- Job status visibility.
- Retry and error explanation.
- Confirm product/media requirements.

## Dispatch Gates

External dispatch should require:

1. Product targets channel.
2. Product channel flag allows channel.
3. Global AutomationSettings allows channel.
4. Product passes brand/safety checks.
5. Required credentials/media exist.

Central publish readiness resolves active product targets through the same active channel set: Website, Instagram, Facebook, X, Shopier. Dolap/Threads no longer count as valid readiness targets.

## Safety Direction

Brand safety now participates in the Payload activation guard and still blocks external dispatch.
