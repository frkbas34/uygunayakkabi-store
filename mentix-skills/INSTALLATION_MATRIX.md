# Mentix Skill Stack — Installation Matrix

_Created: 2026-03-16_
_Status: Ready for VPS deployment_

---

## 1. CURRENT STATE AUDIT

### What Already Exists
| Component | Status | Location |
|-----------|--------|----------|
| mentix-intake skill | ✅ LIVE | VPS: `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md` |
| OpenClaw gateway | ✅ Running | VPS Docker, port 18789 |
| Telegram bot (mentix_aibot) | ✅ Connected | OpenClaw Telegram channel |
| n8n workflow engine | ✅ Running | VPS Docker, `flow.uygunayakkabi.com` |
| Payload CMS + automation API | ✅ LIVE | Vercel, `uygunayakkabi.com/admin` |
| Storefront | ✅ LIVE | Vercel, `uygunayakkabi.com` |
| PostgreSQL (Neon) | ✅ Running | Cloud-hosted |
| Caddy reverse proxy | ✅ Running | VPS Docker |
| Channel dispatch stubs | ✅ Created | Repo: `n8n-workflows/stubs/` |
| Project memory docs | ✅ Maintained | Repo: `project-control/` |

### Failed Previous Skill Installs
| Skill | Reason | Impact |
|-------|--------|--------|
| clawhub | Homebrew not available on Ubuntu | Non-blocking |
| github | npm DNS resolution failure (EAI_AGAIN) | Non-blocking |
| gog | Same as above | Non-blocking |
| xurl | Same as above | Non-blocking |

### Identified Gaps
- No monitoring/health check system
- No structured memory system for operational learning
- No security vetting process for new additions
- No image processing pipeline
- No content publishing workflow beyond channel stubs
- No research/intelligence capability
- No backend architectural advisory
- No self-improvement/learning loop

---

## 2. SKILL INSTALLATION MATRIX

| # | Skill | Purpose | Level | Install Status | Activation | Risk | Dependencies | Prerequisites |
|---|-------|---------|-------|---------------|------------|------|--------------|---------------|
| 1 | **skill-vetter** | Security/quality gateway for new skills | A | ✅ READY | Active immediately | LOW | None | None |
| 2 | **browser-automation** | Web inspection, screenshot, verification | A | ✅ READY | Active (READ-ONLY) | LOW | None | Browser access from OpenClaw |
| 3 | **sql-toolkit** | Database diagnostics and analysis | A | ✅ READY | Active (READ-FIRST) | MEDIUM | DATABASE_URI | DB credentials in OpenClaw env |
| 4 | **agent-memory** | Structured operational memory | A | ✅ READY | Active immediately | LOW | Filesystem access | Data dir created on VPS |
| 5 | **github-workflow** | Repo state, issues, PR support | A | ✅ READY | Active immediately | LOW | GitHub CLI or API | GitHub token or SSH key on VPS |
| 6 | **uptime-kuma** | Service health monitoring | A | ✅ READY | Active immediately | LOW | HTTP access | None |
| 7 | **eachlabs-image-edit** | Product image enhancement | B | ✅ READY | Controlled (approval-per-op) | MEDIUM | Image API key, Blob token | API credentials configured |
| 8 | **upload-post** | Social media content drafting | B | ✅ READY | Controlled (draft-only) | MEDIUM | Channel API access | Channel integrations live |
| 9 | **research-cog** | Market research, competitor intel | B | ✅ READY | Controlled (info-only) | LOW | Web search access | None |
| 10 | **senior-backend** | Architecture & backend advisory | B | ✅ READY | Controlled (advisory-only) | LOW | Codebase access | None |
| 11 | **learning-engine** | Self-observation, scoring, proposals | C | ✅ READY | Observe-only | LOW | agent-memory | Memory system active |

---

## 3. ACTIVATION LEVELS

### LEVEL A — Active from Day One (6 skills)
These skills are safe to enable immediately. They operate in read/inspect/diagnostic mode by default.

**Deployment order:**
1. `agent-memory` — Foundation for all other skills to store/retrieve context
2. `skill-vetter` — Gateway must be active before adding more skills
3. `sql-toolkit` — Core diagnostic capability
4. `github-workflow` — Development workflow support
5. `uptime-kuma` — Health monitoring
6. `browser-automation` — Visual verification

