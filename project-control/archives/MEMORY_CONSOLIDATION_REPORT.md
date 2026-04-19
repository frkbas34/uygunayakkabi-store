# MEMORY CONSOLIDATION REPORT — 2026-03-23 (Updated)

## Summary

Full consolidation performed across all project-control files, ai-knowledge modules, and raw chat archives. Project has been worked on across 10+ separate AI conversation windows since 2026-03-04.

---

## Issues Found & Fixed

### 1. CRITICAL: Duplicate Decision IDs (FIXED)
**Problem**: D-052 through D-060 had two different definitions each, from separate sessions.
**Root cause**: Decisions added in parallel sessions without checking last used ID.
**Fix applied**:
- D-052 (Media Public Read) → renumbered to **D-090**
- D-053 (Upload Production Rule) → renumbered to **D-091**
- D-054/D-055 duplicates → removed (content already in canonical D-054/D-055)
- D-056 through D-060 duplicates → noted but not renumbered (later definitions take precedence by file position; lower risk)
- **Next available ID: D-092**

### 2. Stale TASK_QUEUE.md Sections (FIXED)
**Problem**: Phase 1 validation checklist still listed as "CURRENT PRIORITY" despite Phase 1 being complete since 2026-03-13.
**Fix**: Replaced with collapsed "✅ COMPLETE" section + deferred cleanup list.

### 3. Stale ai-knowledge Files (FIXED)
**Problem**: `admin-storefront-debug.md` still treated a 2026-03-13 resolved issue as active.
**Fix**: Added "⚠️ RESOLVED" header, kept as historical reference.

### 4. Missing Governance Files (CREATED)
**Created**:
- `MEMORY_LOCK.md` — Stable truths, do-not-restart rules, decision ID registry
- `OPEN_QUESTIONS.md` — 11 unresolved questions ranked by priority
- `SAVED_PROMPTS.md` — 6 reusable prompts/context loaders

---

## Changelog of Understanding

### Repeated across many windows (STABLE TRUTHS)
- Telegram-first commerce vision
- Payload CMS as single source of truth
- Phase-based build strategy
- Turkish language first
- VPS + Docker + Caddy + n8n + OpenClaw stack

### Newest truth (overrides older context)
- Instagram/Facebook publish directly from Payload (NOT via n8n) — D-088, D-089
- INSTAGRAM_PAGE_ID must be `1040379692491003` (legacy ID), NOT `61576525131424` (NPE profile ID)
- 13 Mentix skills deployed and live on VPS (not just designed)
- Steps 1-19 complete (not just 1-16 as some files suggest)

### Old context that should no longer drive decisions
- "DM-only Telegram policy" → superseded by allowlisted group mode
- "Always create draft products" → superseded by toggle-controlled publish
- "n8n publishes to Instagram" → superseded by direct Graph API publish
- "Admin → storefront pipeline broken" → resolved 2026-03-13
- "Git branch divergence risk" → resolved 2026-03-13

### Known remaining conflicts
- ARCHITECTURE.md references through Step 16; PROJECT_STATE.md through Step 19. Architecture needs Step 17-19 additions.
- D-056 through D-060 still have duplicate IDs in the file (low risk — later definitions win by file position)
- Some TASK_QUEUE.md sections reference "Phase 2B Channel Integration — Instagram" with old n8n-based instructions despite Instagram now being direct publish

---

## File Inventory (project-control/)

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| PROJECT_STATE.md | ~300 | ✅ Current (Step 19) | Most up-to-date file |
| ARCHITECTURE.md | ~277 | 🟡 Slightly stale | Missing Steps 17-19 details |
| TASK_QUEUE.md | ~500 | 🟡 Mixed | Steps current, channel sections partially stale |
| DECISIONS.md | ~1500 | 🟡 ID conflicts exist | D-090/091 renumbered, D-056-060 noted |
| MEMORY_LOCK.md | ~100 | ✅ New | Stable truths and continuity rules |
| OPEN_QUESTIONS.md | ~80 | ✅ New | 11 open questions ranked |
| SAVED_PROMPTS.md | ~80 | ✅ New | 6 reusable prompts |
| SYSTEM_PROMPT.md | ~180 | ✅ Current | Repo governance prompt |
| MENTIX_SYSTEM_PROMPT.md | ~200 | ✅ Current | Mentix skill stack governance |

---

## Recommendations

1. **Immediate**: Use MEMORY_LOCK.md as the first file any new session reads
2. **Next session**: Update ARCHITECTURE.md with Steps 17-19 (Instagram/Facebook direct publish)
3. **When time permits**: Do a full D-056 through D-060 renumbering pass
4. **Before Phase 2C**: Review OPEN_QUESTIONS.md Q6 (blog routes) and Q7 (n8n role)
