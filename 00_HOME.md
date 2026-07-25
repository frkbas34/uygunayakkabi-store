# UygunAyakkabi Project Home

Last updated: 2026-07-25

This is the Obsidian entry point for the project. Read these five root notes
before changing architecture, bots, channels, or roadmap priorities.

## System Snapshot

- UygunAyakkabi is a Telegram-first, AI-assisted commerce system for our own products only.
- Payload/Next is the source of truth and execution layer.
- Hermes is the current agent-control layer; Mentix/Uygunops is the Telegram operator identity.
- OpenClaw is historical/optional until explicitly reactivated and verified.
- n8n is optional fallback glue, not the default workflow path.

## Current Focus

1. The D-380-D-500 master-build stack is merged into `main` through PR #6 and
   Vercel Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready.
   Desktop storefront smoke passes, while the 390px PDP smoke found a 50px
   fixed-CTA overflow. D-501 fixes it locally and awaits deploy/re-smoke.
2. Resolve protected-brand catalog blockers through `/brandplan`; protected-brand matches cannot be manually activated, then scale verified own products with image QC and controlled publishing.
3. Keep the active storefront and Shopier bridge trustworthy before ads.
4. Keep direct X publishing behind the complete OAuth requirement, and all
   Meta dispatch behind at least one public HTTPS gallery image.
5. Run database or live-integration checks only with operator approval.

## Control Notes

- [[01_CURRENT_TRUTH]]
- [[02_MASTER_ROADMAP]]
- [[03_BOT_OWNERSHIP]]
- [[04_ACTIVE_DECISIONS]]
- [ChatGPT source pack](chatgpt-project-sources/00_INDEX_AND_UPLOAD_GUIDE.md)
- [Master plan completion audit](chatgpt-project-sources/19_MASTER_PLAN_COMPLETION_AUDIT.md)
- [Daily operator runbook](project-control/OPERATOR_RUNBOOK.md)
- [Deployment and release runbook](project-control/DEPLOYMENT_OPS_RUNBOOK.md)
- [Codex guidance](AGENTS.md)
- [Claude guidance](CLAUDE.md)

## Daily Control Loop

1. Read the current truth and active decisions.
2. For operations, start with `/smokeplan` and follow its read-only sequence.
3. Run `npm run validate` before considering a local change ready.
4. Update the matching ChatGPT source-pack note whenever architecture, bot,
   channel, or roadmap truth changes.
5. Do not treat local code as deployed or provider-ready without live evidence.
