# State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Never let important email-driven work disappear before it is safely handled.
**Current focus:** Epic 6 is complete in the implementation baseline - the next implementation move is to start the Epic 7 Outlook add-in experience against the now-stable workflow and mailbox-action APIs

## Current Truth

- The PRD exists at `friendly-mail-prd.md`
- The technical design exists at `friendly-mail-technical-design.md`
- The MVP roadmap exists at `friendly-mail-mvp-roadmap.md`
- The MVP epic breakdown exists at `friendly-mail-mvp-epics.md`
- The combined epic ticket breakdown exists at `friendly-mail-epic-tickets.md`
- The delayed filing rule has been incorporated into the PRD
- A high-level Microsoft Graph-based architecture has now been formalized into a technical design document
- The internal auth baseline now exists with separate `User`, `TenantMembership`, and `Session` models
- Friendly Mail product auth is now explicitly separated from future Microsoft Graph mailbox auth
- The Microsoft Entra and Graph connectivity contract now exists for delegated-first Epic 2 onboarding
- The database schema now includes mailbox connection state, Graph subscription state, and per-folder delta sync state
- A shared Microsoft Graph connector package now centralizes auth headers, immutable IDs, retries, pagination, and mailbox DTO mapping
- The API now supports delegated mailbox onboarding start and callback flows with server-side code exchange and mailbox registration
- The API now supports initial mailbox folder discovery and sync with persisted folder trees and seeded per-folder sync state
- The API now supports per-folder message metadata delta sync with persisted delta links and Graph removal tracking
- The API now supports top-level Graph message subscription creation and renewal for active delegated mailboxes
- The API now exposes secure Graph webhook notification and lifecycle ingress routes with validation-token handling and queue-first acceptance
- Accepted Graph webhook events now update subscription health state and enter the internal queue as typed mailbox notification jobs
- Queued Graph change notifications now trigger mailbox-wide tracked-folder delta reconciliation instead of trusting transient webhook payloads directly
- Missed Graph lifecycle notifications now use the same folder-level delta path to repair stale or delayed mailbox state
- The mailbox notification worker now runs from the API workspace and consumes the mailbox notification queue with application-level reconciliation logic
- The API now exposes a shared-mailbox readiness probe that reports limited or unsupported delegated-team-mailbox capability with an explicit fallback mode
- The API now exposes mailbox operational verification with subscription health, delta cursor lag, and immutable-ID enforcement reporting for Epic 2 rollout checks
- Epic 3 now has a defined ticket breakdown covering ingestion contracts, extraction persistence, message ingestion, attachment retrieval, PDF extraction, OCR fallback, idempotent orchestration, and operational verification
- The Epic 3 message-ingestion and extraction contract now locks the normalized message envelope, PDF-first extraction scope, OCR fallback assumptions, and the boundary between extraction artifacts and later classification work
- The persistence layer now stores normalized message-body fields, attachment inventory records, extraction state, and attachment artifact references for later Epic 3 services
- The API now supports message ingestion that reads full Graph message detail with text-body preference, normalizes the message envelope, and persists repeat-safe body content through the Epic 3 ingestion fields
- The API now supports attachment metadata synchronization for ingested messages, including durable attachment linkage, MVP extraction-candidate selection, and explicit unsupported attachment tracking
- The API now supports PDF-first attachment extraction for candidate file attachments, including raw Graph attachment download, machine-readable PDF text extraction, durable text artifact persistence, and explicit per-attachment failure states
- The API now supports OCR fallback for scanned or image-based PDFs when enabled, stores OCR output separately with provenance, and records confidence-aware extraction quality signals
- The API now supports repeat-safe message processing orchestration that reuses current-version ingestion and extraction state, preserves completed attachment status across metadata refreshes, and skips duplicate extraction work for unchanged message versions
- The API now exposes mailbox processing verification for ingestion coverage, extraction backlog, failure-rate visibility, retry visibility, and explicit unsupported attachment handling so Epic 3 can be checked before classification work begins
- Epic 4 now has a defined ticket breakdown covering classification contracts, persistence, orchestration, message-type and actionability classification, workflow-signal extraction, criticality scoring, explainability, and operational verification
- The Epic 4 classification and workflow-intelligence contract now exists as shared types and a dedicated contract document, including explanation, confidence, provenance, workflow-signal, and Epic 4 to Epic 5 boundary definitions
- The persistence layer now stores versioned classification results, workflow-signal payloads, explanation snapshots, urgency and criticality fields, and derived source attachment or artifact linkage without creating Epic 5 task records
- The API now supports repeat-safe classification orchestration that ensures Epic 3 content is current, packages normalized body and extracted attachment text into one payload for a specific ingestion version, skips duplicate work for unchanged versions, and persists deterministic actionability and message-type results for the Epic 4 MVP taxonomy
- The API now extracts due dates, key workflow entities, and task-candidate suggestions from both body text and attachment text with explicit confidence and provenance, while still keeping Epic 5 task-state creation out of scope
- The API now scores urgency and criticality from deterministic rules over message type, due-date proximity, and high-risk cues so notices and near-due invoices surface with explicit rationale instead of placeholder defaults
- The API now exposes a stable classification read model for downstream consumers, including confidence bands, provenance-aware reason summaries, and compact workflow-signal summaries for later surface APIs
- The API now exposes mailbox-wide classification operational verification covering current-version coverage, message-type presence, high-risk due-date visibility, criticality presence, and low-confidence visibility before Epic 5 depends on Epic 4 output
- Epic 5 now has a defined ticket breakdown covering task and workflow-state contracts, persistence, task materialization, lifecycle transitions, workflow-state projection, ownership and delegation, downstream read models, and operational verification
- The Epic 5 task and workflow-state contract now exists as shared types and a dedicated contract document, including task-source linkage, lifecycle-event shape, message workflow-state vocabulary, and explicit filing-blocker semantics before Epic 6 mailbox actions
- The persistence layer now stores first-class tasks, task-source links, lifecycle-event history, and current message workflow-state projections through the Epic 5 storage boundary, including blocker arrays, ownership fields, and idempotent task keys
- The API now materializes first-class tasks repeat-safely from Epic 4 task candidates, preserves task-source provenance and classifier lineage, and projects filing blockers without mutating the mailbox
- The API now supports auditable task lifecycle transitions for snooze, delegation, completion, dismissal, and reopen flows while keeping message workflow-state and filing eligibility current
- The API now exposes workflow read models and mailbox-wide task-workflow verification so later delayed-filing execution can depend on an explicit state engine instead of message-level flags
- Epic 6 now has a defined ticket breakdown covering delayed-filing contracts, mailbox-action audit persistence, filing-decision orchestration, informational and actionable filing execution, folder suggestions, invoice routing, outgoing numbering, and operational verification
- The Epic 6 delayed-filing and mailbox-action contract now exists as shared types and a dedicated contract document, including filing decisions, mailbox-action attempts, suggestion-first modes, specialized mailbox actions, and verification semantics
- The persistence layer now stores filing decisions, mailbox-action attempts, and outgoing reference-number sequences with explicit audit context and target-folder metadata
- The API now exposes filing-decision reads, delayed-filing execution, invoice routing, outgoing numbering, and mailbox-action verification while preserving a suggestion-first boundary for high-impact mailbox actions
- The shared contract baseline now covers mailbox, message, filing, task, and audit vocabulary across surfaces
- Workspace package direction rules are now documented and enforced with a package-boundary test
- A local onboarding and runbook guide now exists for API, dashboard, Outlook add-in, worker, database, and queue setup
- The Outlook add-in dev server is now aligned with the manifest's local HTTPS URL

## Immediate Next Steps

- Start the first Epic 7 Outlook add-in slice against the now-complete workflow and mailbox-action contracts
- Keep add-in behavior suggestion-first for filing and specialized mailbox actions until explicit user approval UX is in place
- Surface filing decisions, blockers, and action outcomes clearly instead of hiding mailbox mutations behind silent automation
- Keep shared-mailbox support in explicit readiness mode until a later application-permission path exists

## Open Questions

- What will count as "action taken" for actionable emails in v1?
- How will the product detect or infer that an informational email has been read?
- Will shared mailbox tasks be team-visible in v1 or only user-visible?
- What non-PDF attachment formats should move from explicit defer to supported after the PDF-first baseline is stable?
- What level of delegated token continuity versus server-side reauth will be acceptable for production-grade background sync?

## Notes

- The global `get-shit-done` install under `C:\Users\Sahil\.claude` is Claude-oriented
- This local `.planning` folder is the portable subset adapted for use in Codex
