# UYGUNAYAKKABI — Full Project Cleanup & Knowledge-Architecture Audit

**Date:** 2026-04-19  
**Type:** AUDIT ONLY — No files modified  
**Scope:** project-control/, ai-knowledge/, mentix-memory/, mentix-skills/, runtime code

---

## 1. Current Folder Responsibility Map

### project-control/

**Current observed role:** Canonical project governance — state tracking, decisions, architecture, operator runbooks, deploy checklists, migration records, smoke tests, system prompts. Contains 21 files (~460 KB). Actively maintained; core files updated within last 7–15 days.

**What it should be used for:** Single authoritative source for project state, architecture decisions, deployment procedures, operator guides, and protected rules. Everything a new session or new contributor needs to understand the project's current truth.

**What should NOT be stored there:** Raw chat dumps, transient debug logs, Mentix runtime memory (decisions/traces/rewards), skill implementation specs. The two executed SQL files (phase14-migration.sql, step-24-neon-sql.sql) and the patch diff are borderline — they're historical records of applied changes, acceptable but could move to an `archives/` subfolder if the folder grows.

**Risk level if misused:** HIGH — If stale docs remain here without updates, new sessions will treat outdated info as truth. The MEMORY_LOCK.md staleness (says D-094 / Phase 2B when reality is D-168 / Phase 15) is a live example.

---

### ai-knowledge/

**Current observed role:** Mixed bag of structured reference knowledge (9 files in automation/, backend/, frontend/) and raw conversation dumps (14 files in raw-chats/, ~364 KB). Total ~408 KB. Last updated 2026-03-23.

**What it should be used for:** Reusable reference knowledge that supplements project-control — setup guides, troubleshooting references, architectural data-flow docs. NOT primary truth. NOT raw chats.

**What should NOT be stored there:** Anything that duplicates project-control content (8 of 9 structured docs overlap 30–70% with project-control files). Raw chat dumps should be archived or deleted — they are conversation exports with minimal extracted value.

**Risk level if misused:** MEDIUM — If treated as authoritative over project-control, it will produce drift because these docs are 27–40 days stale. The raw-chats subfolder is pure noise for any AI session that reads it.

---

### mentix-memory/

**Current observed role:** Operational runtime memory for the Mentix agent — policies, runbooks, identity, and simulation training data (decisions, incidents, traces, evaluations, rewards, golden cases). Contains 33 files across 9 active subdirectories + 3 empty dirs (patterns/, summaries/, archive/). All created 2026-03-16.

**What it should be used for:** Mentix agent's operational memory store — diagnostic traces, incident records, decision logs, reward signals, evaluation scores, and runtime policies. This is the agent's working memory, not human-facing project documentation.

**What should NOT be stored there:** Project planning, architecture decisions, deployment checklists, or anything that belongs in project-control. Currently clean — no violations found.

**Risk level if misused:** LOW — Well-structured, all simulation data properly tagged with `"_sim": true`. Runbooks have intentional partial overlap with ai-knowledge (different purpose: fast agent lookup vs. reference docs).

---

### mentix-skills/

**Current observed role:** Executable skill specifications for 13 Mentix skills plus 3 root-level config files and 1 HTML dashboard. Contains 17 files. All files define skill behavior, permissions, activation levels, and integration points.

**What it should be used for:** Skill implementation specs only — what each skill does, its permission matrix, activation level, integration points, and constraints. Configuration and deployment docs (ACTIVATION_CONFIG.md, INSTALLATION_MATRIX.md) are appropriate here.

**What should NOT be stored there:** Project history, decision logs, or architecture documentation. Currently clean — minimal aspirational content properly marked as future phases.

**Risk level if misused:** LOW — Well-organized, no deprecated content, no problematic duplication between skills.

---

## 2. Source Authority Hierarchy

Ranked from highest to lowest authority:

