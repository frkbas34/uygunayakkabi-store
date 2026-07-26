# System Architecture

## Execution boundary

Next.js 16.2 canary and Payload 3.79 run one application. PostgreSQL is the database, Vercel Blob is production media storage when configured, and Payload jobs persist queued work. The new local pure policy resolves before the PostgreSQL adapter: missing, empty, and exact `false` disable Payload schema push; invalid values fail; and exact `true` requires an explicit second confirmation in local development and is forbidden in Vercel, CI, production, builds, tests, and read-only operations. Production still serves the old fail-open config until separately remediated and redeployed.

The repository has no Payload migration manifest or proven pre-activation Vercel migration stage. It uses reviewed SQL plus guarded, dry-run-by-default apply helpers. Image Slot Lineage V1 therefore follows expand-first rollout: add seven nullable/default-free columns while the old runtime is active, verify, deploy the new runtime, and retain the columns during runtime rollback. Automatic Payload schema push is not the production migration mechanism.

## Main flows

```text
Telegram operator / Admin / Storefront APIs
                    |
                    v
          Next.js route handlers
                    |
                    v
        Payload collections/globals
          |                  |
          v                  v
   PostgreSQL + media    Payload jobs
                             |
                    image-gen / shopier-sync
```

Telegram is the primary operator workspace for intake, commands, diagnostics, task feedback, previews, and explicit decisions. Payload remains the durable authority for every state transition; Telegram is not a second database.

Website visibility is native: an eligible active/sold-out Payload product is rendered directly. Instagram, Facebook, and X dispatch use direct provider adapters when fully configured, with optional n8n fallback. Shopier publishing uses `shopier-sync` jobs and the shared readiness gate.

## Registered collections

Core collections: users, products, variants, brands, categories, media, customer inquiries, inventory logs, orders, banners, blog posts, image-generation jobs, bot events, story jobs, and Product Intelligence reports.

SupplierScout collections remain registered for dormant-data compatibility. Registration does not authorize SupplierScout activation.

Globals: Site Settings, Automation Settings, Homepage Merchandising Settings, and dormant SupplierScout Settings.

## Jobs and scheduling

`image-gen` loads reference media, extracts identity facts, generates five sequential slot previews through Gemini by default, evaluates selected fidelity checks, post-processes output, creates preview Media, and returns the decision to Telegram. Approval attaches selected records to `Products.generativeGallery`; downstream Image QC and publishing guards remain separate.

`shopier-sync` performs guarded Shopier synchronization. `vercel.json` invokes `/api/payload-jobs/run` every 30 minutes. The GitHub Actions schedule is disabled; workflow dispatch remains manual.

Protected-brand classification is not part of image-generation eligibility. It remains a downstream concern for claims, human approval, activation, publishing, advertising, Shopier, and external dispatch.

## Proposed direction

The proposed architecture adds a Telegram gateway with uniform authorization, a typed command/callback registry, durable task receipts, and an image orchestrator separated into provider adapters, versioned prompt modules, durable slot results, deterministic transforms, evaluators, and immutable attempts. This is architecture only; the current runtime has not been redesigned.

## Control layers

Payload/Next owns data and execution. Telegram is the operator interface. Hermes/Mentix assists reasoning and operator support. OpenClaw is optional history. n8n is optional transport fallback. None of the agent layers is a second product database or autonomous publisher.
