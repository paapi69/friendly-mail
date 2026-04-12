# Outlook Add-in Design Brief

## Document Control

- Product: Friendly Mail
- Document type: Epic 7 design brief
- Version: v0.2
- Status: Draft
- Date: 2026-04-06
- Related documents:
  - `friendly-mail-prd.md`
  - `friendly-mail-technical-design.md`
  - `friendly-mail-frontend-strategy.md`
  - `friendly-mail-epic-tickets.md`

## Purpose

This brief defines the locked design baseline and surface contract for Epic 7 and records the first-slice implementation baseline as it lands.

It exists to make the Outlook add-in scope decision-complete for the first design slice, so the team does not keep re-deciding host assumptions, supported clients, or fallback behavior while drawing screens.

## Product and Platform Positioning

- Friendly Mail is an Outlook add-in with a companion web app.
- Epic 7 is the Outlook add-in experience, not a Copilot-plugin-first surface.
- The Outlook add-in is the primary user-facing workflow surface for the MVP.
- On supported desktop and web clients, the add-in should act as the user's compact daily command center as well as the selected-message drill-down surface.
- The add-in should feel calm, Outlook-native, trust-first, and workflow-aware.
- High-impact mailbox actions remain suggestion-first and explicitly approved from the UI.

## Supported MVP Clients

The MVP design should explicitly support:

- Outlook on the web
- new Outlook on Windows

The MVP design should not optimize yet for:

- classic Outlook on Windows
- Outlook for Mac

Those clients can be treated as later compatibility targets, not first-slice design drivers.

Mobile note:

- Outlook mobile add-ins are not the primary interaction target for this MVP brief.
- Mobile queue and detail flows should use the companion dashboard surface instead of assuming a full task-pane experience inside mobile Outlook.

## Supported Mailbox and Item Contexts

The MVP add-in design assumes:

- a delegated user mailbox
- a selected message in read mode
- a pinnable task pane in v1
- the add-in is opened from the selected-message context
- shared mailbox behavior is capability-gated rather than assumed fully supported

Compose support exists only as a later Epic 7 slice for outgoing numbering and should not drive the first-slice wireframes.

## Interaction Flow

The first-slice user journey is:

1. User opens a message in Outlook.
2. User opens the Friendly Mail task pane.
3. Add-in checks host readiness, selected-message context, mailbox linkage, and backend availability.
4. Add-in shows the mailbox readiness and sync-status entry view if the system is not yet ready to show workflow detail.
5. When ready, the add-in shows the message workflow summary and explanation panel for the selected message.
6. If the task pane is pinned and the selected message changes, the add-in re-runs the same readiness and workflow-loading sequence for the new item.

This first slice stops before task mutations, filing approvals, or compose numbering actions.

After the first slice, the locked add-in IA should expand to:

- `Today`
  - compact desktop or web queue, bucket counts, and ranked work
- `This Email`
  - selected-message classification, task, blocker, and filing detail
- `Review`
  - compact FYI or CC and junk-review handling

## Unsupported or Fallback Contexts

The UI must explicitly handle these states instead of failing silently:

- no usable message selected
- unsupported item type
- unsupported host or activation context
- backend unreachable
- backend degraded or stale workflow data
- mailbox not connected
- shared mailbox capability unavailable for the current action
- any Outlook client outside the locked MVP client scope

## First-Slice Design Scope

The first design slice covers only these two screens:

1. Mailbox readiness and sync-status entry view
2. Message workflow summary and explanation panel

Later Epic 7 slices will add:

- task action panel and lifecycle mutations
- filing decision, folder suggestion, and approval UX
- compose and draft numbering experience
- rollout verification

## Screen Inventory and State Matrix

## Locked Add-in IA After the First Slice

For supported desktop and web Outlook clients, the add-in IA is now locked around three top-level sections:

1. `Today`
2. `This Email`
3. `Review`

### `Today`

Purpose:

- answer what needs attention right now without forcing the user to open every message first

Primary content:

- Needs You
- Due Today
- Ready To File
- Waiting or Delegated
- top-ranked next actions

Interaction rules:

- bucket clicks open filtered queue views in-panel
- ranked-item clicks open `This Email` in-panel
- the add-in should not assume that Outlook will focus or select the matching inbox row automatically

### `This Email`

Purpose:

- explain the currently selected or opened message in detail

Primary content:

- actionability and message type
- task state
- blockers
- filing decision
- explanation and confidence

### `Review`

Purpose:

- handle low-noise mail and cleanup work without crowding the primary queue

Primary content:

- FYI or CC review
- junk-candidate review
- later lightweight ready-to-file review if space allows

### Screen 1: Mailbox Readiness and Sync-Status Entry View

Display this screen when the user cannot yet be shown the message workflow summary.

Use these states:

