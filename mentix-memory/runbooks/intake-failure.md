# Runbook: Telegram Intake Failure

_Category: automation | Severity: HIGH | Debugger: product-flow-debugger + uptime-kuma_

---

## Symptom
A message was sent to the Telegram group (with @mentix_aibot mention and/or photo) but no product appeared in Payload CMS admin.

## Diagnostic Sequence

### Step 1 — Check bot status (60 sec)
Is @mentix_aibot responding to DMs?
If not → OpenClaw gateway may be down.
Fix: `docker restart openclaw-openclaw-gateway-1` on VPS.

### Step 2 — Check group policy
Was the message in an allowed group?
Check openclaw.json: `groupAllowFrom: [5450039553, 8049990232]`
Was @mentix_aibot mentioned? (`requireMention: true`)
BotFather Group Privacy must be OFF.

### Step 3 — Check n8n webhook
Is n8n accessible? GET https://flow.uygunayakkabi.com
Is the `mentix-intake` workflow active (not disabled or in test mode)?
The webhook path must be `/webhook/mentix-intake` (not `/webhook-test/`).

### Step 4 — Check Payload endpoint
Does AUTOMATION_SECRET env var match between n8n and Vercel?
Manual test:
```bash
curl -X POST https://uygunayakkabi.com/api/automation/products \
  -H "X-Automation-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"test","price":100,"source":"telegram"}'
```
Expected: 201 Created or 400 with validation errors (not 401).

### Step 5 — Check for duplicate
Was this exact message already processed?
```sql
SELECT * FROM products
WHERE automation_meta->>'telegramChatId' = 'CHAT_ID'
AND automation_meta->>'telegramMessageId' = 'MESSAGE_ID';
```
If found → idempotency guard blocked re-creation. That's correct behavior.

### Step 6 — Check media pipeline
If photo was sent, did media attach?
```sql
SELECT * FROM media WHERE automation_meta->>'telegramMessageId' = 'MESSAGE_ID';
```
If no media record → `/api/automation/attach-media` may have failed.
Check: N8N_INTAKE_WEBHOOK set in Vercel? n8n `Has Media?` branch configured?

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| OpenClaw gateway down | Restart Docker container |
| n8n workflow in test mode | Activate webhook (not test URL) |
| AUTOMATION_SECRET mismatch | Sync env var in Vercel + n8n |
| Message in non-allowlisted group | Add group ID to openclaw.json |
| Duplicate detection triggered | Expected behavior — not a bug |
| n8n not on web Docker network | `docker network connect web n8n` |

## Resolution Record Template
```json
{
  "incident": "intake-failure",
  "telegram_chat_id": "",
  "telegram_message_id": "",
  "root_cause": "",
  "evidence": [],
  "fix_applied": "",
  "resolved_at": ""
}
```
