# Publish Policy

_Version: 1.0 — 2026-03-16_

---

## Rule
Nothing is published to any external channel without explicit human confirmation.
This applies to: Instagram, Shopier, Dolap, and any future channel.

## Publication States

| State | Meaning | Who Can Trigger |
|-------|---------|----------------|
| draft | Content prepared, not sent | Mentix (auto) |
| pending_review | Human review requested | Mentix (auto) |
| approved | Human confirmed | Human only |
| published | Sent to channel | System (after approval) |
| rejected | Human declined | Human only |

## Hard Rules
- `auto-publish: never` — no content is published without human in the loop
- Draft generation is always safe and auto-allowed
- Preview is always safe and auto-allowed
- Approval must come through the chat interface, not from inferred intent
- Previously approved templates do NOT automatically approve future posts

## Channel-Specific Gates
Even if global publish is enabled in AutomationSettings:
- upload-post skill still requires per-post confirmation
- This cannot be overridden by skill configuration
- This can only be changed by operator updating this policy file
