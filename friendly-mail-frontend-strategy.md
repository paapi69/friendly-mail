# Friendly Mail Front-End Strategy Memo

## Product Direction

Friendly Mail will launch as an `Outlook add-in with a companion web app`, with an `agent-style interaction model` embedded inside both surfaces.

Friendly Mail will not launch as a Chrome extension or a standalone downloadable email client in v1.

## Why This Is The Front End

Friendly Mail's core actions happen in the context of an email:

- classify whether the message is actionable or informational
- explain why it is critical
- extract or update tasks
- show due dates and reminders
- gate filing until the message is safe to move

These moments happen inside Outlook. As a result, the product will meet users inside Outlook rather than asking them to switch to a separate client. The Outlook add-in model gives Friendly Mail direct in-context workflow control across Outlook surfaces supported by Microsoft's add-in platform.

Sources:

- [Outlook add-ins](https://learn.microsoft.com/office/dev/add-ins/outlook/)
- [Event-based activation](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/autolaunch)

## Product Shape

### Primary Surface: Outlook Add-in

The Outlook add-in is the primary product surface. It is where users will interact with Friendly Mail while reading and composing email.

The add-in will present:

- actionability: actionable vs informational
- extracted tasks and deadlines
- criticality explanation
- suggested filing destination
- current filing eligibility
- actions such as mark done, delegate, snooze, dismiss, and approve filing

### Secondary Surface: Companion Web App

The companion web app is the management layer for the product. It will support:

- full task dashboard
- morning and evening digests
- unresolved critical items
- shared mailbox workflows
- routing rules
- admin controls
- audit history and analytics

### Interaction Model: Embedded Agent

Friendly Mail will use an embedded copilot or agent interaction model inside the add-in and dashboard.

The agent will answer workflow questions such as:

- "Why is this urgent?"
- "What is blocking filing?"
- "What should I do next?"
- "Show all unresolved notices due this week."

This agent will function as the reasoning and workflow layer inside Friendly Mail. It will not be presented as a novelty assistant or as a separate product category.

## v1 Front-End Boundaries

### Chrome Extension Is Out of Scope for v1

Friendly Mail will not launch as a Chrome extension. A browser extension would only cover Outlook Web, would be more brittle against interface changes, and would leave desktop and mobile Outlook workflows under-served.

### Standalone Downloadable App Is Out of Scope for v1

Friendly Mail will not launch as a standalone downloadable app. A standalone client would position the product as an Outlook replacement, increase adoption friction, and move the company into a different competitive category than the one Friendly Mail is built to win.

## Current Market Context

There is overlap in the market, but mostly in partial form rather than as a direct equivalent to Friendly Mail.

### Microsoft Overlap

Microsoft 365 Copilot and Copilot in Outlook already cover summarization, drafting, and general AI assistance inside the Microsoft ecosystem.

Source:

- [Microsoft 365 Copilot](https://www.microsoft.com/microsoft-365/microsoft-copilot)

### AI Email Client Overlap

Shortwave and Superhuman provide AI-assisted email workflows, triage, and productivity features. They operate closer to smart inbox clients than to Outlook-native workflow systems layered on top of Microsoft mail infrastructure.

Sources:

- [Shortwave](https://www.shortwave.com/)
- [Superhuman](https://superhuman.com/ai)

### Shared Inbox Workflow Overlap

Front and Missive support shared inboxes, assignments, and workflow collaboration. They overlap more with team inbox operations than with Outlook-native legal, executive, and administrative filing workflows.

Sources:

- [Front](https://front.com/solutions/shared-inbox)
- [Missive](https://missiveapp.com/usecase)

### Email Filtering Overlap

SaneBox overlaps on sorting, reminders, and follow-up workflows, but it does not center the product around task extraction and delayed filing tied to read state or action completion.

Source:

- [SaneBox](https://www.sanebox.com/)

## Strategic Differentiation

Friendly Mail is differentiated by the combination of:

- Outlook-native workflow augmentation
- action-vs-information detection
- delayed filing based on read state or action completion
- task persistence separate from folder state
- legal, executive, finance, and committee workflows
- high-trust operational handling of notices, invoices, and deadlines

This places Friendly Mail in a more workflow- and operations-driven category than most current email AI tools.

## Strategic Position

Friendly Mail is an AI workflow layer for Outlook, not a replacement email client.

That positioning determines the front-end strategy:

- the Outlook add-in is the primary user surface
- the companion web app is the management and operations surface
- the embedded agent is the interaction model across both

## Conclusion

Friendly Mail will enter the market as an Outlook-native product. It will augment Outlook rather than compete with it, and it will use an embedded agent model to make triage, task tracking, delayed filing, and workflow execution feel native to the user's existing email environment.