| State | When to use it | Primary CTA |
|---|---|---|
| Connected and ready | Host, mailbox, and backend context are ready | `View message workflow` or auto-advance |
| Connecting | Add-in knows the mailbox is being connected | `Refresh status` |
| Syncing | Mailbox is connected but current sync or readiness is incomplete | `Refresh status` |
| Disconnected | Mailbox is not yet connected to Friendly Mail | `Connect mailbox` |
| Degraded | Backend is unreachable or workflow state cannot be trusted as current | `Retry` |
| Unsupported context | Unsupported host, item, mailbox capability, or activation case | `Learn more` or no primary action |

### Screen 2: Message Workflow Summary and Explanation Panel

Display this screen only when the add-in has enough current data to show trustworthy workflow context for the selected message.

Use these states:

| State | When to use it |
|---|---|
| Loading | Add-in is fetching current message workflow data |
| Ready | Workflow data is current and trustworthy |
| Low confidence | Classification exists, but confidence or explanation requires review |
| Incomplete data | Partial workflow information exists, but key sections are missing |
| Failed read | Add-in could not load message workflow data for the selected message |
| Unsupported item or host context | Host or item cannot support the workflow view |

## Screen-by-Screen Goals

### Screen 1: Mailbox Readiness and Sync-Status Entry View

Purpose:

- tell the user whether Friendly Mail is ready to help for the selected message

Primary content hierarchy:

- connection and readiness headline
- one compact explanation
- one primary CTA
- optional secondary status detail for sync freshness or degraded state

Primary states:

- connected and ready
- connecting
- syncing
- disconnected
- degraded
- unsupported context

CTA rule:

- show one primary next step only, such as `Connect mailbox`, `Retry`, or `Refresh status`
- avoid mixing recovery, diagnostics, and message-level workflow actions on this screen

### Screen 2: Message Workflow Summary and Explanation Panel

Purpose:

- show what Friendly Mail knows about the selected message and why it matters

Primary content hierarchy:

- actionability and message type
- urgency or criticality
- due dates
- key extracted entities
- workflow blockers
- confidence and explanation
- lightweight mini-agent affordance

Primary states:

- loading
- ready
- low confidence
- incomplete data
- failed read
- unsupported item or host context

UI rule:

- structured summary comes first
- the mini-agent affordance is secondary and supports explanation, not primary navigation
- the user must understand urgency, blockers, and confidence without opening a separate screen

## Content Hierarchy Contract

### Readiness screen content order

1. readiness headline
2. short explanation
3. primary CTA
4. optional status detail row
5. optional fallback note for unsupported or degraded cases

### Message workflow screen content order

1. message identity context
2. actionability and message type
3. urgency or criticality
4. due dates and key entities
5. blockers and filing-state summary
6. confidence and explanation
7. mini-agent affordance

The first four items should be visible without expansion in the default read-mode task-pane layout.

## Unsupported-State Rules

- The readiness screen should always use one primary CTA, not a diagnostics-heavy control panel.
- The add-in must not present stale workflow data as current when the backend is degraded.
- Low-confidence classification and incomplete workflow extraction must be shown explicitly.
- Filing blockers must be visible and named clearly.
- Unsupported host, item, mailbox, or client-scope cases must display an intentional fallback state.
- Because the task pane is pinnable in v1, all message-bound content must refresh when the selected item changes.

## Action Taxonomy for Later Epic 7 Tickets

This taxonomy is part of the `E7-T1` contract so later tickets do not re-decide how actions are classified.

- Backend-only workflow actions:
  - task lifecycle changes such as done, snooze, delegate, dismiss, and reopen
- Mailbox actions:
  - filing approval, category application, folder move, invoice routing, draft numbering
- Hybrid actions:
  - UI-triggered actions that update workflow state and then re-evaluate mailbox eligibility in the same user flow

The first slice should show the results of these action classes only in summary form. It should not yet expose the action controls themselves.

## Backend Contract Mapping

The first-slice add-in design should assume these backend read models are the canonical sources for Outlook UI state:

- `GET /mailboxes/:mailboxId/messages/:messageId/classification`
  - source of classification summary, confidence, explanation, urgency, due dates, and extracted entities
- `GET /mailboxes/:mailboxId/messages/:messageId/workflow`
  - source of message workflow state, filing eligibility, blockers, and linked task summaries
- `GET /mailboxes/:mailboxId/messages/:messageId/filing-decision`
  - later Epic 7 source for filing decision, target suggestion, and mailbox-action rationale

The readiness screen may also rely on mailbox connectivity or verification signals already available from the Epic 2 through Epic 6 backend, but `E7-T1` does not require a new UI-only backend contract to be invented before first-slice wireframing.

## Pinned Task-Pane Behavior

Because the MVP assumes a pinnable task pane:

