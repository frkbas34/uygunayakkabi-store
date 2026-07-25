# UygunAyakkabi Operator Runbook

Last updated: 2026-07-25

This is the daily operator guide. It describes the current local product and
diagnostic workflow. It is not deployment approval, proof of provider health,
or permission to queue, publish, spend, or change production data without an
operator decision.

## Operating Boundaries

- Payload/Next is the source of truth for products, media, orders, leads,
  stock, publishing state, bot events, and jobs.
- Hermes is the current agent-control layer. Mentix/Uygunops is the Telegram
  operator interface. OpenClaw is historical/optional unless explicitly
  reactivated.
- Sell and upload our own products only.
- Active channels: Website, Instagram, Facebook, X, Shopier.
- Dolap and Threads are retired. SupplierScout is dormant.
- n8n is optional glue only. Do not build or activate an n8n workflow as part
  of normal daily operation.
- Shopier remains the checkout bridge. Website-native checkout is deferred.

## First Principle

Read current Payload evidence before taking an action. A product being active
or a command being available does not prove that every external channel,
provider, webhook, or Shopier operation is ready or completed.

Use `/productflow <id-or-sn>` as the product-level source of operator truth.
It includes readiness, lifecycle, Image QC, brand safety, Shopier queue state,
dispatch state, coherence warnings, links, and the next recommended step.

## Daily Read-Only Sequence

1. Start in Telegram with `/smokeplan`.
   Follow its order. The plan starts with local read-only checks and verifies
   Telegram access before any live Telegram read.
2. Run the catalog planning checks selected by the plan:

   ```powershell
   npm run smoke:load-plan:read -- --confirm-read-only
   npm run test:telegram-access
   npm run smoke:brand-safety:read -- --confirm-read-only
   npm run smoke:image-qc-plan:read -- --confirm-read-only
   ```

   Then read `/loadplan`, `/brandplan`, and `/imageqcplan` in Telegram. The
   Image QC queue is read-only and routes protected-brand rows back to
   provenance review before any image work.
3. Select a product from the worklist and inspect it before changing it:

   ```powershell
   npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
   npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
   ```

   Then use `/productflow <id-or-sn>` and `/imageplan <id-or-sn>`.
4. Before relying on channels or providers, run:

   ```powershell
   npm run smoke:provider-health:read -- --confirm-read-only
   ```

   Then read `/diagnostics`. Provider health reports configured readiness only;
   it does not call a provider or prove a live publish.

   Meta setup rule: Instagram OAuth stores the access token and Instagram
   Business Account ID in Payload AutomationSettings. Facebook direct posting
   reads its Page ID only from deployment env `INSTAGRAM_PAGE_ID`; do not add
   or edit a `facebookPageId` field in Payload. Record key names, never values.
5. Review operational state before catalog, follow-up, or manual advertising
   decisions:

   ```powershell
   npm run smoke:business-funnel:read -- --period=week --confirm-read-only
   npm run smoke:lead-followup:read -- --confirm-read-only
   ```

   Then read `/business`, `/funnel week`, and `/leadplan`.
6. Before considering manual paid traffic, run the storefront checks in the
   smoke plan, then use `/adready <id-or-sn>` and `/adreport week`. These are
   decision support only. They never create campaigns, pixels, posts, API
   calls, or spend.
7. Review Shopier only after the preceding evidence is clear. See the Shopier
   section below.

Stop when a read identifies a blocker. Fix the blocker or record the decision;
do not skip ahead by forcing an unrelated command.

## Product Workflow

### Inspect Before Changing

Use `/productflow <id-or-sn>` first. Follow its ordered primary step. Common
read-only supporting commands are:

| Command | Purpose |
| --- | --- |
| `/pipeline <id-or-sn>` | Legacy lifecycle view; use Product Flow for the fuller current view. |
| `/imageqc <id-or-sn>` | Inspect Image QC evidence. |
| `/imageplan <id-or-sn>` | See safe review, preview, rejection, or regeneration guidance. |
| `/imageqcplan [limit]` | Read batch Image QC triage; open the row-provided Image Plan before any QC or generation action. |
| `/brandplan` | Review protected-brand remediation priorities without edits. |
| `/brandreview <id-or-sn> ...` | Preview provenance review; confirmation only records an audit event. |
| `/content <id>` | Read content state or use explicit trigger/retry when Product Flow directs it. |
| `/audit <id>` | Read audit state or run an explicit audit after its prerequisites are met. |

### Deliberate Write Steps

These commands can write data, queue work, or call an enabled provider. Run
them only after the relevant read-only evidence and human review:

