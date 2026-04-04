# Prototype Kanban Board

## Scope

This board is for the first user-meaningful Friendly Mail prototype.

Prototype target:

- backend mailbox-connectivity flow works through Epic 2 operational verification
- Outlook add-in has a minimal workflow surface to show what Friendly Mail knows about a message

## Accuracy Notes

The board below uses:

- **Actual completed engineering work** for `E1` and `E2-T1` through `E2-T9`
- **Planned prototype tickets** for design and frontend work that have not yet been tracked in `.planning/epic-status.json`

So:

- `Done` items in Epic 1 and current Epic 2 backend are factual
- new role-split prototype tickets below are planning tickets created from the current roadmap and frontend strategy
- when an implementation ticket changes status, this document and `apps/dashboard/src/App.tsx` should be updated in the same session when practical
- the dashboard preview also shows a one-line stakeholder summary for each ticket so non-engineering viewers can scan the board quickly
- tracked engineering ticket status in the preview should be derived from `.planning/epic-status.json`
- the dashboard preview shell now switches between `Master Board`, `Tom`, `Dick`, and `Harry`

## Prototype Milestone

- **Prototype checkpoint**: backend through `E3-T8` plus a thin add-in UI slice

## Swimlane: Design

### Ready

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E7-T1` | Define Outlook add-in prototype flow for mailbox connect, sync state, and message work panel | Clarifies the first Outlook add-in experience so the prototype tells a coherent product story. | `Tom` | `E7` | `3` | `S` | `design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:S`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin` |
| `E7-T2` | Create low-fidelity wireframes for message summary, task area, and filing-state explanation | Shows how users will understand what Friendly Mail knows about an email and why it suggests action. | `Tom` | `E7` | `5` | `M` | `design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:M`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E8-T1` | Define dashboard prototype information architecture for critical items and unresolved work | Organizes the dashboard so leaders can quickly see critical work, status, and unresolved items. | `Tom` | `E8` | `5` | `M` | `design`, `epic:E8`, `surface:dashboard`, `type:design`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Frontend

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E7-T3` | Add Outlook add-in mailbox connect and sync-status entry view | Gives users a simple entry point to connect Outlook and see whether Friendly Mail is actively syncing. | `Dick` | `E7` | `5` | `M` | `E7-T1` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E7-T4` | Build add-in message work panel showing classification placeholder, tasks placeholder, and filing-state placeholder | Creates the core in-context email panel where Friendly Mail will explain work, urgency, and filing state. | `Dick` | `E7` | `8` | `L` | `E7-T2` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `E7-T5` | Bind add-in prototype views to live mailbox-connect and sync APIs | Turns the add-in from a static demo into a live experience backed by real mailbox status and sync data. | `Dick` | `E7` | `5` | `M` | `E7-T3`, `E7-T4`, `E2-T8` | `frontend`, `epic:E7`, `surface:addin`, `type:integration`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E8-T2` | Add companion dashboard prototype page for mailbox status and critical-work summary | Gives leaders and users a simple web view of mailbox health and the most important unresolved work. | `Dick` | `E8` | `5` | `M` | `E8-T1` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Backend

