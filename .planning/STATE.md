# State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Never let important email-driven work disappear before it is safely handled.
**Current focus:** Phase 2 - System Design

## Current Truth

- The PRD exists at `friendly-mail-prd.md`
- The technical design exists at `friendly-mail-technical-design.md`
- The MVP roadmap exists at `friendly-mail-mvp-roadmap.md`
- The MVP epic breakdown exists at `friendly-mail-mvp-epics.md`
- The Epic 1 ticket breakdown exists at `friendly-mail-epic-1-tickets.md`
- The delayed filing rule has been incorporated into the PRD
- A high-level Microsoft Graph-based architecture has now been formalized into a technical design document
- The internal auth baseline now exists with separate `User`, `TenantMembership`, and `Session` models
- Friendly Mail product auth is now explicitly separated from future Microsoft Graph mailbox auth
- The shared contract baseline now covers mailbox, message, filing, task, and audit vocabulary across surfaces
- Workspace package direction rules are now documented and enforced with a package-boundary test

## Immediate Next Steps

- Finish the remaining Epic 1 ticket after the contracts and auth baselines
- Finish developer onboarding and local runbook work in `E1-T9`
- Break Epic 2 into milestone-level implementation tickets
- Define user flows for delayed filing, task completion, and informational-email read state
- Define the data model and Graph integration details more concretely if implementation begins

## Open Questions

- What will count as "action taken" for actionable emails in v1?
- How will the product detect or infer that an informational email has been read?
- Will shared mailbox tasks be team-visible in v1 or only user-visible?
- What attachment formats must be supported beyond PDF at launch?

## Notes

- The global `get-shit-done` install under `C:\Users\Sahil\.claude` is Claude-oriented
- This local `.planning` folder is the portable subset adapted for use in Codex
