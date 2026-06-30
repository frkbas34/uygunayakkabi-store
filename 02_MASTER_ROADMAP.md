# Master Roadmap

Last updated: 2026-06-23

The full uploadable roadmap lives in `chatgpt-project-sources/02_MASTER_ROADMAP.md`.

## Build Order

1. Project control center
2. Repo health and validation
3. Core product workflow
4. Mentix/OpenClaw brain
5. Publishing reliability
6. AI images, GEO, product intelligence
7. Storefront conversion
8. Orders, leads, stock, analytics
9. Ads and growth
10. Deployment and ops

## Current Sprint

Phase 0 and Phase 1 rails are usable: agent guidance, source pack, control notes, validation scripts, safe tests, and activation smoke commands are in place.

`npm run validate` now includes a source-pack governance guard so the ChatGPT Project source set stays under 20 docs and keeps active/retired channel decisions aligned.

Phase 2 is active now. Product workflow polish is focused on admin/manual intake, Telegram intake parity, readiness gates, and operator approval.

ReviewPanel readiness now follows central six-dimension publish readiness, so confirmation/content/audit blockers cannot hide behind basic field completeness.

Telegram `/pipeline` diagnostics now share the same usable-media and effective-stock logic as activation/readiness.

Feature work should keep `npm run validate` green.
