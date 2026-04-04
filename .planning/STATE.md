# State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Never let important email-driven work disappear before it is safely handled.
**Current focus:** Epic 3 now has persistence for normalized message bodies, attachment inventories, and extraction artifacts - the next implementation move is `E3-T3`

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
- The shared contract baseline now covers mailbox, message, filing, task, and audit vocabulary across surfaces
- Workspace package direction rules are now documented and enforced with a package-boundary test
- A local onboarding and runbook guide now exists for API, dashboard, Outlook add-in, worker, database, and queue setup
- The Outlook add-in dev server is now aligned with the manifest's local HTTPS URL

## Immediate Next Steps

- Start `E3-T3` by implementing message fetch and normalization into the new persistence structures added in `E3-T2`
- Reuse the completed `E3-T2` schema and database helpers as the durable source of truth for body, attachment, and artifact persistence
- Keep Epic 3 focused on normalized content and extraction artifacts, not classification or filing decisions yet
- Define user flows for delayed filing, task completion, and informational-email read state
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
