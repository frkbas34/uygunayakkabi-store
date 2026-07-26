# UygunAyakkabi Store

Telegram-first, AI-assisted commerce for the operator's own footwear catalog. Next.js and Payload CMS own product, media, order, lead, stock, job, storefront, and publishing workflows.

## Current scope

- Active channels: Website, Instagram, Facebook, X, and Shopier.
- Hermes/Mentix is the current operator-control layer.
- Shopier is the checkout bridge; native website checkout is deferred.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- n8n is optional fallback glue; OpenClaw is historical/optional.

## Local setup

1. Copy `.env.example` to `.env.local` and provide the required local values.
2. Install dependencies with `npm install`.
3. Start development with `npm run dev`.

Do not treat local environment values as proof of production provider readiness.

## Validation

```powershell
npm run typecheck
npm run lint
npm run test:safe
npm run validate
npm run build
```

Runtime smokes can read a configured Payload database and require explicit `--confirm-read-only`; see `project-control/RUNTIME_SMOKE_CHECKS.md` before running them.

## Canonical documentation

- Agent rules: `AGENTS.md` and `CLAUDE.md`
- Compact ChatGPT Project Source Pack: `chatgpt-project-sources/00_INDEX_AND_UPLOAD_GUIDE.md`
- Latest repository audit: `project-control/REPOSITORY_HEALTH_AUDIT_2026-07-26.md`
- Canonical AI image-platform architecture: `project-control/IMAGE_GENERATION_BLUEPRINT_V1.md`
- Canonical Product Understanding Layer: `project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md`
- Canonical Visual Consistency Engine: `project-control/VISUAL_CONSISTENCY_ENGINE_V1.md`
- Golden Product Set V1 corpus and readiness: `project-control/GOLDEN_PRODUCT_SET_V1.md`
- Deployment operations: `project-control/DEPLOYMENT_OPS_RUNBOOK.md`
- Provider evidence rules: `project-control/PROVIDER_REALITY_AUDIT.md`
