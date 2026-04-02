# State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Never let important email-driven work disappear before it is safely handled.
**Current focus:** Epic 2 folder discovery and initial mailbox sync baseline complete - ready to build message metadata delta sync

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
- The shared contract baseline now covers mailbox, message, filing, task, and audit vocabulary across surfaces
- Workspace package direction rules are now documented and enforced with a package-boundary test
- A local onboarding and runbook guide now exists for API, dashboard, Outlook add-in, worker, database, and queue setup
- The Outlook add-in dev server is now aligned with the manifest's local HTTPS URL

## Immediate Next Steps

- Start `E2-T6` by syncing message metadata with per-folder delta links
- Reuse the persisted folder tree and folder sync state baseline from `E2-T5`
- Define user flows for delayed filing, task completion, and informational-email read state
- Prepare per-folder delta advancement logic that can feed later webhook reconciliation work

## Open Questions

- What will count as "action taken" for actionable emails in v1?
- How will the product detect or infer that an informational email has been read?
- Will shared mailbox tasks be team-visible in v1 or only user-visible?
- What attachment formats must be supported beyond PDF at launch?
- What level of delegated token continuity versus server-side reauth will be acceptable for production-grade background sync?

## Notes

- The global `get-shit-done` install under `C:\Users\Sahil\.claude` is Claude-oriented
- This local `.planning` folder is the portable subset adapted for use in Codex
