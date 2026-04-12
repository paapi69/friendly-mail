# State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Never let important email-driven work disappear before it is safely handled.
**Current focus:** `E7-T6` is now complete as the Outlook delayed-filing decision and approval ticket - the next move is `E7-T7` to add compose and draft numbering while the locked `Today`, `This Email`, and `Review` add-in IA now guides the Outlook surface and the Epic 8 mobile-first dashboard direction stays aligned as the companion deep-triage surface

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
- Epic 7 now has a defined ticket breakdown covering the add-in surface contract, host integration baseline, mailbox readiness view, message workflow panel, task actions, filing approval UX, compose numbering, and rollout verification
- Epic 7 is now explicitly locked as an Outlook add-in surface, not a Copilot-plugin-first surface
- The Epic 7 MVP design baseline now explicitly targets Outlook on the web and new Outlook on Windows
- Epic 7 is now explicitly read-mode-first for MVP, with compose reserved for the later numbering slice
- The Epic 7 MVP task pane is now assumed to be pinnable, so message-bound UI must refresh on item change
- Epic 7 shared-mailbox behavior remains capability-gated, not assumed fully supported in the first slice
- The first Epic 7 design slice is now locked to mailbox readiness or sync-status entry plus the message workflow summary and explanation panel
- Epic 7 unsupported-state handling is now part of the design truth, including no usable message context, unsupported item or host context, degraded backend state, and low-confidence workflow output
- The Epic 7 design source of truth now exists at `docs/outlook-addin-design-brief.md`
- `E7-T1` is now complete through the add-in design brief, including the first-slice interaction flow, screen inventory, state matrix, content hierarchy, action taxonomy, backend read-model mapping, and pinned task-pane behavior contract
- `E7-T2` is now complete through the Outlook add-in host adapter, browser-preview dev lane, expanded manifest baseline, read and compose command surfaces, and pinned item-change handling baseline
- The Outlook add-in is now viewable at `https://localhost:4173` as a live dev lane that previews readiness, missing-message, unsupported-host, host-unavailable, and compose-placeholder states before the first-slice feature tickets land
- `E7-T3` is now complete through a real mailbox readiness entry view with explicit connect, syncing, degraded, unsupported, and ready states
- The add-in dev lane can now point at a live mailbox operational-verification endpoint through the proxied API base and mailbox ID preview controls while preserving browser-preview scenarios for design review
- `E7-T4` is now complete through the real message workflow summary and explanation panel, including actionability, urgency, criticality, due dates, extracted entities, blockers, filing-state summary, confidence, explanation, and mini-agent prompt affordances
- The add-in now binds the selected Outlook item to backend workflow data through immutable Graph message ID bridge routes for classification and workflow reads
- The add-in dev lane now previews ready, low-confidence, incomplete-data, and failed-read workflow states instead of relying on a placeholder workflow card
- `E7-T5` is now complete through the Outlook task-action panel, including complete, snooze, delegate, dismiss, and reopen controls with inline forms, success or failure feedback, and preview or live mutation handling
- The add-in now keeps task-action state aligned with the Epic 5 workflow engine so filing blockers, lifecycle history, and linked-task summaries refresh consistently after task mutations
- The workflow engine now supports reopen flows from resolved task states, allowing the add-in to restore blocked work intentionally instead of forcing one-way task completion
- `E7-T6` is now complete through the Outlook filing-decision and approval panel, including delayed-filing status, suggested target folders, suggested categories, blocker visibility, and explicit approval for mailbox filing actions
- The add-in now derives filing guidance from the Epic 6 mailbox-action contract, refreshes decision state after task mutations, and keeps approval suggestion-first instead of hiding mailbox moves behind silent automation
- The browser-preview lane now supports end-to-end review of blocked, eligible, and executed filing states on top of the same workflow panel the live Outlook host uses
- Epic 8 is now explicitly locked as the mobile-first companion dashboard and mailbox-level triage queue, not as a generic admin-only web surface
- The dashboard is now the primary mailbox-wide and mobile discovery layer for high-volume users who should not need to open every message to understand their day
- The Outlook add-in is now locked as the primary desktop or web in-context workflow surface, not only as a selected-message detail pane
- The locked add-in IA is now `Today`, `This Email`, and `Review`, with `Today` acting as the compact queue for supported desktop or web Outlook clients
- Bucket clicks in the add-in now resolve to filtered in-panel queue views and ranked-item clicks resolve to in-panel detail, rather than relying on guaranteed Outlook inbox focus behavior
- The dashboard bucket model is now part of the product truth, with Needs Attention, FYI or CC, Junk Candidates, and Ready To File as the first mailbox-wide queue views
- The dashboard is now explicitly expected to surface the day's tasks created from email at the mailbox level, while Outlook remains the place where a selected message is reviewed in detail on desktop or web
- Mobile message or task detail should use the dashboard surface instead of assuming a full Outlook mobile add-in task-pane experience in the MVP
- Epic 11 is now defined as the final operator-side setup epic for Microsoft tenant registration, delegated consent, secret provisioning, webhook reachability, and setup handoff
- `E11-T1` is now complete through `docs/microsoft-tenant-setup-guide.md`, which spells out what must come from the tenant or admin side and what engineering can generate locally

## Immediate Next Steps

- Start `E7-T7` to expose compose and draft numbering behavior inside the same Outlook add-in shell
- Use the live add-in dev lane at `https://localhost:4173` to review the filing-approval panel and the next compose-numbering slice while `E7-T7` lands
- Use the locked Epic 8 dashboard direction as the planning baseline for the companion web app: mailbox-level triage and mobile detail first, admin and digests second
- Use `docs/microsoft-tenant-setup-guide.md` whenever real Microsoft tenant values need to be requested from the operator or admin side
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