### Done

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E2-T1` | Define Microsoft Entra and Graph Connectivity Contract | Locked how Friendly Mail connects to Outlook safely so later mailbox work builds on a stable access model. | `Harry` | `E2` | `2` | `XS` | `backend`, `epic:E2`, `surface:graph`, `type:spec`, `priority:P0`, `size:XS`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T2` | Extend Persistence for Mailbox Connectivity and Sync State | Stores mailbox connection and sync progress so Friendly Mail can track real setup and syncing over time. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T3` | Implement the Core Microsoft Graph Connector | Built the shared Outlook data connector that all mailbox reading and syncing now depends on. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T4` | Build Delegated Mailbox Onboarding | Lets a user connect their Outlook mailbox so Friendly Mail can start working with real email. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:security` |
| `E2-T5` | Implement Folder Discovery and Initial Folder Sync | Gives Friendly Mail a reliable picture of a mailbox folder structure before deeper email processing begins. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T6` | Implement Message Metadata Sync with Delta Links | Keeps mailbox message records up to date efficiently so Friendly Mail can react to changes without rereading everything. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:workflow-safety` |
| `E2-T7` | Implement Graph Subscription and Webhook Lifecycle | Allows Friendly Mail to hear about mailbox changes quickly instead of waiting for slow periodic refreshes. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:security` |
| `E2-T8` | Implement Reconciliation Between Webhooks and Delta Sync | Makes mailbox updates durable so Friendly Mail stays accurate even when real-time notifications are missed. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:workflow-safety` |
| `E2-T9` | Add Shared-Mailbox Readiness and Operational Verification | Shows whether mailbox connectivity is healthy and makes shared-mailbox limitations explicit before rollout. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:graph`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E3-T1` | Define Message Ingestion and Extraction Contract | Defined what email and attachment content Friendly Mail will capture before it starts classifying or automating work. | `Harry` | `E3` | `3` | `S` | `backend`, `epic:E3`, `surface:workflow`, `type:spec`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1` |
| `E3-T2` | Extend Persistence for Message Bodies, Attachments, and Extraction State | Stores email body and attachment information so later features can understand what work the message contains. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E3-T4` | Implement attachment metadata retrieval and durable linking | Gives Friendly Mail a dependable inventory of attachments so important supporting documents are not overlooked. | `Harry` | `E3` | `5` | `M` | `E3-T2`, `E3-T3` | `backend`, `epic:E3`, `surface:api`, `type:integration`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1` |
| `E3-T5` | Implement PDF-first attachment text extraction | Lets Friendly Mail read the contents of PDF attachments, where many notices, invoices, and contracts actually live. | `Harry` | `E3` | `8` | `L` | `E3-T3`, `E3-T4` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:backlog`, `milestone:prototype-v1` |
| `E3-T6` | Add OCR fallback and extraction confidence handling | Improves coverage for scanned documents while still showing when Friendly Mail is less certain about what it read. | `Harry` | `E3` | `5` | `M` | `E3-T5` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1` |
| `E3-T7` | Orchestrate idempotent ingestion and attachment processing | Prevents duplicate processing so repeated mailbox updates do not create noisy or inconsistent downstream results. | `Harry` | `E3` | `8` | `L` | `E3-T3`, `E3-T4`, `E3-T5` | `backend`, `epic:E3`, `surface:workflow`, `type:integration`, `priority:P0`, `size:L`, `status:backlog`, `milestone:prototype-v1` |
| `E3-T8` | Add operational verification for ingestion and extraction | Shows whether content ingestion and document reading are healthy so the team can spot reliability gaps early. | `Harry` | `E3` | `5` | `M` | `E3-T5`, `E3-T6`, `E3-T7` | `backend`, `epic:E3`, `surface:workflow`, `type:verification`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1` |
| `E7-T6` | Expose a prototype mailbox status endpoint for the add-in UI | Gives the add-in a simple backend signal for showing mailbox health and sync readiness inside Outlook. | `Harry` | `E7` | `3` | `S` | `E2-T8` | `backend`, `epic:E7`, `surface:api`, `type:feature`, `priority:P1`, `size:S`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin` |

### Ready

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E3-T3` | Implement the message ingestion service | Turns synced mailbox records into normalized email content that the rest of Friendly Mail can reason about. | `Harry` | `E3` | `5` | `M` | `E3-T1`, `E3-T2` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P0`, `size:M`, `status:ready`, `milestone:prototype-v1` |

### Blocked

| Ticket | Title | Owner | Epic | Points | Size | Blocker | Labels |
|---|---|---|---|---:|---|---|---|
| `E4-T1` | Add classification and task summary data for the add-in prototype | `Harry` | `E4` / `E5` | `13` | `XL` | `E3`, `E4`, `E5` not yet started | `backend`, `surface:workflow`, `type:feature`, `priority:P1`, `size:XL`, `status:blocked`, `milestone:prototype-v1`, `risk:workflow-safety` |

## Suggested Sprint Framing

### Sprint A

Focus:

- `E3-T1`
- `E7-T1`
- `E7-T2`

### Sprint B

Focus:

- `E3-T2`
- `E3-T3`
- `E7-T3`

### Sprint C

Focus:

- `E3-T5`
- `E3-T7`
- optional `E8-T2`

## Recommended Labels To Use First

If you want a lean label set to start with, use these first:

- `design`
- `frontend`
- `backend`
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

## Why These Labels and Summaries

- `design`, `frontend`, and `backend` keep ownership obvious
- `epic:*` keeps roadmap traceability
- `surface:*` tells the team where the change lands
- `type:*` separates feature work from design and integration work
- `priority:*` helps PM ordering
- `size:*` keeps work comparable
- `status:*` mirrors the board state
- `milestone:*` makes prototype filtering easy
- stakeholder summaries make the same board easier for product and leadership to scan
