# Roadmap: Friendly Mail

## Overview

Friendly Mail is now moving from implemented workflow-state delivery into delayed filing and user-surface execution. The roadmap still prioritizes product clarity, safe workflow design, and a strong initial architecture before broader automation, but the project has already completed the first five engineering epics and should use that reality as the baseline for next-phase planning.

## Phases

- [x] **Phase 1: Product Foundation** - Finalize core product definition, user workflows, and success boundaries
- [x] **Phase 2: System Design** - Define technical architecture, data model, and integration constraints
- [ ] **Phase 3: Workflow UX** - Specify user flows for triage, task tracking, delayed filing, and reminders
- [ ] **Phase 4: MVP Execution Plan** - Convert the spec into engineering epics, acceptance scope, and launch sequencing

## Phase Details

### Phase 1: Product Foundation
**Goal**: Lock the product problem, principles, personas, and MVP behavior.
**Depends on**: Nothing (first phase)
**Requirements**: PRD baseline, delayed filing rule, Outlook-centric workflow
**Success Criteria** (what must be TRUE):
  1. PRD clearly states the delayed filing behavior for actionable and informational emails
  2. MVP boundaries and non-goals are explicit
  3. Core value and product principles support trust-first automation
**Plans**: 1 plan

Plans:
- [x] 01-01: Finalize PRD and confirm product principles

### Phase 2: System Design
**Goal**: Produce an implementation-ready technical architecture aligned with Microsoft Graph capabilities.
**Depends on**: Phase 1
**Requirements**: Mailbox integration model, task store, action engine, reminder system
**Success Criteria** (what must be TRUE):
  1. Architecture separates mailbox state from task state
  2. Filing logic respects action-complete and read-before-move conditions
  3. Data flow for ingestion, extraction, prioritization, and mailbox actions is defined
**Plans**: 2 plans

Plans:
- [x] 02-01: Define service architecture and event flow
- [x] 02-02: Define data model and Graph integration boundaries

### Phase 3: Workflow UX
**Goal**: Define how users experience triage, action tracking, and delayed filing inside the product.
**Depends on**: Phase 2
**Requirements**: Triage flow, task states, digest experience, human-review moments
**Success Criteria** (what must be TRUE):
  1. Actionable and informational email flows are distinct and clear
  2. Critical items remain visible until resolved
  3. Morning and evening digest behavior is fully specified
**Plans**: 2 plans

Plans:
- [ ] 03-01: Design triage and task workflows
- [ ] 03-02: Design digest, reminder, and filing confirmation flows

### Phase 4: MVP Execution Plan
**Goal**: Turn the PRD and architecture into buildable engineering scope.
**Depends on**: Phase 3
**Requirements**: Engineering epics, sequencing, acceptance criteria, rollout shape
**Success Criteria** (what must be TRUE):
  1. MVP is broken into clear engineering epics
  2. Each epic maps back to PRD requirements
  3. Pilot scope and rollout assumptions are defined
**Plans**: 2 plans

Plans:
- [x] 04-01: Break MVP into epics and milestones
- [ ] 04-02: Define pilot rollout and validation metrics

## Current Implementation Baseline

- Epics 1 through 6 are complete in the codebase: platform foundation, Microsoft Graph connectivity, message ingestion and attachment extraction, classification plus workflow intelligence, the task plus workflow-state engine, and the delayed-filing plus mailbox-action layer.
- The mailbox-action baseline now includes filing decisions, auditable mailbox-action attempts, folder suggestions, category application, invoice routing, outgoing numbering, and mailbox-action verification.
- The next implementation move is to start Epic 7 surface work from the Outlook add-in side, beginning with the first `E7-T#` slice that consumes the now-stable workflow and mailbox-action contracts.
- Dashboard and digest work remain later-phase work after the Outlook add-in baseline advances.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Product Foundation | 1/1 | Complete | 2026-03-30 |
| 2. System Design | 2/2 | Complete | 2026-04-05 |
| 3. Workflow UX | 0/2 | In progress | - |
| 4. MVP Execution Plan | 1/2 | In progress | - |
