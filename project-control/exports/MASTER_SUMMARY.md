# MASTER PROJECT SUMMARY — Uygunayakkabi / Mentix
_Consolidated: 2026-03-16_

---

## 1. Project Overview

**Uygunayakkabi** is a Telegram-first, AI-assisted, multi-channel commerce engine for a Turkish footwear and accessories brand. The technical name for the bot/agent layer is **Mentix**.

The system allows the business owner to photograph a product, send it to a Telegram group, and have the product automatically appear on the storefront with media, metadata, idempotency protection, and admin review — all without touching a keyboard beyond the phone.

The long-term vision extends to multi-channel publishing (Instagram, Shopier, Dolap), AI-generated SEO blog posts, visual expansion (additional product angles), and a photo-based try-on feature.

---

## 2. Current Objective

Complete **Step 11 — Caption Parser Enhancement**: make the Telegram intake format more structured and reliable so all product fields (title, price, SKU, quantity, family, type) land cleanly in Payload without manual admin correction.

---

## 3. Current Active Priorities

1. **Step 11**: Caption parser — structured format, SKILL.md update on VPS, n8n field mapping
2. **OQ-001**: Fix duplicate D-numbers in DECISIONS.md
3. **Step 12**: Validate automation product end-to-end on live storefront
4. **OQ-002**: Add 3rd Telegram group member to allowlist
5. **OQ-005**: Verify `autoActivateProducts` toggle is actually wired in n8n

---

## 4. Confirmed Decisions

| Area | Decision |
|------|---------|
| Stack | Next.js + Payload CMS + Neon PostgreSQL + Vercel |
| Hosting | Vercel (storefront/admin) + Netcup VPS (bot/automation) |
| Bot layer | OpenClaw + GPT-5 mini |
| Workflow engine | n8n (self-hosted) |
| Media | Vercel Blob Storage in production |
| Auth for automation | X-Automation-Secret header (not Payload API key auth) |
| Product status default | Draft (configurable toggle in AutomationSettings) |
| Idempotency | telegramChatId + telegramMessageId pair |
| Publish guard | Price > 0 required to activate; draft slugs → 404 |
| SKU standard | `TG-{PREFIX3}-{msgId}` for automation, `{PREFIX3}-{TIMESTAMP36}` for manual |
| Channel control | Per-channel toggles in AutomationSettings + per-product override |
| Source of truth | Payload CMS — all channels publish from here, never independently |

---

## 5. Current Tech / System Architecture

```
Phone → Telegram (@mentix_aibot)
  → OpenClaw (VPS, agent.uygunayakkabi.com)
      mentix-intake skill v2.0
  → n8n webhook (VPS, flow.uygunayakkabi.com)
      Parse Fields → Map → Create Product → Attach Media
  → Payload CMS (Vercel, uygunayakkabi.com/admin)
      Draft product + media in Neon PostgreSQL
  → Admin reviews → "Aktif Yap"
  → Storefront (uygunayakkabi.com)
```

Full stack: Next.js 16.2.0-canary.81, Payload CMS 3.79.0, Neon PostgreSQL, Vercel Blob, OpenClaw, n8n, Caddy, Docker, Ubuntu 22.04.5, Cloudflare DNS.

---

## 6. Product / Feature State

| Feature | State |
|---------|-------|
| Storefront | ✅ Live |
| Admin panel | ✅ Live |
| Automation pipeline (Steps 1–10) | ✅ Live |
| Caption parser (Step 11) | 🔲 In progress |
| Multi-channel distribution (Instagram/Shopier/Dolap) | 🔲 Planned |
| AI SEO blog engine | 🔲 Scaffolded (collection exists, no workflow) |
| Visual expansion engine | 🔲 Planned |
| Photo-based try-on | 🔲 Future |
| Mentix skill stack expansion | 🔲 Not started |

---

## 7. Workflows / Operations

**Product Intake (live)**
Telegram photo + caption → mentix-intake skill → n8n → Payload draft → admin review → activate

**Admin Review Flow**
Payload admin → Products list (Source badge, Status column) → Click product → ReviewPanel shows readiness checklist → "Aktif Yap" button → publish guard → active → storefront

**Git Sync Protocol**
Always `git pull origin main` before work. Always push before switching machines.

**VPS Operations**
SSH to `furkan@152.53.152.233`. Config at `/home/furkan/.openclaw/openclaw.json`. Skill file edits hot-reload (no restart needed). Container restart: `cd /opt/openclaw && docker compose restart`.

---

## 8. Risks / Gaps / Conflicts

| Risk | Severity | Status |
|------|----------|--------|
| Duplicate D-numbers in DECISIONS.md | Medium | Unresolved |
| `autoActivateProducts` toggle may not be wired in n8n | Medium | Unverified |
| `lockFields` behavior not implemented in code | Low | Unverified |
| `push: true` in production | Medium | Deferred |
| n8n API key may not have been rotated | Low | Unverified |
| Automation product media URL not verified in production | Low | Step 12 |

---

## 9. Recommended Next Steps

1. **Immediately**: Fix DECISIONS.md duplicate D-numbers (prevents future confusion)
2. **Step 11**: Update mentix-intake SKILL.md on VPS with structured caption format spec
3. **Step 12**: Send a test product from Telegram → confirm live storefront shows it correctly with Blob images
4. **Verify**: `autoActivateProducts` toggle wiring in n8n (OQ-005)
5. **Add**: 3rd Telegram allowlist user when ID is available

---

## 10. One-Paragraph Executive Summary

Uygunayakkabi is a working Telegram-first commerce system for a Turkish footwear brand. As of 2026-03-16, Phase 1 (admin + storefront) and Phase 2A automation pipeline (Steps 1–10) are fully live and validated: a business owner can photograph a product on their phone, send it with a caption to a Telegram group, and within seconds have a draft product with media appear in the Payload CMS admin panel for review and activation onto the live storefront — with full duplicate protection, idempotency, admin review UX, stock tracking, and publish guard. The immediate next priority is refining the caption parsing format (Step 11) to make field extraction more reliable. Following that, the system expands into multi-channel distribution (Instagram, Shopier, Dolap), AI-generated SEO blog content, visual expansion, and the Mentix intelligence layer (skill stack installation, learning engine, product data flow debugging). All infrastructure is stable and production-ready.

---

## CHANGELOG OF UNDERSTANDING

### Confirmed across multiple sessions
- Stack is Next.js + Payload + Neon + Vercel — never changed
- OpenClaw + n8n on VPS — confirmed working
- Telegram group mode with allowlist — active
- All automation steps 1–10 completed in one session (2026-03-15)

### Conflicts resolved
- `useAPIKey` auth approach was tried and reverted → `X-Automation-Secret` is the correct approach (D-062)
- Draft-always vs toggle-controlled status → toggle wins (D-053)
- DM-only vs group allowlist → group allowlist wins (D-052)

### What appears newest and should drive decisions
- DECISIONS.md entries D-060 through D-064 (most recent decisions)
- project-control/*.md files updated this session (2026-03-16)
- mentix-intake SKILL.md v2.0 in repo

### What is old and should NOT drive decisions
- ai-knowledge/automation/vps-infrastructure.md Docker network note (now resolved)
- Any chat text claiming `useAPIKey` is the auth approach (reverted)
- Any text suggesting Telegram group is DM-only (superseded by D-052)
- D-049 (DM-only policy) — superseded
- D-051 (always-draft) — superseded
