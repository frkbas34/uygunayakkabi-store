# SAVED PROMPTS — Uygunayakkabi

_Last updated: 2026-03-23_

---

## 1. Repo-Level Project Memory Governance Prompt

**Location**: `project-control/SYSTEM_PROMPT.md`
**Purpose**: Master system prompt for any AI session working on this repo.
**Key rules**:
- Always treat repo code + runtime as source of truth
- Update project-control/ files after every meaningful task
- Phase discipline: don't behave as if later phases are active
- Output PROJECT MEMORY CHECK after every task

## 2. Mentix Intelligence Layer Prompt

**Location**: `project-control/MENTIX_SYSTEM_PROMPT.md`
**Purpose**: Governs Mentix skill stack behavior, decision engine, learning system.
**Key rules**:
- 13 skills with explicit permission models (ALLOWED/CONFIRM/DENIED)
- Formal 12-field decision schema with confidence gate
- OER separation (outcome/evaluation/reward)
- REPORT_ONLY for low-confidence decisions

## 3. Project Memory Consolidation Prompt

**Purpose**: Used when multiple conversation windows need to be merged into unified project memory.
**When to use**: After extended multi-window work sessions, before major phase transitions.
**Key instruction**: "Act like a project archivist + systems architect + continuity manager."

## 4. Quick Context Loader for New Sessions

```
I'm working on the Uygunayakkabi project. Read these files first:
1. /project-control/MEMORY_LOCK.md (stable truths)
2. /project-control/PROJECT_STATE.md (current state)
3. /project-control/TASK_QUEUE.md (what to do next)
Then tell me where we left off and what the next priority is.
```

## 5. VPS SSH Session Context

```
I'm SSH'd into the Netcup VPS. Key locations:
- /opt/caddy/ — Caddy reverse proxy
- /opt/n8n/ — n8n workflow engine
- /opt/openclaw/ — OpenClaw AI agent
- /home/furkan/.openclaw/openclaw.json — OpenClaw config
- /home/furkan/.openclaw/skills/ — Mentix skills
- /home/furkan/.openclaw/mentix-memory/ — Mentix memory layers

Services: Docker. Networks: web (shared), openclaw_default (internal).
Domains: flow.uygunayakkabi.com (n8n), agent.uygunayakkabi.com (OpenClaw).
```

## 6. Instagram/Facebook Publish Debug

```
Check these in order:
1. AutomationSettings.instagramTokens.accessToken — is it set?
2. AutomationSettings.instagramTokens.userId — matches INSTAGRAM_USER_ID env var?
3. Token expiry date — is it past 2026-05-20?
4. INSTAGRAM_PAGE_ID env var — must be 1040379692491003 (NOT 61576525131424)
5. Product has valid https:// image URL?
6. channelDispatch.ts publishInstagramDirectly() / publishFacebookDirectly()
```
