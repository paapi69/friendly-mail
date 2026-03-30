# Roadmap: Friendly Mail

## Overview

Friendly Mail will move from product definition to a trustworthy v1 that organizes Outlook-based work without hiding unresolved email. The roadmap prioritizes product clarity, safe workflow design, and a strong initial architecture before broader automation.

## Phases

- [ ] **Phase 1: Product Foundation** - Finalize core product definition, user workflows, and success boundaries
- [ ] **Phase 2: System Design** - Define technical architecture, data model, and integration constraints
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
- [ ] 01-01: Finalize PRD and confirm product principles

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
- [ ] 02-01: Define service architecture and event flow
- [ ] 02-02: Define data model and Graph integration boundaries

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
- [ ] 04-01: Break MVP into epics and milestones
- [ ] 04-02: Define pilot rollout and validation metrics

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Product Foundation | 1/1 | Complete | 2026-03-30 |
| 2. System Design | 1/2 | In progress | - |
| 3. Workflow UX | 0/2 | Not started | - |
| 4. MVP Execution Plan | 0/2 | Not started | - |
