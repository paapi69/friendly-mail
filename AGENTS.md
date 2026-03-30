# Friendly Mail Agent Guide

This project uses Friendly Mail product documents as the source of truth and adopts ECC-style best practices for planning, TDD, security, verification, and documentation-backed implementation.

## Source of Truth

Read these before making meaningful product or architecture changes:

- `friendly-mail-prd.md`
- `friendly-mail-technical-design.md`
- `friendly-mail-frontend-strategy.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

## Product Invariants

- Friendly Mail is an AI workflow layer for Outlook, not a replacement email client.
- The primary user surface is an Outlook add-in.
- The secondary user surface is a companion web app.
- The interaction model is an embedded agent inside those surfaces.
- Microsoft Graph is the mailbox source of truth.
- Friendly Mail's internal task and workflow store is the workflow source of truth.
- Mailbox state is not the same as work state.
- Filing is delayed by design:
  - Actionable emails move to retrieval folders only after the related action is resolved.
  - Informational emails move to retrieval folders only after the user has read or reviewed them.

## Engineering Defaults

- Plan before implementation when a change touches architecture, workflows, integrations, or multiple subsystems.
- Use TDD for product code whenever practical.
- Prefer typed contracts, schema validation, and explicit API shapes.
- Keep automations explainable, auditable, and reversible.
- Preserve high-trust behavior over aggressive automation.
- Prefer project-local configuration over global assumptions when behavior should stay specific to Friendly Mail.

## Skills To Prefer

When relevant, use the installed ECC skills in `~/.codex/skills`, especially:

- `tdd-workflow`
- `verification-loop`
- `security-review`
- `coding-standards`
- `api-design`
- `backend-patterns`
- `frontend-patterns`
- `e2e-testing`
- `documentation-lookup`
- `deep-research`
- `eval-harness`
- `strategic-compact`

## Implementation Guidance

- For Outlook and Microsoft Graph behavior, verify against official Microsoft documentation before finalizing behavior.
- Keep task state separate from folder state in code and data models.
- Treat filing eligibility as an explicit workflow decision, not a side effect of message arrival.
- Design for legal, executive, finance, and shared-mailbox workflows with clear auditability.
- Do not silently move or hide important emails before they are safe to archive.
- Keep `checklist.md` aligned with `.planning/epic-status.json` when epic status changes.

## Quality Bar

- New code should be accompanied by tests appropriate to the layer being changed.
- Run the relevant verification steps before handoff: build, types, lint, tests, and focused security checks.
- Call out unresolved risks clearly when a full verification pass is not possible.
