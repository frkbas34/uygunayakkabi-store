# Current Truth

Last updated: 2026-06-23

Payload is the source of truth.

Mentix/OpenClaw is the operator agent layer.

n8n is optional glue, not the main brain.

The project sells and uploads our own products only.

## Active Channels

- Website
- Instagram
- Facebook
- X
- Shopier

## Retired Or Dormant

- Dolap retired
- Threads retired
- SupplierScout dormant

## Source Pack

The ChatGPT Project source pack is `chatgpt-project-sources/`.

When the plan changes, update that folder too.

## Current Product Guard

Payload defaults new products to `draft` and blocks active creates or new activation into `status='active'` unless the product has price, image, stock, active target, and brand-safety pass. Automation intake and content generation now stop at draft/ready state; activation requires an explicit operator action through admin, `/activate`, `/approvepublish`, Publish Desk, or the GeoBot `Yayına Al` button. Code-level guard smoke tests now run inside `npm run validate`.

Direct Payload admin saves to `status='soldout'` now normalize workflow state too: `workflowStatus='soldout'`, `stockState='sold_out'`, and `sellable=false`.

Runtime activation diagnostics now have a read-only command: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product, and reports lifecycle, readiness, stock, targets, activation blockers, and coherence issues without writing or dispatching. Product `359` passed this read-only smoke on 2026-06-23.

A guarded mutation smoke command also exists: `npm run smoke:activation:mutate`. Existing-product mode only accepts a prepared `SMOKE`/`TEST` draft with website-only targets. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete` to create a website-only smoke draft, activate through `approveAndActivateProduct()`, roll back product state, delete smoke bot-events, and delete the temp product. Temp admin-direct mode adds `--admin-direct-update` to activate through a plain Payload status update. Product `359` correctly refused this path before mutation; helper temp-smoke passed with product `363`, and admin-direct temp-smoke passed with product `364` on 2026-06-22.

Admin ReviewPanel and Telegram activation help now warn that Payload's activation guard is the final publish decision, even when local readiness looks complete.

Canonical operator lifecycle stages are derived in `src/lib/productLifecycle.ts`: `draft`, `needs_review`, `ready_to_publish`, `active`, `sold_out`. Top-level Payload `status` remains `draft`, `active`, `soldout` for storefront visibility.

`src/lib/publishDesk.test.ts` smoke-tests the operator activation wrapper without touching a real database. `scripts/activation-runtime-smoke.ts` is the guarded real-Payload read smoke and has been verified on product `359`. `scripts/activation-mutation-smoke.ts` is the guarded reversible mutation smoke and its temp-smoke modes have verified both helper activation and direct Payload admin-save activation. Live operator UI/Telegram smoke is still the next product-flow proof.

Central publish readiness is now closer to activation truth: it does not count empty media rows, zero-price products, zero-stock products, retired channels, or brand-safety blocks as publish-ready.

Per-channel dispatch state is normalized in `src/lib/channelDispatchStatus.ts` so ReviewPanel can show published, queued, failed, blocked, preview, not configured, or skipped consistently.

`src/lib/channelDispatch.test.ts` proves external dispatch is limited to Instagram, Shopier, X, and Facebook. Website is native; Dolap and Threads cannot become eligible.

`src/lib/operatorActionsRedispatch.test.ts` proves Telegram redispatch is one-channel only, preserves other dispatch notes, refuses website/inactive products, and queues Shopier once when enabled.

`src/lib/telegramParser.test.ts` proves Telegram caption intake recognizes Website, Instagram, Shopier, X, and Facebook targets, including the legacy `Instagram: evet` shorthand, while ignoring Dolap/Threads. The Telegram legacy photo+caption fallback now uses `resolveChannelTargets()` and sets all active channel flags from effective targets. `src/lib/automationDecision.test.ts` also proves channel filtering keeps active channels, reports globally disabled active channels, and drops retired or unknown channels.

`src/lib/confirmationWizard.test.ts` proves the Telegram confirmation wizard target picker includes the active channel set including X, drops retired/unknown targets from checks and summaries, and rejects spoofed target callbacks before they enter the session.

ReviewPanel now renders for admin-created products too, not only Telegram/n8n products. Admin/manual products get the same readiness and activation-guard checklist before status changes.

Admin/manual products now reveal source/dispatch metadata once they are active, sold out, or have real dispatch/sync/story metadata. Fresh admin drafts keep that group hidden. This makes redispatch, dry-run preview, Shopier sync state, story state, and dispatch notes reachable for manual products after publish.

Product channel intent is normalized in `Products.beforeChange`: `channelTargets` and `channels.publish*` are synced to the same active channel set before activation. This prevents manual admin products from appearing ready while external dispatch later skips a channel because the target and flag disagreed.

State-coherence diagnostics now also detect older channel drift: unsupported targets, target selected while its publish flag is false, or publish flag true while the target is missing.

Telegram `/repair` is the operator-controlled state-coherence repair path. It defaults to dry-run, requires `confirm` to write, updates only derived workflow fields, skips archived products, writes a `state.repaired` bot event on confirmed repair, and is covered by `src/lib/stateCoherence.test.ts`.

Media readiness uses one shared usable-media definition across activation guard, central publish readiness, and the Payload admin ReviewPanel. Empty placeholder rows no longer count as product visuals.

Stock readiness uses one shared stock summary across central publish readiness and the Payload admin ReviewPanel. Populated variant stock takes precedence over product-level stock, unpopulated variant IDs fall back to `stockQuantity`, and `workflow.stockState='sold_out'` or `workflow.sellable=false` blocks the stock check even when a positive quantity exists.

The Payload admin ReviewPanel ready/not-ready banner now depends on central six-dimension `evaluatePublishReadiness()`, not only its local field checklist. Confirmation, content, audit, media, sellable stock, target channels, and brand safety must all pass before the panel says a draft is ready to publish.

Telegram/operator pipeline diagnostics now use the same usable-media and stock-summary helpers. `/pipeline` no longer counts empty media placeholders as visuals, and its stock stage reports effective variant stock plus sold-out/not-sellable blockers instead of only top-level `stockQuantity`.
