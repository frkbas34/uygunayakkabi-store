# Controlled Production Durable Slot Identity Smoke V1

Date: 2026-07-28
Primary result: `CONTROLLED_DURABLE_SLOT_SMOKE_PASS`

## Authorization and safety boundary

The operator explicitly authorized one controlled production image-generation attempt for Product 349 and manually performed both external actions:

1. sent `#gorsel 349` in the real private chat with `@Uygunops_bot` at approximately 20:58 Türkiye time; and
2. selected only `Reject / Reddet` on the resulting preview.

The operator confirmed that no approval, regeneration, or second command occurred. Codex did not send a Telegram message, start a job, call a provider, approve, reject, regenerate, publish, activate, dispatch, enqueue Shopier, delete Media, change schema, push, or deploy. Runtime observation and post-rejection verification were read-only. The five generated Media records are retained as controlled-smoke evidence.

## Git and production baseline

- Canonical checkout: `C:/Users/W11/Desktop/uygunayakkabi-store`
- Branch: `main`
- Pre-evidence HEAD: `fe3dc7e6dc7f86ebdfa6f1f959dadee338a1ceb9`
- Fresh `origin/main`: `e0b60f6c83f6fa6d59dd6647558eca6883acb341`
- Pre-evidence divergence: 3 ahead / 0 behind; clean tree; no merge or rebase active
- Production runtime: READY remote-Git deployment at exact durable-runtime commit `e0b60f6c83f6fa6d59dd6647558eca6883acb341`
- Production schema: all seven nullable job/Media lineage columns present with compatible types
- Backup branch `codex/backup-main-pre-governance-20260726-8a9cfcb` remains at `8a9cfcb1619e536dd53d4a9028f76ead65c8a0fb`
- The two pre-existing stashes remained unchanged.

## Fixture and reference validation

The exact fixture was Product 349 / `SN0117` / `BOS-MPVYVL8Q`, a draft, non-public, non-sellable black suede loafer. Its three ordered original references remained Media 1377, 1378, and 1379. Each returned HTTP 200 as `image/png`, measured 1536x1024, matched stored byte size, and visibly contained the intended shoe. The runtime selected Media 1377 as the primary source for every slot-contract record; Media 1378 and 1379 were additional original references. The primary binary remained unique in the audited first-reference population.

Before the smoke, the generated gallery was empty, Product 349 had zero historical image jobs, and no active/preview job, publishing action, Shopier action, BotEvent, or external dispatch existed. The separately authorized stock-number assignment had already established unique `SN0117`; its accepted Payload normalization of `channelTargets` from `[website]` to `[website, instagram]` was not part of this smoke.

## Private Uygunops route and command

The manual input was exactly `#gorsel 349`, without a bot mention, reply context, group context, or extra text. Job persistence, allowlist membership checks, Telegram `getChat`, and the requester's confirmation prove the command used the authorized private Uygunops DM. The stored chat and requester identities matched, both were authorized, and the target was not a group. No Telegram identifier is recorded here.

The Stage A baseline was observed at `2026-07-28T17:55:51.348Z` with zero Product 349 jobs. Exactly one candidate appeared afterward:

- Job: 428
- Created: `2026-07-28T17:58:36.930Z`
- Generation start: `2026-07-28T17:58:40.457Z`
- Generation complete: `2026-07-28T18:00:35.413Z`
- Preview-time status: `preview`
- Requested stage/provider: `standard` / `gemini-pro`
- Contract: `image-slot-contract/v1`
- Attempt: `iga_dea1a935-683e-45b9-b876-8c8e3b74162a`
- Attempt start/complete: `2026-07-28T17:58:40.457Z` / `2026-07-28T18:00:32.789Z`
- Attempt count: one; immutable attempt ID is distinct from the numeric job ID
- Job lifecycle to preview completion: approximately 118.5 seconds

No second candidate, job, attempt, command, or regeneration existed.

## Provider execution

The persisted pipeline was `gemini-pro-image-v14:gemini-2.5-flash-image`; the five slot results record `gemini-pro-image:gemini-2.5-flash-image`. The identity lock was model-derived rather than fallback and contained two visible-identity protection zones. These were fidelity checks, not a protected-brand eligibility gate.

Stage A forecast for this exact reference was 18 clean-path model calls and a maximum of 33 if all five slots used the single allowed fidelity retry:

- one reference-validation call;
- one identity-extraction call;
- five image-generation calls;
- five color-fidelity calls;
- five visible-identity fidelity calls; and
- one side-orientation call.

The actual derived count was 18. Every slot succeeded on its first generation attempt, every color and visible-identity check passed, the side-orientation check completed, and no retry or provider warning/error occurred. This count is derived from the persisted pipeline/slot logs and the active runtime path; it is not provider billing or cost evidence.

## Durable slots and Media lineage

Structural pack classification: `COMPLETE_FIVE_SLOT_SUCCESS`.

| Order | Semantic slot | Slot result | Generated Media | Dimensions | Bytes |
| ---: | --- | --- | ---: | --- | ---: |
| 1 | `side` | `persisted` | 1951 | 2048x1365 | 255,971 |
| 2 | `hero_3q` | `persisted` | 1952 | 1664x1664 | 150,296 |
| 3 | `top` | `persisted` | 1953 | 2048x1365 | 198,080 |
| 4 | `back` | `persisted` | 1954 | 1664x1664 | 171,209 |
| 5 | `detail` | `persisted` | 1955 | 2048x1365 | 314,068 |

