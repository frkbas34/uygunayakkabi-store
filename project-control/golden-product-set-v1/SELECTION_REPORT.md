# Selection report

## Method

The audit enumerated repository-local PNG/JPEG/WebP files under product, hero, media, session, and temporary paths while excluding dependency, Git, and primary build trees. Deterministic SHA-256 hashes and byte sizes were computed. Product-looking sources received direct visual inspection, image metadata inspection, filename-usage search, and Git introduction-history review. No network, OCR, provider, production database, production media, or Telegram access was used.

## Outcome

| Measure | Result |
|---|---:|
| Raster files inspected | 28 |
| Product-looking original candidates | 8 |
| Provisional qualifying references | 1 |
| Operator-approved original references | 0 |
| Materialized products | 1 |
| Materialized loafers | 0 |
| Exact duplicate hashes among selected products | 0 |
| Missing products against target | 35 |

`gpsv1-0001` references `public/products/kahve-deri.jpg`. The source is a 1300×1950 WebP payload stored with a `.jpg` suffix, SHA-256 `cf5d4f1442cbeb27d1757ce8887af3e78cd070093a42c252e0f12dcec2f5d418`. It was introduced in commit `9474c54d2d4aed2027dd3b7d62b7201acdeef4ec`, whose subject describes real-image product integration. This is sufficient for a draft candidate, not sufficient for human approval, ownership/rights assertion, or a locked identity.

## Current distribution

| Family | Target | Materialized | Missing |
|---|---:|---:|---:|
| Loafer | 12 | 0 | 12 |
| Lifestyle sneaker | 4 | 1 | 3 |
| Sports shoe | 3 | 0 | 3 |
| Formal lace-up | 3 | 0 | 3 |
| Boot | 3 | 0 | 3 |
| Open footwear | 3 | 0 | 3 |
| Heel or flat | 2 | 0 | 2 |
| Casual closed shoe | 2 | 0 | 2 |
| Children's shoe | 2 | 0 | 2 |
| Unknown/adversarial | 2 | 0 | 2 |

## Exclusion summary

- Seven hero images: storefront-decoration use only, no product-record linkage or rights/original-reference provenance; several show third-party branding and one includes a person.
- One screenshot: explicitly disallowed as Layer A truth and visibly depicts a third-party-branded product.
- Seven `tmp/menuvid` frames: undocumented temporary video extracts with no stable product/source provenance.
- Twelve session/temporary build images: repeated Payload favicons and static Open Graph artifacts, not product evidence.

Exact paths, hashes, and reasons are in `inventories/excluded-candidates.json`. The hero images are not counted as loafers even when their morphology appears loafer-like because visual similarity does not establish that they are original references for the operator's own products.

## Inclusion-quality balance

The current source supplies a clear lateral silhouette, toe, opening, sole edge, seams, visible material regions, and visible color regions. It lacks medial, outsole, rear-center, pair, handedness, authenticated material, and rights/product-link evidence. It is useful for exercising explicit unknown handling and single-view risks, but not a sufficient corpus by itself.

## Required completion path

The operator must supply 35 additional repository-safe originals according to `inventories/missing-source-requirements.json`, beginning with the 12 loafer cases. The existing candidate must receive originality, rights, own-product linkage, and family review. No product is added from hero, generated, screenshot, temporary, or production-only material to improve counts.
