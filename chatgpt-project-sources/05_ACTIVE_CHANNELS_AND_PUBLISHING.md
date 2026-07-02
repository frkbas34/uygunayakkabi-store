# Active Channels And Publishing

Last updated: 2026-07-02

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
- Use `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only` before live Telegram `/productflow` checks when diagnostics, readiness summaries, dispatch summaries, or next-action guidance change.
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

Current:

- `src/lib/shopierPublishControl.ts` is the shared Shopier/Web queue gate.
- `/shopier dashboard` is read-only and summarizes publish-ready counts, top blocker groups, Shopier error classes, and safe retry counts.
- `/shopier publish <sn-or-id>` and `/shopier republish <sn-or-id>` use that gate before queueing a `shopier-sync` job.
- `/shopier publish-ready` is preview-only.
- `/shopier publish-ready confirm` queues only products that pass the gate.
- `/shopier errors` gives first-pass triage for failed Shopier syncs, grouped as retryable, product data, configuration, remote state, or unknown with a suggested next action.
- `/shopier retry-errors` previews failed Shopier syncs that are safe to retry.
- `/shopier retry-errors confirm` queues only retryable errors that still pass the shared gate.
- Payload admin ReviewPanel shows a read-only Shopier Queue Gate for the current product using the same D-356 evaluator as Telegram queue commands.
- Telegram `/productflow` and runtime `smoke:product-flow:read` include the same Shopier gate in a broader read-only product-flow snapshot.
- `npm run smoke:shopier:read -- --confirm-read-only` mirrors dashboard, publish-ready, errors, and retry-errors in read-only runtime mode without writing, queueing, dispatching, calling Shopier, or pushing schema changes.
- The gate requires active website visibility, slug, explicit Shopier target/flag alignment, category, generated-gallery media, Image QC PASS, sellable stock, brand-safety pass, central publish readiness, and no duplicate queued/syncing job.
- Covered by `npm run test:shopier-publish-control`, including the admin gate summary states.
- Latest read-only schema check on 2026-07-02 passes: D-355 Image QC columns and the `products_image_quality_defect_flags` relation are present.
- Guarded DB helper remains available if drift reappears: `npm run db:imageqc:apply` previews by default; confirmed apply requires `--apply --confirm-apply-d355-image-qc-schema` and explicit operator approval.

Still needed:

- Live operator smoke the guarded Telegram commands now that read-only schema/product-flow/Shopier smokes complete.
- Configure or verify `SHOPIER_PAT` before queueing Shopier jobs; latest read-only smoke reported `SHOPIER_PAT configured: no`.
- Decide whether the first-pass `/shopier dashboard`, `/shopier errors`, `/shopier retry-errors`, and per-product admin gate are enough or if a broader admin batch review surface is needed.

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

Provider-health visibility is read-only and secret-safe in `src/lib/channelProviderHealth.ts`. Telegram `/diagnostics` now reports Website native readiness plus Instagram/Facebook/X/Shopier states as `ready`, `fallback`, `disabled`, or `missing`, including missing key names but never token values. Runtime smoke `npm run smoke:provider-health:read -- --confirm-read-only` reads AutomationSettings with `PAYLOAD_DB_PUSH=false` and prints the same provider-health model without writing, dispatching, queueing, calling providers, calling Shopier, pushing schema changes, or exposing secret values. Covered by `src/lib/channelProviderHealth.test.ts`.

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