1. **Current running code** (src/, payload.config.ts, route.ts) — Implementation reality always wins
2. **project-control/** core files — PROJECT_STATE.md, DECISIONS.md, TASK_QUEUE.md, PRODUCTION_TRUTH_MATRIX.md
3. **project-control/** reference files — ARCHITECTURE.md, OPERATOR_RUNBOOK.md, DEPLOY_CHECKLIST.md, MIGRATION_NOTES.md
4. **project-control/** governance prompts — SYSTEM_PROMPT.md, MENTIX_SYSTEM_PROMPT.md, MEMORY_LOCK.md
5. **mentix-skills/** — Skill behavior specs (operational, not planning)
6. **mentix-memory/** — Agent runtime memory (operational, scoped to Mentix agent context)
7. **ai-knowledge/** structured docs — Reference knowledge (must be validated against #1–#4 before use)
8. **ai-knowledge/raw-chats/** — HISTORICAL REFERENCE ONLY, never direct source of truth

**Contradiction resolution rule:** When sources conflict, higher-numbered sources yield to lower-numbered sources. Explicitly mark the mismatch and update the stale source.

---

## 3. Contradiction / Drift Report

### CRITICAL Contradictions

**C-1: MEMORY_LOCK.md decision ID vs DECISIONS.md**
- Files: project-control/MEMORY_LOCK.md vs project-control/DECISIONS.md
- Conflict: MEMORY_LOCK says "Next available ID: D-094" — DECISIONS.md goes to D-168
- Stronger source: DECISIONS.md (actively maintained, updated 2026-04-12)
- Resolution: Update MEMORY_LOCK.md to reflect D-169 as next available

**C-2: MEMORY_LOCK.md phase status vs PROJECT_STATE.md**
- Files: project-control/MEMORY_LOCK.md vs project-control/PROJECT_STATE.md
- Conflict: MEMORY_LOCK says "Phase 2B IN PROGRESS" — PROJECT_STATE says Phase 15 COMPLETE
- Stronger source: PROJECT_STATE.md (updated 2026-04-12)
- Resolution: Update MEMORY_LOCK.md phase table to show Phases 1–15 COMPLETE

**C-3: MEMORY_LOCK.md decision count vs actual**
- Files: project-control/MEMORY_LOCK.md
- Conflict: Says "92+ locked decisions" — actual count is 168
- Resolution: Update to "168 decisions through D-168"

### MEDIUM Contradictions

**C-4: ARCHITECTURE.md missing Steps 17–19**
- Files: project-control/ARCHITECTURE.md vs project-control/PROJECT_STATE.md
- Conflict: ARCHITECTURE.md documents through Step 16 implementation; Steps 17–19 (direct Telegram webhook intake, replacing OpenClaw→n8n primary path) are missing
- Stronger source: PROJECT_STATE.md (confirms Steps 1–19 complete)
- Resolution: Add Steps 17–19 to ARCHITECTURE.md, noting direct webhook as current intake path

**C-5: DECISIONS.md duplicate IDs D-056 through D-060**
- Files: project-control/DECISIONS.md
- Conflict: D-056 through D-060 have duplicate definitions (noted in MEMORY_CONSOLIDATION_REPORT.md but never fixed — "later definitions take precedence by file position")
- Resolution: Renumber duplicates (as was done for D-090/091 previously)

**C-6: ARCHITECTURE.md still describes "Telegram bot via OpenClaw" as active path**
- Files: project-control/ARCHITECTURE.md vs running code (src/app/api/telegram/route.ts)
- Conflict: ARCHITECTURE.md implies OpenClaw→n8n is the primary intake; code shows direct Telegram webhook is the actual intake
- Resolution: Update ARCHITECTURE.md to reflect direct webhook as primary, OpenClaw/n8n as secondary/support

**C-7: ai-knowledge/payload-drizzle-schema-sync.md enum count vs reality**
- Files: ai-knowledge/backend/payload-drizzle-schema-sync.md vs project-control/MIGRATION_NOTES.md
- Conflict: ai-knowledge lists 10 enums; MIGRATION_NOTES.md lists 17 enums (after Phase 14 migration)
- Stronger source: MIGRATION_NOTES.md
- Resolution: Mark ai-knowledge version as stale or archive

### LOW Contradictions

**C-8: MENTIX_SYSTEM_PROMPT.md says skills "to be deployed" in some sections**
- Files: project-control/MENTIX_SYSTEM_PROMPT.md
- Conflict: References skills as "to be deployed" but MEMORY_CONSOLIDATION_REPORT confirms 13 skills live since 2026-03-22
- Resolution: Minor wording update

---

## 4. Stale / Duplicate / Obsolete Documentation Candidates

### project-control/ (21 files)

| File | Recommendation | Reason | Risk |
|------|---------------|--------|------|
| PROJECT_STATE.md | **KEEP** | Core truth, updated 2026-04-12 | — |
| DECISIONS.md | **UPDATE** | Fix duplicate IDs D-056–D-060 | LOW |
| TASK_QUEUE.md | **KEEP** | Active, updated 2026-04-11 | — |
| PRODUCTION_TRUTH_MATRIX.md | **KEEP** | Active, updated 2026-04-08 | — |
| DEPLOY_CHECKLIST.md | **KEEP** | Active, updated 2026-04-08 | — |
| OPERATOR_RUNBOOK.md | **KEEP** | Active, updated 2026-04-06 | — |
| MIGRATION_NOTES.md | **KEEP** | Active, updated 2026-04-04 | — |
| SMOKE_TESTS.md | **KEEP** | Active, updated 2026-04-04 | — |
| ARCHITECTURE.md | **UPDATE** | Missing Steps 17–19, stale intake path | MEDIUM |
| MEMORY_LOCK.md | **UPDATE** | Stale phase status, ID count, decision registry | HIGH |
| OPEN_QUESTIONS.md | **KEEP** | Valid questions, Q1 Instagram token still urgent | — |
| SYSTEM_PROMPT.md | **KEEP** | Timeless governance doc | — |
| MENTIX_SYSTEM_PROMPT.md | **KEEP** | Minor wording fix needed | LOW |
| SAVED_PROMPTS.md | **KEEP** | Reference utility | — |
| MEMORY_CONSOLIDATION_REPORT.md | **ARCHIVE** | Historical record from 2026-03-23, contains stale ID claim | LOW |
| mentix-intake-SKILL.md | **ARCHIVE** | Duplicate of mentix-skills/mentix-intake/SKILL.md | LOW |
| patch-blob-reduce-advanced-ops.diff | **ARCHIVE** | Historical commit reference, value is in git history | LOW |
| phase14-migration.sql | **ARCHIVE** | Executed migration record — useful but belongs in archives/ | LOW |
| step-24-neon-sql.sql | **ARCHIVE** | Executed migration record — useful but belongs in archives/ | LOW |
| architecture-onion.html | **KEEP** | Visualization reference | — |
| mimari-sogankatmani-tr.html | **KEEP** | Turkish visualization reference | — |

### ai-knowledge/ (23 files)

| File | Recommendation | Reason | Risk |
|------|---------------|--------|------|
| automation/openclaw-setup-reference.md | **ARCHIVE** | 70% duplicates OPERATOR_RUNBOOK.md | LOW |
| automation/telegram-first-commerce-vision.txt | **ARCHIVE** | Vision doc, mirrors PROJECT_STATE.md strategy | LOW |
| automation/vps-infrastructure.md | **ARCHIVE** | 60% duplicates OPERATOR_RUNBOOK.md | LOW |
| backend/admin-storefront-debug.md | **ARCHIVE** | Marked RESOLVED 2026-03-13, duplicates DECISIONS.md | LOW |
| backend/payload-admin-runtime-issues.txt | **ARCHIVE** | Stale (2026-03-10), 50% overlap with PRODUCTION_TRUTH_MATRIX | LOW |
| backend/payload-drizzle-schema-sync.md | **ARCHIVE** | Stale enum count (10 vs 17), superseded by MIGRATION_NOTES | LOW |
| backend/setup-history-reference.txt | **ARCHIVE** | Meta-reference, minimal current value | LOW |
| frontend/site-settings-data-flow.md | **ARCHIVE** | 50% overlap with ARCHITECTURE.md frontend layer | LOW |
| frontend/storefront-runtime-history.txt | **ARCHIVE** | Stale (2026-03-09), 40% overlap with PROJECT_STATE | LOW |
| raw-chats/Claude chat old 2.txt | **DELETE** | Raw chat dump, no structured knowledge | NONE |
| raw-chats/Claude chat old.txt | **DELETE** | Raw chat dump, no structured knowledge | NONE |
| raw-chats/current_chat_export.txt | **DELETE** | Brief snippet, no unique value | NONE |
| raw-chats/full-chat-transcript.txt | **DELETE** | 66 KB conversation dump, no extraction | NONE |
| raw-chats/openclaw_n8n_vps_handoff_2026-03-14.txt | **ARCHIVE** | Only raw-chat with structured handoff notes | LOW |
| raw-chats/project-summary (1).txt | **DELETE** | Duplicate summary variant | NONE |
| raw-chats/project-summary - Co work Güncel.txt | **DELETE** | 93 KB chat dump with tool markers | NONE |
| raw-chats/project-summary 2 - Old one.txt | **DELETE** | Labeled "Old one", HTML format dump | NONE |
| raw-chats/uygunayakkabi-full-conversation.txt | **DELETE** | Minimal content conversation dump | NONE |
| raw-chats/uygunayakkabi-konusma-arsivi.txt | **DELETE** | Turkish conversation archive dump | NONE |
| raw-chats/uygunayakkabi_chat_transcript (1).txt | **DELETE** | Brief transcript duplicate | NONE |
| raw-chats/uygunayakkabi_chat_transcript.txt | **DELETE** | Minimal transcript | NONE |
| raw-chats/uygunayakkabi_conversation_log.txt | **DELETE** | Brief log | NONE |
| raw-chats/uygunayakkabi_conversations_export.txt | **DELETE** | Conversation export | NONE |

### mentix-memory/ (33 files)

| Category | Recommendation | Reason |
|----------|---------------|--------|
| identity/ (1 file) | **KEEP** | Agent self-description, v2.0, no duplication |
| policies/ (5 files) | **KEEP** | Operational runtime policies, well-structured |
| runbooks/ (6 files) | **KEEP** | Operational diagnostic guides, intentional partial overlap with ai-knowledge |
| decisions/ (4 SIM files) | **KEEP** | Simulation training data, properly tagged |
| evaluations/ (4 SIM files) | **KEEP** | Simulation evaluation scores |
| incidents/ (4 SIM files) | **KEEP** | Simulation incident records |
| traces/ (5 files incl. schema) | **KEEP** | Simulation diagnostic traces + schema template |
| rewards/ (3 SIM files) | **KEEP** | Simulation reward signals |
| evals/GOLDEN_CASES.json | **KEEP** | Reference golden test cases |
| patterns/ (empty) | **KEEP** | Will activate when patterns detected (per MEMORY_POLICY) |
| summaries/ (empty) | **KEEP** | Will activate for periodic digests |
| archive/ (empty) | **KEEP** | Will activate for retention cleanup |

**Verdict:** mentix-memory/ is clean. No action needed.

### mentix-skills/ (17 files)

| File | Recommendation | Reason |
|------|---------------|--------|
| All 13 SKILL.md files | **KEEP** | Active skill specs, well-structured |
| ACTIVATION_CONFIG.md | **KEEP** | Master activation policy |
| GROUP_OPERATION_LANGUAGE.md | **KEEP** | Operational protocol in Turkish |
| INSTALLATION_MATRIX.md | **KEEP** | Deployment checklist (has 5 open questions to address) |
| mentix-skill-stack-dashboard.html | **KEEP** | Visualization utility |

**Verdict:** mentix-skills/ is clean. No action needed.

---

## 5. Dead Code / Superseded Code Candidates

### DEAD CODE (Zero References — Safe to Archive)

| File | Why Dead | Evidence | Safe Action |
|------|----------|----------|-------------|
| src/lib/imageLockReminder.ts | Exported constant never imported anywhere | grep shows 0 external references | ARCHIVE |
| src/lib/imagePromptBuilder.ts | Exported functions never called | grep shows 0 external references | ARCHIVE |

### DEACTIVATED CODE (Explicitly Disabled in v19 — Safe to Archive)

| File | Why Superseded | Evidence | Safe Action |
|------|---------------|----------|-------------|
| src/jobs/lumaGenTask.ts (24.4 KB) | Luma deactivated, Gemini-only since v19 | Comments say "Luma deactivated"; callbacks return "⛔ Luma şu an devre dışı"; no active queuing | ARCHIVE |
| src/jobs/claidTask.ts (17.9 KB) | Claid deactivated, Gemini-only since v19 | Comments say "Claid deactivated"; #claid detection set to false; callbacks return "⛔ Claid devre dışı" | ARCHIVE |
| src/lib/lumaApi.ts (7.2 KB) | Only imported by lumaGenTask.ts | Single import chain, task itself disabled | ARCHIVE with lumaGenTask |
| src/lib/lumaPrompts.ts (9.3 KB) | Only imported by lumaGenTask.ts | Single import chain, task itself disabled | ARCHIVE with lumaGenTask |
| src/lib/claidProvider.ts (8.0 KB) | Only imported by claidTask.ts | Single import chain, task itself disabled | ARCHIVE with claidTask |

### SCAFFOLDED (Never Completed — Keep But Mark)

| File/Feature | Status | Evidence | Safe Action |
|-------------|--------|----------|-------------|
| Dolap channel in channelDispatch.ts | Scaffold-only | Webhook env var exists but commented as "scaffold-only until their integrations are built" | KEEP — mark as SCAFFOLDED in comments |
| LinkedIn OAuth callback | Scaffold-only | OAuth callback code exists but no post implementation | KEEP — mark as SCAFFOLDED |

### BLOCKED BY EXTERNAL APIs

| Feature | Status | Evidence | Safe Action |
|---------|--------|----------|-------------|
| WhatsApp Status publishing | blocked_officially | storyTargets.ts marks it as blocked | KEEP — cannot implement until API support |
| Telegram Stories | blocked_officially | Bot API doesn't support stories yet | KEEP — cannot implement until API support |

### ACTIVE — Do NOT Archive

| File | Status | Evidence |
|------|--------|----------|
| src/jobs/imageGenTask.ts | ACTIVE | Gemini Pro + OpenAI fallback, actively queued |
| src/jobs/shopierSyncTask.ts | ACTIVE | Shopier sync, actively queued |
| src/lib/imageProviders.ts | ACTIVE | Gemini Pro + OpenAI gpt-image-1, 4 refs |
| src/lib/channelDispatch.ts | ACTIVE | Instagram/Facebook/X dispatch |
| src/lib/confirmationWizard.ts | ACTIVE | 17 references |
| All other src/lib/*.ts files | ACTIVE | Multiple references each |
| All 14 src/collections/*.ts | ACTIVE | All registered in payload.config.ts |

---

## 6. Proposed Clean Folder Model

### project-control/ (Canonical Project Governance)

```
project-control/
├── PROJECT_STATE.md          # Current state snapshot (keep updating)
├── ARCHITECTURE.md           # System architecture (update with Steps 17-19)
├── DECISIONS.md              # Decision log (fix duplicate IDs)
├── TASK_QUEUE.md             # Active work tracking
├── MEMORY_LOCK.md            # Immutable truths (UPDATE urgently)
├── PRODUCTION_TRUTH_MATRIX.md # Subsystem validation status
├── DEPLOY_CHECKLIST.md       # Pre-deploy procedures
├── MIGRATION_NOTES.md        # Schema migration guide
├── OPERATOR_RUNBOOK.md       # Daily operations guide
├── SMOKE_TESTS.md            # Test scenarios
├── OPEN_QUESTIONS.md         # Unresolved questions
├── SYSTEM_PROMPT.md          # AI governance prompt
├── MENTIX_SYSTEM_PROMPT.md   # Mentix governance prompt
├── SAVED_PROMPTS.md          # Reusable prompt templates
├── architecture-onion.html   # Arch visualization (EN)
├── mimari-sogankatmani-tr.html # Arch visualization (TR)
└── archives/                 # NEW — historical records
    ├── MEMORY_CONSOLIDATION_REPORT.md
    ├── phase14-migration.sql
    ├── step-24-neon-sql.sql
    ├── patch-blob-reduce-advanced-ops.diff
    └── mentix-intake-SKILL.md
```

### ai-knowledge/ (Reference Knowledge Archive)

```
ai-knowledge/
├── archives/                 # NEW — all structured docs that duplicate project-control
│   ├── openclaw-setup-reference.md
│   ├── telegram-first-commerce-vision.txt
│   ├── vps-infrastructure.md
│   ├── admin-storefront-debug.md
│   ├── payload-admin-runtime-issues.txt
│   ├── payload-drizzle-schema-sync.md
│   ├── setup-history-reference.txt
│   ├── site-settings-data-flow.md
│   ├── storefront-runtime-history.txt
│   └── openclaw_n8n_vps_handoff_2026-03-14.txt
└── (raw-chats/ — DELETE all 13 dump files, keep nothing)
```

After cleanup, ai-knowledge/ effectively becomes an archive-only folder. New reference knowledge should go into project-control/ directly or into mentix-memory/runbooks/ if operational.

### mentix-memory/ (No Changes Needed)

```
mentix-memory/               # Already clean — keep as-is
├── identity/
├── policies/
├── runbooks/
├── decisions/
├── evaluations/
├── incidents/
├── traces/
├── rewards/
├── evals/
├── patterns/    (empty, will populate)
├── summaries/   (empty, will populate)
└── archive/     (empty, will populate)
```

### mentix-skills/ (No Changes Needed)

```
mentix-skills/               # Already clean — keep as-is
├── ACTIVATION_CONFIG.md
├── GROUP_OPERATION_LANGUAGE.md
├── INSTALLATION_MATRIX.md
├── mentix-skill-stack-dashboard.html
├── agent-memory/SKILL.md
├── browser-automation/SKILL.md
├── eachlabs-image-edit/SKILL.md
├── github-workflow/SKILL.md
├── learning-engine/SKILL.md
├── mentix-intake/SKILL.md
├── product-flow-debugger/SKILL.md
├── research-cog/SKILL.md
├── senior-backend/SKILL.md
├── skill-vetter/SKILL.md
├── sql-toolkit/SKILL.md
├── upload-post/SKILL.md
└── uptime-kuma/SKILL.md
```

---

## 7. Safe Cleanup Plan

### Phase A: Documentation Updates Only (SAFE — no code changes)

1. Update MEMORY_LOCK.md: fix decision ID registry (D-169), phase table (Phase 15 COMPLETE), decision count (168)
2. Update ARCHITECTURE.md: add Steps 17–19, note direct webhook as primary intake
3. Fix DECISIONS.md: renumber duplicate IDs D-056–D-060
4. Fix MENTIX_SYSTEM_PROMPT.md: change "to be deployed" to "deployed" for skills

**Risk:** NONE — text-only governance doc updates  
**Reversible:** YES — git revert

### Phase B: Archive Old Docs (SAFE — move, don't delete)

1. Create project-control/archives/ subfolder
2. Move 5 historical files into it (consolidation report, SQL files, diff, duplicate skill doc)
3. Create ai-knowledge/archives/ subfolder
4. Move 9 structured docs + 1 raw chat handoff into it
5. Delete 13 raw-chat dump files from ai-knowledge/raw-chats/ (pure noise, ~350 KB)

**Risk:** LOW — archived files remain in repo, just relocated  
**Reversible:** YES — git revert

### Phase C: Dead Code Quarantine (REQUIRES CONFIRMATION)

1. Create src/lib/_archived/ or similar quarantine folder
2. Move imageLockReminder.ts and imagePromptBuilder.ts into it (zero references)
3. Create src/jobs/_archived/ folder
4. Move lumaGenTask.ts, claidTask.ts into it
5. Move lumaApi.ts, lumaPrompts.ts, claidProvider.ts into src/lib/_archived/
6. Update payload.config.ts to remove lumaGenTask and claidTask from jobs registration (they're registered but never queued)

**Risk:** MEDIUM — removing job registrations from payload.config.ts is a code change  
**Reversible:** YES — git revert  
**Requires:** Verify no dynamic references to these jobs exist beyond what grep found

### Phase D: Confirmed Deletion (REQUIRES EXPLICIT OPERATOR APPROVAL)

1. Delete ai-knowledge/raw-chats/ folder entirely (after Phase B archives the one useful file)
2. Delete quarantined dead code files from Phase C (only after running in production without them for 1 sprint)

**Risk:** LOW if Phase B/C completed first  
**Reversible:** NO (unless git history is consulted)

### Phase E: Final Memory Lock Refresh

1. Rebuild MEMORY_LOCK.md from scratch based on current verified reality:
   - 19 completed steps
   - 168 decisions through D-168
   - Phase 15 COMPLETE
   - Current protected rules (7 explicit locks)
   - Current stack versions
   - Current authorized users
   - Source authority hierarchy
2. Update PRODUCTION_TRUTH_MATRIX.md with any new validation results
3. Verify PROJECT_STATE.md protected workflow rules section is current

**Risk:** NONE — governance doc refresh  
**Reversible:** YES

---

## 8. Questions Before Cleanup

### Truly Blocking Questions

1. **n8n: sunset or keep?** n8n is running on VPS and referenced in channelDispatch.ts for Instagram (channel-instagram-real.json workflow). OPEN_QUESTIONS.md asks "What is n8n's role going forward?" — This affects whether n8n workflow files should be archived or maintained. The code shows Instagram dispatch may still route through n8n. **Need verification:** Does current Instagram dispatch go through n8n or directly via Graph API?

2. **Dolap: officially cancelled?** The channel dispatch has scaffold-only code for Dolap. OPEN_QUESTIONS.md lists "Dolap API availability" as medium priority. If Dolap is cancelled, the scaffold code can be removed. **Need operator decision.**

3. **payload.config.ts job registration:** lumaGenTask and claidTask are registered in payload.config.ts even though they're never queued. Removing them from config is a code change that touches the Payload startup. **Need confirmation this won't affect deployment.**

4. **OpenAI image generation: backup or dead?** imageProviders.ts has both `generateByGeminiPro()` and `generateByEditing()` (OpenAI gpt-image-1). The v19 decision was "Gemini-only" but OpenAI code is still active and importable. **Clarify:** Is OpenAI kept as intentional fallback, or should it also be deactivated?

### Non-Blocking Observations (No Confirmation Needed)

- Instagram token expires ~2026-05-20 — already tracked in OPEN_QUESTIONS.md Q1, ~30 days away
- Story publishing (Telegram/Instagram) is implemented but not actively exercised — low priority
- BotEvents and StoryJobs collections are active logging, not dead code
- All mentix-memory simulation data should be retained for learning engine calibration
- mentix-skills INSTALLATION_MATRIX.md has 5 open questions about OpenClaw deployment — relevant when deploying more skills to VPS but not blocking cleanup

---

## Assumption Verification Results

| Assumption | Status | Evidence |
|-----------|--------|----------|
| project-control should be canonical governance | **VERIFIED** | Actively maintained, highest signal-to-noise ratio, source authority established in MEMORY_LOCK.md |
| ai-knowledge should be reference, not primary truth | **VERIFIED** | 8 of 9 structured docs duplicate project-control at 30–70%; raw-chats are noise |
| mentix-memory should be operational runtime, not planning | **VERIFIED** | 100% operational content — policies, runbooks, simulation data. Zero planning docs |
| mentix-skills should define skill behavior, not history | **VERIFIED** | All 13 skill files are implementation specs. Minimal aspirational content properly marked |
| raw-chats should be historical reference only | **VERIFIED** | 14 files, ~364 KB of conversation dumps with near-zero structured extraction |
| Direct Telegram webhook is current intake path | **VERIFIED** | src/app/api/telegram/route.ts (4,738 lines) is the primary handler. OpenClaw→n8n is secondary/support |
| Old Telegram→OpenClaw→n8n→Payload intake may be superseded | **PARTIALLY VERIFIED** | Direct webhook is primary. n8n still may handle Instagram dispatch. OpenClaw hosts Mentix skills. Neither is fully sunset |
| Dolap and LinkedIn may be de-scoped | **VERIFIED (scaffold-only)** | Dolap: webhook env var exists, marked "scaffold-only". LinkedIn: OAuth callback exists, no post implementation |
| Telegram Stories and WhatsApp Status blocked by APIs | **VERIFIED** | storyTargets.ts marks WhatsApp as blocked_officially; Telegram Bot API has no stories support |
| Image pipeline may contain dead code | **VERIFIED** | 7 files (2 dead, 5 deactivated) identified — lumaGenTask, claidTask, lumaApi, lumaPrompts, claidProvider, imageLockReminder, imagePromptBuilder |

---

*End of audit. No files were modified during this inspection.*