| Command | Effect and hold |
| --- | --- |
| `#gorsel <id>` | Requests image generation. Review preview and Image QC before use. |
| `/confirm <id>` | Starts/continues the product confirmation wizard. Verify category, price, sizes, stock, brand, and channel intent. |
| `/content <id> trigger` or `retry` | Queues/retries content work only after confirmation supports it. |
| `/audit <id> run` | Runs/re-runs audit after content is available. |
| `/activate <id>` | Changes product state only when readiness passes. It does not prove every external channel was published. Review the resulting Product Flow and dispatch state. |
| `/stok <id>` or approved admin stock edit | Changes stock only after the product and variant are checked. |

Protected-brand matches are hard blockers for activation. Do not use a manual
override to bypass them. `/brandreview` records evidence only; it does not
rewrite product text, clear a block, stop a sale, or publish a product.

## Images And Claims

- Originals and approved generated images stay separate. Do not replace an
  original silently.
- Treat Image QC REVIEW or FAIL as a reason to inspect `/imageplan`, not a
  reason to publish.
- Use `/imageqcplan` before batch image work. It does not record QC or start
  generation, and protected-brand rows stay in provenance review first.
- For a protected-brand product, `/productflow` and `/imageplan` must lead with
  preview-first `/brandreview <id-or-sn> needs-evidence`; do not perform Image
  QC, generation, activation, Shopier, redispatch, or ad work first.
- After a confirmed provenance review, re-run those reads. They show the latest
  recorded evidence, copy-fix, or keep-excluded next step but never remove the
  protected-brand safety block.
- Keep product claims supported by product facts and operator evidence. Do not
  invent brand, material, health, performance, provenance, or discount claims.
- AI assistance drafts content and images; an operator owns approval.

## Shopier Queue And Retry

Shopier controls are preview-first. Read these before any confirmation:

```text
/shopier dashboard
/shopier publish-ready
/shopier errors
/shopier retry-errors
```

For every row that may be queued or retried, run the displayed product-flow
handoffs first:

```text
/productflow <ref>
npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only
```

Then verify `SHOPIER_PAT`, webhook URL/token, account permissions, and quota
outside Telegram. Do not paste secrets into chat. The D-481 unique order-ID
index is applied and read-only verified in the configured database; it does not
replace a separate operator-approved live webhook delivery smoke.

Only after the evidence, credential verification, and explicit operator
approval may an operator use a `confirm` form of `/shopier publish-ready` or
`/shopier retry-errors`, or a single `/shopier publish|republish <id>` command.
Those paths queue work; they are not proof of a successful Shopier API result.
Read `/shopier dashboard`, `/shopier status <id>`, and Product Flow afterward.

Before any live webhook testing, run the local preflight:

```powershell
npm run test:shopier-webhook-local
```

## Leads, Orders, And Stock

Start from safe reads:

| Command | Purpose |
| --- | --- |
| `/business` | Owner-level lead, order, revenue, and stock urgency summary. |
| `/funnel [week|month]` | Attribution and funnel summary. |
| `/leadplan` or `/followupplan` | Prioritized manual lead follow-up suggestions. |
| `/inbox leads`, `/inbox orders`, `/orders`, `/order <id>` | Desk views with Payload admin links. |
| `/orderreminders` | Order follow-up visibility. |

`/ship <id>`, `/deliver <id>`, and `/cancelorder <id>` are state-changing
operator actions. Verify the order first. Delivered orders cannot be cancelled
through Telegram. A manual cancellation does not restore stock automatically;
use the approved restock process when stock must return.

## Ads, Stories, And Publishing

- `/adready`, `/adpack`, and `/adreport` are manual, operator-controlled
  support. There is no autonomous ad spend.
- Story jobs remain governed by protected-brand safety. Do not assume a story
  job means a social platform post occurred.
- The Website is the native storefront. Instagram, Facebook, X, and Shopier
  each have independent provider, dispatch, and error state. Review that state
  instead of assuming activation publishes all targets.

## Escalation And Release Work

For deployment, rollback, environment inventory, webhooks, cron/job runners,
schema changes, commit, branch, push, or PR steps, use
`project-control/DEPLOYMENT_OPS_RUNBOOK.md`. It has separate approval gates.

Do not perform any of the following from this daily guide without an explicit
operator request:

- apply additional DDL or schema migrations;
- deploy, roll back, change environment values, or register webhooks/cron;
- stage, commit, push, create a branch, or open a PR;
- run live provider probes, external dispatch, queue work, or live webhook
  smoke beyond the explicit approval boundary;
- activate SupplierScout, Dolap, Threads, optional OpenClaw, or a new n8n flow;
- create campaigns, pixels, CAPI integrations, or ad spend.

## Handoff Notes

Record material roadmap, architecture, bot, channel, or approval changes in
the existing `chatgpt-project-sources` documents so the manually uploaded
ChatGPT Project source pack stays current. Keep the pack at 20 Markdown
documents or fewer.
