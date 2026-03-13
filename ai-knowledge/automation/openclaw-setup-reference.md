# OpenClaw Setup Reference

_Created: 2026-03-14_
_Purpose: Reusable reference for OpenClaw configuration and troubleshooting_

---

## Config Location
`/home/furkan/.openclaw/openclaw.json`

## Onboarding Selections
- Mode: QuickStart
- Model provider: OpenAI
- Auth: OpenAI API key
- Default model: `openai/gpt-5-mini`
- Channel: Telegram (Bot API)
- Web search: Skipped
- Skills: clawhub, github, gog, xurl (all failed — deferred)
- Hooks: Skipped
- Optional APIs: All skipped (Google Places, Gemini, Notion, image gen, whisper, ElevenLabs)

## Key Config Properties
- Gateway port: 18789
- Gateway mode: local
- Gateway auth token: exists (must be rotated)
- `gateway.controlUi.allowedOrigins`: `["https://agent.uygunayakkabi.com"]`
- Telegram channel: enabled
- Telegram groupPolicy: `allowlist` (empty allowFrom = DM-only)

## Critical Fix: allowedOrigins
Gateway fails with "non-loopback Control UI requires gateway.controlUi.allowedOrigins" if this is not set.
Fix: edit `openclaw.json` → add `"allowedOrigins": ["https://agent.uygunayakkabi.com"]` under `gateway.controlUi`.

## Telegram Pairing Flow
1. User sends DM to bot
2. Bot responds with pairing instructions + Telegram user ID
3. Pairing code generated
4. CLI approval: `openclaw pair approve <code>`
5. After approval, DM starts working

## Dashboard Pairing Flow
1. Navigate to `agent.uygunayakkabi.com`
2. Dashboard asks for gateway token
3. Get tokenized URL via CLI
4. Dashboard requests pairing
5. List pending requests via CLI
6. Approve via CLI
7. Dashboard access granted

## Skill Installation Issues
Failed skills (non-blocking):
- clawhub, github, gog, xurl
- Reasons: Homebrew not installed on Ubuntu, npm DNS resolution failure (EAI_AGAIN)
- Resolution: Defer. Not needed for core Telegram→n8n workflow.

## Troubleshooting

### Gateway restart loop
Cause: incomplete onboarding / missing config.
Fix: re-run onboarding or manually edit openclaw.json.

### 502 on agent.uygunayakkabi.com
Cause: gateway container not on `web` Docker network.
Fix: `docker network connect web openclaw-openclaw-gateway-1`
Long-term: add `web` network to docker-compose.yml.

### API rate limit errors
Cause: OpenAI billing/quota limits or temporary API issue.
Fix: verify OpenAI account billing status, check usage dashboard.
