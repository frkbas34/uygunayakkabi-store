# ARCHITECTURE — Uygunayakkabi

## High-Level Overview
Uygunayakkabi is being built as a custom commerce system with three evolving layers:

1. Storefront Layer
2. Admin / Operational Layer
3. Future Automation + Content Layer

The project is not intended to remain a simple manually managed storefront.
Its long-term direction is a Telegram-first AI-assisted commerce operation.

## Current Core Stack
- Frontend: Next.js app under `src/app` using App Router
- CMS/Admin: Payload CMS integration under `src/app/(payload)` and `src/collections`
- Shared components: UI and product components under `src/components`
- Backend endpoints: API routes under `src/app/api` and `src/app/(payload)/api`
- Integrations: Telegram-related integration logic under `src/lib/telegram.ts`

## Current Architectural Phase
### Phase 1 — Core Admin System + Storefront Stabilization
Current architectural priority:
- stabilize storefront runtime
- stabilize Payload admin runtime
- confirm collections/components render properly
- validate product/media workflows in practice

### Phase 2 — Automation Backbone
Planned architectural direction:
- n8n workflow orchestration
- Telegram-first product intake
- AI-assisted image handling
- product ingestion and field mapping
- website publishing flow
- Instagram publishing flow
- future Shopier-compatible publishing flow

### Phase 3 — Autonomous Content & Growth Layer
Planned future layer:
- CEO / founder content layer
- product definition generation
- product-to-blog generation
- organic traffic support via content publishing

## Core Domains
### Catalog Domain
Managed through collections such as:
- Products
- Variants
- Media

### Customer Flow Domain
Includes:
- storefront pages
- cart context
- inquiry form
- product browsing experience

### Operations Domain
Includes:
- inventory logs
- inquiry records
- admin-side operational workflows
- future manual override logic

### Integration Domain
Includes:
- Telegram notification / intake direction
- future automation orchestrators
- publishing integrations

## Data and Request Flow
1. User browses product list and details
2. Cart state is managed in app context
3. Inquiry submission reaches API route and can persist/send notification
4. Admin and CMS manage product and media content
5. In the future, automation will be able to create/update products through the same operational model

## Admin Layer Role
Payload CMS is not treated as a basic content panel only.

It is the operational control layer of the business and is expected to support:
- product management
- media/image handling
- category structure
- stock and price updates
- future manual overrides for automation-created records

## Future Automation Direction
The long-term target architecture is Telegram-first.

Desired future workflow:
1. Product photo is taken on phone
2. Sent through Telegram
3. Automation pipeline receives input
4. AI prepares visual set and structured product data
5. Product is created or updated in CMS
6. Product is published to storefront
7. Product is distributed to Instagram
8. Product may later be pushed into Shopier-compatible flows

## Architectural Boundaries
- UI components should remain presentation-focused
- Business/data logic should live in API routes, libs, and collections
- External integrations should be isolated in `src/lib` or future dedicated integration modules
- Automation logic should not bypass the core product model without control rules
- Admin should remain the override/control layer over automation-created data

## Conventions
- Keep route-level concerns inside route folders
- Keep collection schema changes explicit and documented
- Prefer typed server code where possible
- Separate current validated architecture from setup/debug history
