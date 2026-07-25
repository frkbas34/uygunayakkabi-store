# Bot Ownership

Last updated: 2026-07-24

## Payload And Next

Own products, media, storefront, publishing logic, jobs, orders, leads, stock,
and database state. This is the execution layer and source of truth.

## Hermes And Mentix

Hermes is the current agent-control layer. Mentix/Uygunops is the Telegram
operator identity for product intake, diagnostics, image/content assistance,
publishing helpers, leads, orders, funnels, and manual ad preparation.

Mentix may reason, diagnose, and draft. Payload/Next performs commerce writes,
publishing, and job execution.

## GeoBot

GeoBot is the app-side content, GEO/SEO, audit, product-intelligence, preview,
and operator-approved publishing support surface. It must not invent product
claims or publish without the app's gates and operator approval.

## OpenClaw

Historical/optional skill host only. It is useful only after an explicit
reactivation decision and VPS verification. Repo templates are not proof of a
running OpenClaw service. Its legacy `scripts/vps-deploy.sh` exits without both
`--reactivate-openclaw` and `--confirm-vps-sync`; those flags are not a
substitute for the required read-only VPS verification evidence.

## n8n

Optional fallback glue for a verified current need. It is not the system brain,
database, or default intake/publishing route.

## SupplierScout

Dormant. Do not activate its webhook, cron, supplier intake, or supplier-product
automation while the own-products-only decision remains in force.
