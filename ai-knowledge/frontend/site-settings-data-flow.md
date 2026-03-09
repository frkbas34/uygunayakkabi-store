# SOURCE MODULE

## MODULE ID
UYGUNAYAKKABI-SITE-SETTINGS-DATA-FLOW-V1

## Domain Category
Frontend / Data Architecture

## Core Purpose
Document how SiteSettings global and Banners collection flow from Payload CMS to the storefront UI.

## Data Flow Pattern

```
Payload CMS (Admin Panel)
  ├── SiteSettings global → populated by admin
  └── Banners collection → created by admin
         │
         ▼
page.tsx (Server Component)
  ├── payload.findGlobal({ slug: 'site-settings' })
  ├── payload.find({ collection: 'banners', where: { active: true } })
  └── Serializes into plain objects with safe fallbacks
         │
         ▼
<App siteSettings={...} banners={[...]} />  (Client Component)
  ├── S = siteSettings || DEFAULT_SETTINGS
  ├── <AnnouncementBar settings={S} />
  ├── <Navbar settings={S} />
  ├── <Home settings={S} banners={banners} />
  │     ├── Trust badges: S.trustBadges.monthlyCustomers, satisfactionRate
  │     ├── Promo banner: first banner with placement=hero or type=discount
  │     └── WhatsApp links: S.contact.whatsappFull
  ├── <Detail settings={S} />  (WhatsApp links)
  └── <Foot settings={S} />    (contact info)
```

## Fallback Strategy
- `DEFAULT_SETTINGS` in UygunApp.jsx mirrors the SiteSettings default values
- If `payload.findGlobal()` throws (table not yet created), `siteSettings` is `null`
- App component: `const S = siteSettings || DEFAULT_SETTINGS`
- Each component additionally null-checks: `settings?.contact || DEFAULT_SETTINGS.contact`

## Key Configuration Points (SiteSettings)
- `contact.whatsapp`: Display number (e.g., "0533 152 48 43")
- `contact.whatsappFull`: wa.me link number (e.g., "905331524843")
- `shipping.freeShippingThreshold`: Used in announcement bar and "Why Us" text
- `trustBadges.monthlyCustomers`: Hero floating badge + Why Us card
- `trustBadges.satisfactionRate`: Why Us card title
- `announcementBar.enabled/text/bgColor`: Top announcement bar

## Banner Rendering Logic
- `page.tsx` fetches all active banners sorted by sortOrder
- `Home` component finds first banner with `placement === 'hero'` or `type === 'discount'`
- Renders banner title, subtitle, discountPercent, couponCode, bgColor, textColor
- Falls back to hardcoded "Sezon Sonu İndirimi %40" if no matching banner

## Reuse Value
Useful for:
- Adding new admin-controlled content sections
- Phase 2: when Telegram automation needs to create banners
- Understanding the full data flow from admin to frontend

## Hierarchy Suggestion
Core Architecture Module
