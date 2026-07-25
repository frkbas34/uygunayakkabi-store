# Storefront And Conversion

Last updated: 2026-07-25

## Goal

Turn the website into a better sales surface for product traffic from Telegram, social, and ads.

## Product Detail Page Needs

- Keep the current mobile gallery, product title, price, stock, size chips, WhatsApp CTA, Shopier CTA when available, trust messaging, lead form, FAQ, and product guide content working cleanly.
- Treat PDP changes as conversion polish only; do not rewrite product truth or add unsupported claims.
- Before paid traffic, verify the real product with `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`.

## Homepage Needs

- New arrivals.
- Best sellers.
- Deals.
- Editor picks.
- Category/intent entry.
- Clear path to products.

## Current Status

D-464 wires the homepage's server-resolved merchandising memberships into the rendered rails. Editor Picks use manually popular products, Best Sellers use the score/pin-selected list, Deals use the manual deal list, and Discounts use eligible price reductions. Each rail stays hidden when it has fewer than two products, so the storefront does not invent popularity or deals from arbitrary catalog position. D-471 also keeps placeholder-title and protected-brand legacy records off public storefront surfaces. D-472 hides numeric trust metrics unless an operator deliberately enables three complete, verified values in Site Settings; there are no fallback social-proof claims and no empty metrics panel. D-474 uses the same public-safety policy for operator PDP links and ad UTM examples, while D-475 makes the direct Telegram `/utm` command require an active, storefront-safe product before it returns a marketing link. D-486 makes the PDP prefer usable generated images but fall back to original product media, reuses the resolved gallery in Product JSON-LD, derives availability from shared sellable-stock truth, and safely serializes inline schema. D-487 extracts that serializer for Blog Article JSON-LD too, so editorial content cannot terminate the inline schema script. `test:merchandising`, `test:homepage-merchandising`, `test:product-storefront-images`, `test:product-structured-data`, `test:structured-data`, `test:blog-structured-data`, `test:storefront-trust`, `test:utm-builder`, `test:utm-command`, and focused desk/ad tests cover these local-only guards.

## Content Needs

- Avoid filler content.
- Use GEO/SEO content where it helps conversion.
- Keep product truth higher priority than SEO wording.

## Acceptance Criteria

- Visitor quickly understands what the product is.
- Visitor understands available sizes/stock.
- Buying or messaging path is obvious.
- Mobile flow feels clean.
