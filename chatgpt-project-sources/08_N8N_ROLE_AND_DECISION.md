# n8n Role and Decision

n8n is optional glue, not the main project brain. Current default: direct Payload/Next product flow.

Direct provider adapters are preferred when fully configured. Optional `N8N_CHANNEL_INSTAGRAM_WEBHOOK`, `N8N_CHANNEL_FACEBOOK_WEBHOOK`, and `N8N_CHANNEL_X_WEBHOOK` can provide compatibility fallback. A Shopier fallback variable and stub exist, but canonical Shopier publishing is the guarded Payload job path.

The checked-in `n8n-workflows/` directory contains one Instagram workflow plus active-channel-only fallback stubs and a dispatch contract. Repository files are not evidence that workflows are imported, enabled, reachable, or carrying current credentials.

Do not invest in new n8n channel workflows until product intake and publishing reliability are stable. Do not use n8n as a second database, decision engine, or autonomous publisher.
