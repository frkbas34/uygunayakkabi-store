# Active Channels and Publishing

## Active channel model

The code-level channel list is Website, Instagram, Shopier, X, and Facebook. Dolap and Threads are not active targets and must not return through UI, parsers, prompts, jobs, or n8n stubs.

## Website

Website is native and has no external dispatch call. Public visibility requires a public lifecycle state plus storefront safety. Placeholder titles and protected-brand matches are hidden from homepage rails, PDP rendering, operator public links, ad landing links, and sitemap entries.

## Instagram and Facebook

Direct Meta dispatch uses shared credential resolution. It selects a public HTTPS image from the full gallery and fails before direct or fallback dispatch if none exists. Optional n8n webhooks are fallbacks only. Local configuration tests do not prove deployed tokens, Page permissions, media reachability, or real delivery.

## X

Direct X dispatch requires all four OAuth 1.0a values. Partial configuration must not attempt a direct call. An optional X n8n webhook may be used as fallback when explicitly configured.

## Shopier

Shopier remains the checkout/sales bridge. Telegram single-product and batch controls call the shared `queueShopierSync()` readiness gate. Preview commands are read-only; confirmed queueing requires `SHOPIER_PAT`. The job path, not route-level direct publishing, is canonical.

## Shared hard gates

Publishing and activation must respect product state, usable media, price, effective stock/variants, selected target channels, brand safety, audit/readiness, and generated-image QC. A manual publish override may cover only allowed review cases; it cannot override protected-brand safety.

Provider state must be described as one of: locally testable, locally configured by key-name presence, production-configured with dated evidence, or live-delivery verified. Do not collapse these states.
