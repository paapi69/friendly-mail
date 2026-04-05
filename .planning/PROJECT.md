# Friendly Mail

## What This Is

Friendly Mail is an AI-assisted workflow layer for Outlook that helps high-volume email users organize mail, extract tasks, identify urgency, and manage follow-up without changing their core mailbox habits.

It is designed for legal, executive, finance, and shared-mailbox workflows where email acts as both communication and operational work queue.

## Core Value

Never let important email-driven work disappear before it is safely handled.

## Requirements

### Validated

- [x] Separate mailbox state from task and workflow state
- [x] Delay filing until a message reaches a safe workflow state
- [x] Use Microsoft Graph as the mailbox source of truth
- [x] Identify whether an incoming email is actionable or informational
- [x] Classify emails into business-relevant categories such as contract, notice, policy, committee, event, internal, and invoice
- [x] Extract due dates, task candidates, and relevant workflow entities from email bodies and attachments
- [x] Generate explainable confidence-aware workflow intelligence before task-state creation
- [x] Verify mailbox processing and classification readiness operationally before downstream workflow automation depends on it
- [x] Persist first-class task state, ownership, lifecycle history, workflow blockers, and filing eligibility independently from Epic 4 task candidates

### Active

- [ ] Keep actionable work visible until it is completed, delegated, dismissed, or snoozed
- [ ] Move actionable emails into retrieval folders only after the related action is completed
- [ ] Move informational emails into retrieval folders only after the user has read them
- [ ] Surface critical items through digests and alerts
- [ ] Support routing workflows such as invoice forwarding and outgoing numbering

### Out of Scope

- Replacing Outlook as the primary email client - the product should work with Outlook, not against it
- Full enterprise workflow orchestration across unrelated systems - v1 is focused on email-driven work
- Fully autonomous irreversible mailbox actions - trust and reviewability come first

## Context

- The current source of truth for product direction is `friendly-mail-prd.md`
- Microsoft Graph is expected to be the integration layer for mailbox access and actions
- The product must separate task state from mailbox location so filing does not hide unresolved work
- A key workflow constraint is delayed filing:
  - Actionable emails should be moved only after the action is taken
  - Informational emails should be moved only after the user has read them

## Constraints

- **Platform**: Microsoft 365 / Microsoft Graph - mailbox operations must align with Graph capabilities
- **Trust**: Assist-before-automate - early versions should favor suggestions and review thresholds
- **Workflow safety**: Delayed filing - emails cannot be archived into retrieval folders prematurely
- **Attachment dependence**: PDF and document parsing quality matters - tasks and deadlines may live in attachments

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate task state from mailbox state | Filing cannot be the same as work completion | Adopted in architecture and persistence baselines |
| Delay filing until safe state | Prevent important emails from disappearing before handling | Locked in the PRD, technical design, and filing model |
| Use Microsoft Graph for mailbox integration | Align implementation with Outlook-native APIs | Adopted as the mailbox source of truth with immutable-ID handling |

---
*Last updated: 2026-04-05 after Epic 6 implementation and mailbox-action rollout baseline*
