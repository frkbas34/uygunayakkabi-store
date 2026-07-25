# Provider Reality Audit

Last updated: 2026-07-25

## D-403 Provider reality audit

Status: local-only audit guardrail, not a provider call, not production proof.

This file defines how to prove provider reality without leaking secrets or accidentally spending credits. Local env presence checks are useful diagnostics, but they are not proof that production providers are configured, funded, permitted, or live.

## Scope

Provider reality covers:

- Channel publishing providers: Website, Instagram, Facebook, X, Shopier.
- Product Intelligence and GEO providers: Gemini, Google Vision, DataForSEO, SerpAPI, and effective reverse-search selection.
- Fallback webhooks: `N8N_CHANNEL_*_WEBHOOK`.

## What Current Checks Prove

The existing read-only checks prove only local diagnostic state:

- `npm run smoke:provider-health:read -- --confirm-read-only` reads Payload AutomationSettings and local env names, then prints channel provider state and missing key names only.
- `npm run smoke:pi-provider-health:read -- --confirm-read-only` loads local env files and evaluates Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without Payload access.
- `npm run test:provider-health` covers channel provider-health formatter and secret-safe missing-key reporting.
- `npm run test:pi-provider-health` covers Product Intelligence credential presence, partial credentials, reverse-search selection, explicit provider preference behavior, and secret-safe formatting.

These checks do not verify production env values, account balance, quota, webhook reachability, provider permissions, OAuth validity, Shopier remote access, or actual content/search/image generation.

## X Execution Contract

Local code treats X OAuth as an all-or-nothing direct-provider contract:
`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET` are
all required for a direct X API attempt. When one or more are absent, the app
uses `N8N_CHANNEL_X_WEBHOOK` only if that optional fallback is configured.
Without it, the dispatch result records the missing key names and makes no
direct provider call. This guard prevents avoidable failures from partial local
configuration; it is not evidence that any production credential, webhook,
account permission, or quota is valid.

## Meta Media Contract

Direct Instagram and Facebook dispatch select any public `https://` image in a
product gallery. A relative or insecure first item does not force optional n8n
fallback when a later public image exists. The local tests mock direct adapter
responses; they do not prove that production media is publicly reachable or
that Meta accepts the selected image.

When no public `https://` image exists, Instagram/Facebook dispatch fails before
either direct Meta or optional n8n fallback is called. A fallback webhook can
still be reported as configured, but it must not receive relative media that it
cannot fetch.

## Meta Credential Source Contract

Direct Instagram publishing reads the OAuth access token and Instagram Business
Account ID from Payload AutomationSettings. Direct Facebook publishing reads
the same access token plus deployment env `INSTAGRAM_PAGE_ID`. The Page ID is
not a Payload field: `facebookPageId` was removed from the schema. Provider
health uses this same source and reports the key name only when it is absent.
Never paste the ID, token, or secret into chat or project notes.

## Production Evidence Required

Do not mark a provider as production-ready until the operator records current evidence for that provider:

- Environment source checked in the production hosting/control panel without exposing values.
- Required key names present, not secret values.
- Account balance/quota/permission page checked where relevant.
- Webhook endpoint or direct API path verified by an approved read-only or no-op probe where available.
- Provider-specific failure mode recorded if unavailable.
- Date, operator, and evidence location recorded in project-control notes.

## Operator Evidence Record

Before a provider is called, create one dated, secret-safe evidence record in
`project-control/PROJECT_STATE.md` and `project-control/DEPLOYMENT_LOG.md`.
Update the ChatGPT source pack only when the result changes an architecture,
roadmap, channel, bot, or approval decision. Record:

- operator, date/time, deployed revision, and environment/control panel used;
- provider/channel, direct versus optional fallback path, and purpose;
- required credential or configuration **names** verified, never their values;
- account permission, token/session validity, and quota/balance result;
- the approved probe or product reference, with no customer data or secrets;
- outcome, failure reason, and the next safe action or rollback reference.

For Instagram/Facebook, also record the selected public HTTPS gallery URL and
whether the direct Meta or explicitly configured optional n8n path was reviewed.
For X, record whether all four OAuth key names were confirmed or an explicit
`N8N_CHANNEL_X_WEBHOOK` fallback is the intended path. For Shopier, record
webhook HMAC readiness, account permission, quota, and whether the test is
read-only, queueing, or a separately approved live delivery. For Gemini,
Google Vision, DataForSEO, and SerpAPI, record the selected capability and
quota/permission result before any paid or generation request.

This record is evidence, not authorization. Any dispatch, queueing, provider
call, live webhook delivery, or spend still needs the applicable explicit
operator approval.

## Guardrails

- Do not print, copy, commit, or paste secret values.
- Do not call Gemini, Google Vision, DataForSEO, SerpAPI, Meta, X, Shopier, or n8n from this audit without explicit operator approval.
- Do not spend credits or start paid provider work.
- Do not queue jobs, publish products, dispatch channels, or run live Telegram commands from this audit.
- Do not treat local env readiness as production readiness.
- Do not activate SupplierScout or revive Dolap/Threads while auditing providers.

## Operator Audit Sequence

1. Run local validation first: `npm run validate`.
2. Run safe local/read-only visibility only if the operator wants current local env diagnostics:
   - `npm run smoke:provider-health:read -- --confirm-read-only`
   - `npm run smoke:pi-provider-health:read -- --confirm-read-only`
3. In production hosting/control panels, verify required key names without copying secret values.
4. In provider dashboards, verify account status, quota/balance, and permissions.
5. Record findings in `project-control/PROJECT_STATE.md`, `project-control/DEPLOYMENT_LOG.md`, and the ChatGPT source pack.
6. Only after explicit approval, run any live provider/webhook probe.

## Current Known Local Evidence

Latest recorded local evidence on 2026-07-25:

- Channel provider-health smoke: Website ready, Instagram disabled in AutomationSettings, Facebook ready/direct through the local `INSTAGRAM_PAGE_ID` contract, X missing OAuth/webhook, Shopier missing `SHOPIER_PAT`/webhook.
- Product Intelligence provider-health smoke: Gemini text/image ready locally; no reverse-search provider selectable because Google Vision, DataForSEO, and SerpAPI credentials were missing locally.

This evidence is useful for local planning only. Production provider reality remains unproven until the operator records current production evidence.