- selected-message changes must trigger a full context refresh
- the panel must never leave the previous message identity visible after a new item is selected
- loading and degraded states must be designed as normal states, not edge-case overlays
- the first slice must feel stable whether the pane is opened fresh or remains pinned while the user moves through messages

## Interaction Model

- Visual direction: Outlook-native calm
- Layout model: structured panel first
- Agent behavior: mini-agent affordance only, not chat-first
- Tone: clear, operational, explainable, and high-trust

## Assumptions Locked Before Wireframing

- Friendly Mail is an Outlook add-in, not a Copilot-plugin-first product.
- The MVP client scope is Outlook on the web plus new Outlook on Windows.
- Epic 7 is read-mode-first.
- The task pane is pinnable in v1.
- Selected-message context is assumed for the MVP design.
- No-item-context activation is not assumed for the first slice.
- Shared mailbox behavior is capability-gated in MVP.
- The first slice excludes task action UI, filing approval UI, and compose numbering UI.
- `E7-T2` provides the implementation baseline for this brief through the host adapter, manifest command surfaces, pinned item-change handling, and browser-preview dev lane at `https://localhost:4173`.

## Implementation Baseline After E7-T2

- The add-in now has a typed host adapter that distinguishes browser preview, supported Outlook hosts, missing-message states, and unsupported-context fallbacks.
- The local dev lane at `https://localhost:4173` now previews readiness, unsupported, host-unavailable, and compose-placeholder states before the full first-slice screens are implemented.
- The manifest now declares the Mailbox requirement-set baseline, read and compose command surfaces, and pinned read-mode task-pane support for the MVP shell.
- The add-in shell now treats selected-message rebinding as a first-class behavior instead of a later edge case.

## Implementation Baseline After E7-T3

- The Outlook add-in now has a real mailbox readiness entry view with explicit connect, syncing, degraded, unsupported, and ready states.
- The add-in dev lane can now use either browser-preview scenarios or live mailbox verification through the proxied API base and mailbox ID fields.
- The readiness view now maps mailbox operational-verification health into user-facing sync and degraded states instead of relying on generic placeholder copy.
- Mailbox connection can now begin from the add-in shell through the Outlook add-in surface contract when a Friendly Mail session is already present.

## Implementation Baseline After E7-T4

- The Outlook add-in now renders a real message workflow summary and explanation panel instead of a placeholder workflow card.
- The workflow panel now shows message identity, actionability, message type, urgency, criticality, due dates, extracted entities, blocker summaries, filing-state guidance, confidence, and explanation.
- The add-in now binds selected Outlook items to the backend through immutable Graph message ID bridge routes for both classification and workflow reads.
- The dev lane at `https://localhost:4173` now previews ready, low-confidence, incomplete-data, and failed-read workflow states for design review before task actions land.
- The first Outlook-native workflow surface is now present, so `E7-T5` can layer task actions onto the same message-summary baseline without redefining the panel contract.

## Implementation Baseline After E7-T5

- The Outlook add-in now renders linked tasks as action cards inside the workflow panel instead of summary-only rows.
- Users can now mark work done, snooze it until a selected time, delegate it to another owner, dismiss it, or reopen it from the same Outlook task pane.
- Task mutations now show inline success or failure feedback and keep task status, filing blockers, and workflow-state summaries aligned after each action.
- The dev lane at `https://localhost:4173` now previews lifecycle mutations locally while the live lane can call the task-transition API for real mailbox-backed workflow updates.
- The task-action surface now exists, so `E7-T6` can focus on filing decisions and explicit mailbox-action approval without re-solving task interaction patterns.

## Implementation Baseline After E7-T6

- The Outlook add-in now renders a real filing-decision panel with delayed-filing state, explicit blockers, target-folder guidance, suggested categories, and mailbox-action rationale.
- Users can now approve filing explicitly from the Outlook task pane once workflow blockers clear, while blocked cases remain visible and non-destructive.
- Filing guidance now refreshes after task mutations so the add-in does not drift away from the Epic 6 mailbox-action decision model.
- The browser-preview lane at `https://localhost:4173` now supports blocked, eligible, and executed filing-review states on top of the same message workflow and task-action surface.
- The add-in now has the trust-first mailbox-action baseline needed for `E7-T7` to focus on compose and draft numbering without re-solving delayed-filing UX.

## Mapping to Epic 7 Tickets

- `E7-T1`: Define the Outlook add-in surface contract and interaction flow
- `E7-T2`: Extend the add-in shell, manifest, and host integration baseline
- `E7-T3`: Implement mailbox connect and sync-status entry view
- `E7-T4`: Implement the message workflow summary and explanation panel
- `E7-T5`: Implement the task action panel and lifecycle mutations
- `E7-T6`: Implement filing decision, folder suggestion, and approval UX
- `E7-T7`: Implement compose and draft numbering experience
- `E7-T8`: Add Outlook add-in verification and rollout readiness