### LEVEL B — Installed but Controlled (4 skills)
These skills are installed but operate with explicit approval gates on every action.

**Constraints:**
- `eachlabs-image-edit` — Single image + user approval per operation
- `upload-post` — Draft-only mode, no auto-publishing
- `research-cog` — Informational output only, no automated actions
- `senior-backend` — Advisory only, no auto-implementation

### LEVEL C — Observe-First (1 skill)
- `learning-engine` — Observe, log, score, summarize, propose. NEVER auto-modify.

---

## 4. DEPLOYMENT PROCEDURE

### Step 1: Copy skill files to VPS
```bash
# From local machine, copy skills to VPS
scp -r mentix-skills/* furkan@VPS_IP:/home/furkan/.openclaw/skills/
```

### Step 2: Verify directory structure on VPS
```bash
ls -la /home/furkan/.openclaw/skills/
# Should show: mentix-intake/ skill-vetter/ browser-automation/ sql-toolkit/
#              agent-memory/ github-workflow/ uptime-kuma/ eachlabs-image-edit/
#              upload-post/ research-cog/ senior-backend/ learning-engine/
```

### Step 3: Create agent-memory data directory
```bash
mkdir -p /home/furkan/.openclaw/skills/agent-memory/data/{incidents,patterns,knowledge,decisions,rewards}
```

### Step 4: Restart OpenClaw gateway
```bash
cd /opt/openclaw && docker compose restart
```

### Step 5: Verify skills loaded
```bash
# Check OpenClaw logs
docker logs openclaw-openclaw-gateway-1 --tail 50
```

### Step 6: Test via Telegram
Send a message to @mentix_aibot:
- "Sağlık kontrolü yap" → should trigger uptime-kuma
- "Veritabanı durumu" → should trigger sql-toolkit
- "Repo durumu" → should trigger github-workflow

---

## 5. RISK REGISTER

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenClaw may not recognize all skills automatically | MEDIUM | Verify skill loading in gateway logs; may need openclaw.json update |
| sql-toolkit needs DB credentials in OpenClaw env | MEDIUM | Add DATABASE_URI to OpenClaw's environment (docker-compose) |
| browser-automation may lack headless browser on VPS | MEDIUM | May need Playwright/Puppeteer install in OpenClaw container |
| GitHub skill needs auth token | LOW | Add GITHUB_TOKEN to OpenClaw environment |
| Image edit requires EachLabs API setup | LOW | Deferred — Level B, not needed day one |
| learning-engine storage may grow unbounded | LOW | Size limits defined in SKILL.md (1000 rewards, 200 patterns) |
| OpenClaw gateway restart may disconnect Telegram | LOW | Re-pair if needed after restart |

---

## 6. OPEN QUESTIONS

1. **OpenClaw skill registration:** Does OpenClaw auto-discover SKILL.md files in the skills directory, or does each need to be registered in openclaw.json?
2. **Environment variables:** Can OpenClaw skills access VPS environment variables (DATABASE_URI, GITHUB_TOKEN, etc.), or do they need to be in openclaw.json?
3. **Browser access:** Does OpenClaw have headless browser capability for browser-automation, or does it need a separate tool (Playwright)?
4. **Skill-to-skill communication:** Can OpenClaw skills invoke each other, or does each need to be triggered independently?
5. **npm DNS issue:** Previous skill installs (clawhub, github) failed due to npm DNS. Has this been resolved?

---

## 7. NEXT BEST ACTIONS

1. **IMMEDIATE** — Deploy Level A skills to VPS via SCP
2. **IMMEDIATE** — Verify OpenClaw recognizes new skills
3. **IMMEDIATE** — Test each Level A skill with a basic Telegram command
4. **SHORT-TERM** — Configure environment variables for sql-toolkit and github-workflow
5. **SHORT-TERM** — Run E2E stub test (still pending from Step 16)
6. **MEDIUM-TERM** — Set up Level B skills after Level A is confirmed working
7. **MEDIUM-TERM** — Configure image processing API for eachlabs-image-edit
8. **LATER** — Begin learning-engine data collection once other skills produce events
