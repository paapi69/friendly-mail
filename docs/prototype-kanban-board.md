# Prototype Kanban Board

## Scope

This board is for the first user-meaningful Friendly Mail prototype.

Prototype target:

- backend mailbox-connectivity flow works through Epic 2 operational verification
- Outlook add-in has a minimal workflow surface to show what Friendly Mail knows about a message

## Accuracy Notes

The board below uses:

- **Actual completed engineering work** for `E1` and `E2-T1` through `E2-T7`
- **Planned prototype tickets** for design and frontend work that have not yet been tracked in `.planning/epic-status.json`

So:

- `Done` items in Epic 1 and current Epic 2 backend are factual
- new role-split prototype tickets below are planning tickets created from the current roadmap and frontend strategy
- when an implementation ticket changes status, this document and `apps/dashboard/src/App.tsx` should be updated in the same session when practical

## Prototype Milestone

- **Prototype checkpoint**: backend through `E2-T9` plus a thin add-in UI slice

## Swimlane: Design

### Ready

| Ticket | Title | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---:|---|---|
| `D-PROT-1` | Define Outlook add-in prototype flow for mailbox connect, sync state, and message work panel | `Dora` | `E7` | `3` | `S` | `discipline:design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:S`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin` |
| `D-PROT-2` | Create low-fidelity wireframes for message summary, task area, and filing-state explanation | `Dora` | `E7` | `5` | `M` | `discipline:design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:M`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |

### Backlog

| Ticket | Title | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---:|---|---|
| `D-PROT-3` | Define dashboard prototype information architecture for critical items and unresolved work | `Dora` | `E8` | `5` | `M` | `discipline:design`, `epic:E8`, `surface:dashboard`, `type:design`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Frontend

### Backlog

| Ticket | Title | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---:|---|---|---|
| `F-PROT-1` | Add Outlook add-in mailbox connect and sync-status entry view | `Tom` | `E7` | `5` | `M` | `D-PROT-1` | `discipline:frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `F-PROT-2` | Build add-in message work panel showing classification placeholder, tasks placeholder, and filing-state placeholder | `Tom` | `E7` | `8` | `L` | `D-PROT-2` | `discipline:frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `F-PROT-3` | Bind add-in prototype views to live mailbox-connect and sync APIs | `Tom` | `E7` | `5` | `M` | `F-PROT-1`, `F-PROT-2`, `E2-T8` | `discipline:frontend`, `epic:E7`, `surface:addin`, `type:integration`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `F-PROT-4` | Add companion dashboard prototype page for mailbox status and critical-work summary | `Tom` | `E8` | `5` | `M` | `D-PROT-3` | `discipline:frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Backend

### Done

| Ticket | Title | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---:|---|---|
| `E2-T1` | Define Microsoft Entra and Graph Connectivity Contract | `Jerry` | `E2` | `2` | `XS` | `discipline:backend`, `epic:E2`, `surface:graph`, `type:spec`, `priority:P0`, `size:XS`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T2` | Extend Persistence for Mailbox Connectivity and Sync State | `Jerry` | `E2` | `5` | `M` | `discipline:backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T3` | Implement the Core Microsoft Graph Connector | `Jerry` | `E2` | `5` | `M` | `discipline:backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T4` | Build Delegated Mailbox Onboarding | `Jerry` | `E2` | `8` | `L` | `discipline:backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:security` |
| `E2-T5` | Implement Folder Discovery and Initial Folder Sync | `Jerry` | `E2` | `5` | `M` | `discipline:backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T6` | Implement Message Metadata Sync with Delta Links | `Jerry` | `E2` | `8` | `L` | `discipline:backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:workflow-safety` |
| `E2-T7` | Implement Graph Subscription and Webhook Lifecycle | `Jerry` | `E2` | `8` | `L` | `discipline:backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:security` |

### Ready

| Ticket | Title | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---:|---|---|---|
| `E2-T8` | Implement Reconciliation Between Webhooks and Delta Sync | `Jerry` | `E2` | `8` | `L` | `E2-T7` | `discipline:backend`, `epic:E2`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:ready`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:workflow-safety` |

### Backlog

| Ticket | Title | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---:|---|---|---|
| `E2-T9` | Add Shared-Mailbox Readiness and Operational Verification | `Jerry` | `E2` | `5` | `M` | `E2-T8` | `discipline:backend`, `epic:E2`, `surface:graph`, `type:verification`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `B-PROT-1` | Expose a prototype mailbox status endpoint for the add-in UI | `Jerry` | `E7` | `3` | `S` | `E2-T8` | `discipline:backend`, `epic:E7`, `surface:api`, `type:feature`, `priority:P1`, `size:S`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin` |

### Blocked

| Ticket | Title | Owner | Epic | Points | Size | Blocker | Labels |
|---|---|---|---|---:|---|---|---|
| `B-PROT-2` | Add classification and task summary data for the add-in prototype | `Jerry` | `E4` / `E5` | `13` | `XL` | `E3`, `E4`, `E5` not yet started | `discipline:backend`, `surface:workflow`, `type:feature`, `priority:P1`, `size:XL`, `status:blocked`, `milestone:prototype-v1`, `risk:workflow-safety` |

## Suggested Sprint Framing

### Sprint A

Focus:

- `E2-T8`
- `D-PROT-1`
- `D-PROT-2`

### Sprint B

Focus:

- `E2-T8`
- `E2-T9`
- `F-PROT-1`
- `F-PROT-2`

### Sprint C

Focus:

- `B-PROT-1`
- `F-PROT-3`
- optional `F-PROT-4`

## Recommended Labels To Use First

If you want a lean label set to start with, use these first:

- `discipline:design`
- `discipline:frontend`
- `discipline:backend`
- `epic:E2`
- `epic:E7`
- `epic:E8`
- `surface:addin`
- `surface:dashboard`
- `surface:api`
- `surface:graph`
- `type:feature`
- `type:design`
- `type:integration`
- `priority:P0`
- `priority:P1`
- `priority:P2`
- `size:S`
- `size:M`
- `size:L`
- `size:XL`
- `status:backlog`
- `status:ready`
- `status:in-progress`
- `status:blocked`
- `status:done`
- `milestone:prototype-v1`

## Why These Labels

- `discipline:*` makes ownership obvious
- `epic:*` keeps roadmap traceability
- `surface:*` tells the team where the change lands
- `type:*` separates feature work from design and integration work
- `priority:*` helps PM ordering
- `size:*` keeps work comparable
- `status:*` mirrors the board state
- `milestone:*` makes prototype filtering easy