All five slot records in the single attempt and all five generated JPEG Media rows carry the same contract, Job 428, immutable attempt ID, Product 349, and their exact semantic slot. The job's generated-Media relationships use the same canonical order. There is no missing, duplicate, unknown, shifted, or substituted slot identity. Original Media 1377-1379 remained unchanged.

## Telegram preview

Production logs record one five-photo album send plan in canonical order, one successful `sendTelegramMediaGroup` result for all five photos, one approval-keyboard send plan for Job 428, and one successful keyboard result. There was no album fallback, keyboard failure, group target, or job-specific error.

The rejection callback was `imgreject:428`. Current callback data is job-scoped rather than attempt-scoped. It nevertheless resolved unambiguously here because Job 428 had exactly one active attempt, whose ID matched the persisted slot and Media lineage. The runtime does not durably store Telegram album or keyboard message IDs, so database status alone is not delivery proof; the passive success logs and operator observation provide the checkpoint evidence.

## Rejection and post-rejection reconciliation

The operator manually rejected the exact preview. At `2026-07-28T18:14:36.878Z` Job 428 became terminal `rejected` after generation had completed. Post-rejection verification found:

- exactly one Product 349 job and one immutable attempt;
- attempt status still `completed`, preserving the truthful provider outcome;
- zero queued, generating, or preview jobs for Product 349;
- zero post-rejection image executions, provider activity, retries, or new Media;
- all five generated Media retained and still related to Job 428 and their semantic slots;
- zero generated Media unrelated to Job 428 for Product 349;
- deduplication no longer blocks a future separately authorized attempt.

The rejection did not delete or detach evidence. No approval or gallery attachment occurred.

## Product and external mutation boundary

Post-rejection Product 349 remained:

- lifecycle `draft` and non-sellable;
- workflow `visual_pending`, visual status `rejected`, confirmation `pending`, publish `not_requested`;
- Image QC `pending`;
- SKU `BOS-MPVYVL8Q`, unique stock number `SN0117`, original price/stock/content, and five variant relationships unchanged;
- original image order 1377, 1378, 1379 unchanged;
- generated gallery empty;
- accepted `channelTargets` exactly `[website, instagram]`.

The only smoke-related Product changes were `visualStatus: pending -> generating -> preview -> rejected`, the expected derived early-stage `workflowStatus: draft -> visual_pending`, and timestamps. There was no activation, public state, price, stock, variant, content, channel, Image QC, gallery, publishing, Shopier, story, ad, or external-dispatch mutation. No Product 349 BotEvent or Shopier job was created.

## Production health

After rejection, `/`, `/yardim`, and `/admin` each returned HTTP 200 with HTML. Passive production logs from the rejection window through the health probes contained zero HTTP 5xx responses, provider activity, duplicate Job 428 execution, schema/lineage errors, database-authentication errors, Payload initialization failures, Media-persistence failures, DDL/schema-push signals, or error/fatal logs. A strict read-only database check found all seven lineage columns and zero active DDL/migration sessions. Telegram webhook state had zero pending updates; its retained error marker predated Job 428 and was superseded operationally by the successful private album/keyboard delivery.

## Retained evidence and limitations

Retained production evidence is Job 428, its single attempt, five semantic slot records, generated Media 1951-1955, and their job relationships. No cleanup is authorized.

Known limitations:

- Telegram preview/keyboard message IDs are not persisted.
- Callback data binds the job, not the immutable attempt ID.
- No Product 349 BotEvent was created for the command or decision.
- Completed inline Payload execution rows were not retained for this job.
- Provider usage, exact per-call latency, billing units, and cost are not durably normalized.
- The five generated Media now require an explicit retention and recoverable-cleanup policy; rejection alone does not remove them.

## Validation and final classification

The evidence-only change is limited to this document and the four required Source Pack updates. No `src/**`, schema, prompt, camera, slot, provider, or runtime behavior changed. The following local-only checks passed with `PAYLOAD_DB_PUSH=false` where applicable:

- `npm run test:image-generation-contracts`
- `npm run test:image-slot-contract`
- `npm run test:payload-db-push-policy`
- `npm run test:image-slot-lineage-schema`
- `npm run db:image-slot-lineage:apply -- --dry-run --print-sql` — SQL hash `06191f19…961e2`; explicitly no connection and no DDL
- `npm run test:ops-runbook`
- `npm run test:source-pack` — exactly 20 Markdown documents
- `npm run test:safe`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

Targeted scans of every added line and the complete new evidence document found zero PostgreSQL/credential-bearing URIs, Neon/Vercel hostnames, recognized provider/GitHub/Slack/Telegram credentials, private-key headers, email addresses, Turkish phone numbers, or labeled Telegram user/chat identifiers.

Primary classification: `CONTROLLED_DURABLE_SLOT_SMOKE_PASS`.

Exact next task: `GENERATED MEDIA RETENTION AND RECOVERABLE CLEANUP POLICY V1`.
