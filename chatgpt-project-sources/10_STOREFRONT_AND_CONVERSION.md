# Storefront and Conversion

Current as of 2026-07-26.

## Public contract

- The Website is an active sales channel; Shopier remains the checkout bridge.
- Only products that pass the shared public-storefront visibility and merchandising gates may appear publicly.
- Draft products return `notFound()` on the PDP.
- Product media must use the safe image fallback path; structured data uses the shared JSON-LD serializer.
- Public PDP links are emitted only for public products with a slug. Payload admin links remain the operator source of truth.

## Buyer-critical PDP behavior

- `ProductImages` remains mounted.
- Variant-backed size and stock clarity uses `SizeChip` and `OOSChip`.
- `ContactForm` receives product and sold-out context.
- WhatsApp and Shopier calls to action are present but safely gated.
- Process/FAQ fallback content remains available.
- Similar products are filtered by active status and merchandising eligibility.

## Trust and acquisition guardrails

- `npm run test:storefront-trust` blocks fake reviews and placeholder testimonials and checks PDP conversion essentials.
- `npm run test:inquiry-guard` covers honeypot, rate limiting, duplicate collapse, and safe fallback behavior.
- `npm run test:attribution` covers first-touch UTM/referrer preservation and lead-submit merging.
- `npm run test:sitemap-entries` covers static, public product, and blog sitemap entries.
- `npm run test:merchandising` and `npm run test:homepage-merchandising` cover rail selection and homepage wiring.

## Current operational caveat

The 2026-07-26 local build succeeded, but SiteSettings could not be loaded during the build and defaults were used. That is evidence of a safe fallback, not proof that production settings or production content are healthy.
