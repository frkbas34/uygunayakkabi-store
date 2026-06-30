# Optional n8n Dispatch Test Checklist

Last updated: 2026-06-30.

This runbook verifies the optional n8n fallback dispatch path:

```text
Product activated -> afterChange hook -> channelDispatch.ts -> optional n8n webhook -> sourceMeta dispatch notes -> ReviewPanel
```

n8n is optional glue. Product intake, Payload state, activation gates, Shopier jobs, and core publishing reliability must still work without any `N8N_CHANNEL_*_WEBHOOK` env var configured.

If no n8n webhook is configured, channel dispatch should stay safe: it logs scaffold intent, records `webhookConfigured=false`, does not throw, and does not block the product flow.

## Allowed Workflow Files

Only active-channel workflows are allowed:

- `n8n-workflows/stubs/channel-instagram.json`
- `n8n-workflows/stubs/channel-shopier.json`
- `n8n-workflows/stubs/channel-facebook.json`
- `n8n-workflows/stubs/channel-x.json`
- `n8n-workflows/channel-instagram-real.json`

Do not add Dolap, Threads, SupplierScout, or other inactive channel workflows.

## Optional Prerequisites

Use this checklist only when intentionally testing n8n fallback behavior.

- n8n is running at `flow.uygunayakkabi.com`.
- One allowed workflow is imported and activated in n8n.
- The matching `N8N_CHANNEL_*_WEBHOOK` env var is set in Vercel.
- Vercel has been redeployed after setting the env var.
- `AutomationSettings.channelPublishing.publish<Channel>` is enabled for the channel being tested.

## Stub Setup

1. Open n8n at `https://flow.uygunayakkabi.com`.
2. Import one allowed stub from `n8n-workflows/stubs/`.
3. Activate the workflow.
4. Copy the production webhook URL.
5. Set the matching Vercel env var, for example:

```text
N8N_CHANNEL_INSTAGRAM_WEBHOOK=https://flow.uygunayakkabi.com/webhook/channel-instagram
```

6. Redeploy the app so the env var is available at runtime.

## Test Product

Create or reuse a safe test product:

- title contains `[TEST]`
- status starts as `draft`
- channel target includes `website` plus the channel being tested
- matching `channels.publish<Channel>` flag is true
- at least one usable image exists
- product passes activation guard if you intend to activate it

Do not use a real catalog product for optional n8n fallback testing unless an operator explicitly approves it.

## Run The Test

1. Activate the prepared test product.
2. Check app logs for a dispatch result.
3. Check n8n executions for the workflow.
4. Check Payload `sourceMeta.dispatchNotes`.
5. Check the Payload admin ReviewPanel dispatch section.

Expected live fallback result:

```text
[channelDispatch] dispatched - channel=<channel> product=<id> httpStatus=200 ok=true
```

Expected scaffold result when n8n is not configured:

```text
[channelDispatch] SCAFFOLD - channel=<channel> product=<id>
```

Scaffold mode is acceptable when n8n is intentionally unconfigured.

## Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `SCAFFOLD` in logs | Env var not set or not deployed | Set env var only if optional n8n fallback is intended |
| `eligible=false` / `not in channelTargets` | Product did not target the channel | Edit product targets |
| `eligible=false` / `globally disabled` | AutomationSettings gate disabled | Enable only for intentional test |
| `dispatched=false`, `fetch failed` | n8n URL wrong or n8n down | Check n8n service and webhook URL |
| `responseStatus: 404` | Workflow inactive or path wrong | Activate workflow and verify `/webhook/` URL |
| relative `/media/*` URL in payload | Blob/server URL issue | Verify production media URLs are public HTTPS |

## Validation

Run these before claiming the optional n8n path is healthy:

```powershell
npm run test:n8n-optional
npm run test:retired-channels
npm run validate
```

`test:n8n-optional` keeps n8n optional, checks the allowed workflow inventory, verifies no package script activates n8n, and confirms Payload-first/draft-first intake guidance remains in place.
