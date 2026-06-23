# Active Channels And Publishing

Last updated: 2026-06-23

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

- Use `npm run smoke:activation:read -- --product=<id> --confirm-read-only` before manual runtime activation checks. Code-path smoke exists in `src/lib/publishDesk.test.ts`; the read-only runtime smoke exists in `scripts/activation-runtime-smoke.ts`.
- Clear product readiness state.
- Better PDP conversion.

## Instagram

Direct Graph API path exists when tokens and HTTPS image are valid.

Needed:

- Token health visibility.
- Better carousel support if useful.
- Provider-specific success/failure detail beyond the shared dispatch overview.

## Facebook

Direct Graph API Page publishing path exists.

Needed:

- Page ID/token health visibility.
- Provider-specific success/failure detail beyond the shared dispatch overview.

## X

Direct posting path exists with configured credentials.

Needed:

- Credential health check.
- Provider-specific success/failure detail beyond the shared dispatch overview.
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

Dispatch code has direct safety coverage in `src/lib/channelDispatch.test.ts`: supported external channels exclude Website/Dolap/Threads, unsupported `channelTargets` never become eligible, product/global flags can block targeted channels, website-only targets do not dispatch externally, dry-run `onlyChannels` previews exactly one channel, and brand safety blocks all otherwise eligible external dispatch.

Product saves now normalize `channelTargets` and `channels.publish*` to the same active channel set in `Products.beforeChange`. This makes the admin/manual path match Telegram and confirmation-wizard behavior, and reduces hidden failures where activation/readiness sees a target but dispatch skips because a matching publish flag is false. Covered by `src/lib/productChannels.test.ts` and hook coverage in `src/lib/productActivationGuard.test.ts`.

State-coherence diagnostics now surface channel drift on older records: unsupported targets, target selected with a false publish flag, and true publish flag without the matching target. This is read-only and helps operators identify products that should be saved once to normalize channel state.

Telegram caption parsing is covered by `src/lib/telegramParser.test.ts`: captions can target Website, Instagram, Shopier, X, and Facebook, including common `twitter` and `fb` aliases. The legacy `Instagram: evet` shorthand maps to Website + Instagram. Dolap/Threads are ignored and do not become product channel targets.

## Dispatch State

Per-channel results are normalized in `src/lib/channelDispatchStatus.ts` and displayed in ReviewPanel. Current states are:

- `published`
- `queued`
- `failed`
- `blocked`
- `preview`
- `unrecorded`
- `not_configured`
- `skipped`

This gives operators one readable state plus a reason and whether redispatch is useful.

ReviewPanel now builds a dispatch overview from the active target list plus recorded `sourceMeta.dispatchNotes`. Website appears as a native published row, external targets with no note appear as `unrecorded`, and old notes for non-target channels remain visible as historical context. Covered by `src/lib/channelDispatchStatus.test.ts`.

Provider-health visibility is read-only and secret-safe in `src/lib/channelProviderHealth.ts`. Telegram `/diagnostics` now reports Website native readiness plus Instagram/Facebook/X/Shopier states as `ready`, `fallback`, `disabled`, or `missing`, including missing key names but never token values. Covered by `src/lib/channelProviderHealth.test.ts`.

## Redispatch

Telegram `/redispatch <channel> <sn-or-id>` is intentionally one-channel only. `src/lib/operatorActionsRedispatch.test.ts` covers:

- Dolap/Threads aliases are rejected.
- Website redispatch is refused before product lookup because the website is native.
- Inactive products are refused without dispatch-note writes.
- Redispatch persists only the selected channel result and preserves other channel notes.
- Shopier redispatch queues exactly one `shopier-sync` job when `SHOPIER_PAT` is configured.

`src/lib/automationDecision.test.ts` also covers channel target filtering: all active channels pass when globally enabled, globally disabled active channels are reported as blocked, and retired/unknown channels are dropped.

## Safety Direction

Brand safety now participates in the Payload activation guard and still blocks external dispatch.
