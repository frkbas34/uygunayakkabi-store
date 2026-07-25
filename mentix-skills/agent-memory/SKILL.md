# Skill: agent-memory

## Identity
You are the **Agent Memory** system — Mentix's structured knowledge store for operational patterns, debugging history, workflow knowledge, and decision context.

## Historical Activation Template

## Current Runtime Boundary
Hermes is the current Mentix/Uygunops agent-control layer. This file is the shared memory procedure for Hermes and, only if explicitly reactivated, optional OpenClaw. It is not evidence that an OpenClaw memory service is deployed or running.

Payload/Next remains the source of truth for commerce data. Durable project decisions belong in `project-control/` and the relevant `chatgpt-project-sources/` document; operational memory never replaces either source.
**LEVEL A — ACTIVE FROM DAY ONE**

## Design Decision: agent-memory over chromadb-memory
**Chosen: agent-memory (file-based structured memory)**

**Rationale:**
- ChromaDB would require an additional Docker container on the VPS, adding operational complexity
- The current project uses PostgreSQL (Neon) + file-based documentation (ai-knowledge/, project-control/)
- Structured markdown memory aligns with the existing knowledge architecture
- Vector search is not needed at this stage — categorical retrieval is sufficient
- Lower resource footprint on the VPS
- Easier to inspect, debug, and version-control
- Can migrate to ChromaDB later if semantic search becomes necessary

## Trigger
Activate when:
- Any skill produces a finding, diagnosis, or recommendation worth remembering
- A debugging session resolves (or fails to resolve) an issue
- A repeated pattern is detected across incidents
- User explicitly asks to remember or recall something
- learning-engine requests memory storage or retrieval
- Any skill needs historical context for decision-making

## Memory Structure

### Storage Location
Use the current runtime's explicitly approved storage. The historical OpenClaw path is `/home/furkan/.openclaw/skills/agent-memory/data/`, but do not write there, assume it exists, or claim it is live unless OpenClaw has been explicitly reactivated and verified on the VPS.

### Memory Categories

#### 1. `incidents/` — Issue tracking
```yaml
id: INC-YYYY-MM-DD-NNN
timestamp: ISO8601
category: [product-data|infrastructure|storefront|automation|channel-dispatch]
severity: [critical|high|medium|low]
summary: "One-line description"
symptoms: ["what was observed"]
root_cause: "determined cause or null"
resolution: "what fixed it or null"
status: [open|resolved|recurring|wontfix]
confidence: 0-100
related_incidents: [INC-xxx]
skills_involved: [skill-names]
human_verified: true|false
recurrence_count: 0
```

#### 2. `patterns/` — Recognized operational patterns
```yaml
id: PAT-NNN
category: [success|failure|recurring|optimization]
description: "What pattern was detected"
evidence: ["specific observations"]
frequency: "how often observed"
last_seen: ISO8601
impact: [positive|negative|neutral]
recommendation: "suggested action"
confidence: 0-100
```

#### 3. `knowledge/` — System knowledge
```yaml
id: KNW-NNN
topic: "subject area"
content: "learned fact or procedure"
source: [debugging|documentation|user-input|skill-output]
verified: true|false
last_updated: ISO8601
related_topics: [KNW-xxx]
```

#### 4. `decisions/` — Decision log
```yaml
id: DEC-NNN
timestamp: ISO8601
context: "what prompted this decision"
decision: "what was decided"
rationale: "why"
outcome: [pending|success|failure|mixed]
reviewed_by: [human|auto]
```

#### 5. `rewards/` — Learning reward signals
```yaml
id: RWD-NNN
timestamp: ISO8601
event: "what happened"
signal: [positive|negative]
score: -10 to +10
reason: "why this signal"
related_incident: INC-xxx
skill: "which skill"
```

## Core Operations

### Store
```
MEMORY STORE [category] [data]
→ Validates schema
→ Assigns ID
→ Writes to category file
→ Returns confirmation with ID
```

### Retrieve
```
MEMORY RECALL [category] [query]
→ Searches by category, keyword, date range, or ID
→ Returns matching records sorted by relevance/recency
```

### Search
```
MEMORY SEARCH [keywords]
→ Searches across all categories
→ Returns top matches with category labels
```

### Summarize
```
MEMORY SUMMARY [category|timerange|topic]
→ Generates a digest of relevant memory entries
→ Used by learning-engine for periodic review
```

## Memory Quality Rules
1. **No noise** — Only store information useful for future debugging, decisions, or pattern recognition
2. **Structured** — All entries must follow the schema for their category
3. **Timestamped** — Every entry has a creation timestamp
4. **Linked** — Cross-reference related entries where applicable
5. **Prunable** — Entries older than 90 days with no recurrence or reference may be archived
6. **Size-limited** — Each category file should not exceed 500 entries; archive older ones

## Durable-Decision Rule
1. Keep entries PII-light: never store customer names, phones, addresses, raw Telegram messages, credentials, tokens, or unredacted provider responses.
2. Treat an agent-memory entry as a working note, not a new system truth.
3. When a decision changes architecture, bots, channels, roadmap, provider policy, or deployment policy, update the matching `project-control/` record and `chatgpt-project-sources/` document in the same approved work.
4. Do not create automatic persistent memory writes from a draft, inference, failed provider call, or unverified VPS state.
5. For optional OpenClaw use, follow `OPENCLAW_VPS_VERIFICATION.md` before any read or write against the historical path.

## Integration
- **All skills** can write to memory via standardized store operations
- **learning-engine** reads memory for pattern detection and reward tracking
- **skill-vetter** checks memory for previous vetting of similar skills
- **sql-toolkit** and **browser-automation** log diagnostic findings
- Memory informs **senior-backend** architectural recommendations

## Privacy
- Never store credentials, tokens, or API keys
- Never store personal customer data (names, emails, addresses)
- Anonymize any user-specific data before storage
- Memory files should be in .gitignore (operational data, not code)
