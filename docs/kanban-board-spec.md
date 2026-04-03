# Kanban Board Spec

## Purpose

This document defines the working Kanban model for Friendly Mail delivery.

It is meant to support:

- PM planning
- engineering execution
- design coordination
- label consistency across tickets

## Accuracy Rules

This board mixes:

- **Actual state**
  - current epic and ticket completion
  - current next engineering ticket
  - current prototype milestone
- **Planned state**
  - role-specific work split for design, frontend, and backend
  - story points
  - t-shirt sizes
  - sprint targets
  - suggested ticket labels

Important:

- Story points and t-shirt sizes are planning metadata.
- They are not historical facts for earlier completed work.
- Current ticket completion status must continue to come from `.planning/epic-status.json`.

## Board Model

Friendly Mail should use a **Kanban board with swimlanes**.

### Columns

- `Backlog`
  - approved work, not yet ready to start
- `Ready`
  - clarified work with owner, labels, and dependencies identified
- `In Progress`
  - actively being worked by one owner
- `In Review`
  - waiting for design review, code review, QA review, or stakeholder signoff
- `Blocked`
  - cannot proceed because of dependency, environment, access, or decision gap
- `Done`
  - accepted and merged or otherwise complete for the relevant milestone

### Swimlanes

- `Design`
- `Frontend`
- `Backend`

## Team Roles

These are board personas for planning and assignment.

- `Jerry`: backend engineer
- `Tom`: frontend engineer
- `Dora`: product designer
- `Velma`: QA and release readiness
- `Road Runner`: platform and devex

## Estimation Scale

### Story Points

- `2`: very small
- `3`: small
- `5`: medium
- `8`: large
- `13`: extra large

### T-Shirt Sizes

- `XS`: 2 points
- `S`: 3 points
- `M`: 5 points
- `L`: 8 points
- `XL`: 13 points

## Ticket Template

Each ticket should include:

- Ticket ID
- Title
- Owner
- Discipline
- Epic mapping
- Story points
- T-shirt size
- Labels
- Dependencies
- Acceptance notes

## Label Taxonomy

Every ticket should have labels from the following groups.

### Discipline Labels

- `discipline:design`
- `discipline:frontend`
- `discipline:backend`

### Epic Labels

- `epic:E1`
- `epic:E2`
- `epic:E3`
- `epic:E4`
- `epic:E5`
- `epic:E6`
- `epic:E7`
- `epic:E8`
- `epic:E9`
- `epic:E10`

### Surface Labels

- `surface:addin`
- `surface:dashboard`
- `surface:api`
- `surface:graph`
- `surface:platform`
- `surface:workflow`

### Work Type Labels

- `type:feature`
- `type:design`
- `type:spec`
- `type:integration`
- `type:qa`
- `type:platform`

### Priority Labels

- `priority:P0`
- `priority:P1`
- `priority:P2`

### Size Labels

- `size:XS`
- `size:S`
- `size:M`
- `size:L`
- `size:XL`

### Status Labels

- `status:backlog`
- `status:ready`
- `status:in-progress`
- `status:in-review`
- `status:blocked`
- `status:done`

### Prototype / Release Labels

- `milestone:prototype-v1`
- `milestone:pilot-v1`

### Integration / Risk Labels

- `integration:microsoft-graph`
- `integration:outlook-addin`
- `integration:webhooks`
- `risk:security`
- `risk:workflow-safety`
- `risk:shared-mailbox`

## Required Label Set Per Ticket

Minimum recommended label set:

- one `discipline:*`
- one `epic:*`
- one `surface:*`
- one `type:*`
- one `priority:*`
- one `size:*`
- one `status:*`

Recommended optional additions:

- one `milestone:*`
- one or more `integration:*`
- one or more `risk:*` when relevant

## Prototype Board Scope

The first user-meaningful prototype should cover:

- mailbox connect
- folder sync
- message metadata sync
- webhook-driven mailbox change handling
- minimal Outlook add-in workflow surface

That means the prototype board should combine:

- Epic 2 backend completion through `E2-T8`
- early design work for the Outlook add-in experience
- the first thin frontend slice from Epic 7

## Working Rules

- Keep one owner per ticket even if collaborators exist.
- Do not move a ticket into `Ready` until dependencies and labels are set.
- Use `Blocked` only for real external blockers.
- Split tickets bigger than `8` points unless the work is truly inseparable.
- Design tickets should land before the corresponding frontend implementation ticket enters `In Progress`.

## Definitions

### Ready

A ticket is `Ready` when:

- the scope is understandable
- the owner is known
- labels are assigned
- dependencies are called out
- acceptance notes are written

### Done

A ticket is `Done` when:

- the work is implemented or delivered
- relevant verification is complete
- any linked planning status is updated

## Recommended Cadence

- PM / lead planning pass: 2 times per week
- Board grooming: before new work starts
- Review velocity after each prototype milestone, not daily

## Velocity Policy

Use two views:

- **Observed throughput**
  - what was actually completed
- **Estimated capacity**
  - how much new work the team believes fits in the next sprint or planning window

Do not claim a stable velocity until at least 2 to 3 planned sprint windows have been tracked with the same point model.
