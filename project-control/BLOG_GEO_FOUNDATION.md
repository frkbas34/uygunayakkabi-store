# Blog / GEO Foundation — Uygunayakkabi

_Status: **documentation only** (D-297). No blog automation, CMS schema, product, or bot changes. Captures current reality + a recommended sequence for a future SEO/GEO blog system._

## Current blog capabilities (VERIFIED in code)

- **Routes:** `/blog` (listing) and `/blog/[slug]` (post). Both `force-dynamic`.
- **Content model (`BlogPosts`):** `title, slug, excerpt, content` (Lexical rich text), `featuredImage, category, tags, status` (published-gated), `publishedAt, author, source, seo{title,description,keywords}, relatedProducts`.
- **Listing:** lists published posts only, has an empty state and Turkish category labels.
- **Post:** `generateMetadata` (Open Graph `article` + `publishedTime`) **and** an `Article` JSON-LD builder (`buildArticleJsonLd` — headline, description, image, datePublished, author, Organization publisher).
- **Canonicals:** added for listing + posts in **D-294**.
- **Crawl foundation:** `sitemap.ts` + `robots.ts` added in **D-295** (sitemap includes blog posts dynamically; `metadataBase` set in the `(app)` layout).

## SEO/GEO gaps (not yet implemented)

1. **OG images on posts** — `generateMetadata.openGraph.images` is not wired from `featuredImage` (the JSON-LD has the image, social cards do not).
2. **Listing structured data** — no `Blog` / `ItemList` JSON-LD; no `BreadcrumbList` on posts.
3. **Pagination** — no `rel=prev/next` or index control for when post count grows.
4. **Taxonomy pages** — no category/tag landing pages.
5. **GEO extractability** — no `FAQPage` schema and no concise, AI-citable summary blocks; author/publisher entity is partial.
6. **Internal linking** — `relatedProducts` exists in the model but is underused on the listing and product side.
7. **Rendering tradeoff** — `force-dynamic` favors freshness over crawl performance; ISR/revalidate is worth weighing later.

## Recommended sequence

1. ~~metadataBase + canonicals~~ — **done (D-294)**.
2. ~~sitemap + robots~~ — **done (D-295)**.
3. OG images on blog posts (wire `featuredImage`).
4. Structured data: `BreadcrumbList` on posts, `Blog`/`ItemList` on the listing.
5. Category/tag landing pages.
6. Internal linking (blog → product, product → related guides).
7. GEO polish: `FAQPage` schema, summary blocks, firm author/publisher entity.

## Product comparison article idea

"X vs Y" comparison posts (e.g. _"Nike Air Max vs New Balance 574 — hangisi size uygun?"_) using `category=product` + `seo` fields and linking `relatedProducts`. Strong for classic SEO (comparison queries) and GEO (AI engines readily cite structured comparisons). Template: intro → comparison table → use-case recommendation → linked product cards + WhatsApp/lead CTA.

## Category landing page idea

Editorial category landers (e.g. `/blog/kategori/<cat>` or storefront `/ayakkabilar/<cat>`) with a short intro, a curated product strip, and an FAQ block. Captures category head terms and gives AI engines a citable category overview. Reuse the existing `CATEGORY_LABELS` mapping.

## Internal linking idea

- **Post → products:** render `relatedProducts` as product cards at the foot of each post.
- **Product → guides:** show "ilgili rehberler" (blog posts referencing the product/category) on the PDP.
- **Home/footer → top posts.**
- Use consistent, keyword-aware anchor text (brand/category) to build topical authority and clean internal-link graphs for AI crawlers.

## Constraints honored

No blog automation, no CMS schema change, no product changes, no bot/automation changes. All current SEO/GEO work (D-294, D-295) is storefront-only and committed locally on `website-sweep`.
