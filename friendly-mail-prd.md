# Friendly Mail PRD

## Document Control

- Product: Friendly Mail
- Document type: Product Requirements Document
- Version: v0.2
- Status: Draft
- Date: 2026-04-05
- Author: Codex PM draft

## 1. Background

High-volume knowledge workers increasingly use Outlook as more than a mail client. It functions as an inbox, filing cabinet, task queue, reminder system, and workflow router. In practice, these jobs are handled manually. Users create personal folder structures, scan emails for tasks and due dates, maintain separate to-do lists, and repeatedly review their inbox to avoid missing important items.

This manual workflow breaks down when email volume rises. Critical notices can be missed, invoices may remain unpaid, filing becomes inconsistent, and users lose time re-triaging the same inbox throughout the day.

Friendly Mail aims to solve this by building an AI-assisted workflow layer on top of Outlook and Microsoft Graph. The product will organize emails, extract work items, identify urgency, and drive reminders while preserving the user's existing mail workflow.

## 2. Problem Statement

Users receive a high volume of emails that require categorization, filing, prioritization, and follow-up. Today, these actions are manual, fragmented, and unreliable.

The key user pain points are:

- Manual email filing into user-specific subfolders
- Inability to auto-file without risking that important emails become hidden
- Manual extraction of tasks from emails and attachments
- Manual prioritization of actions as new emails arrive during the day
- No dependable reminder system for urgent or due-soon items
- Missed invoice and notice workflows that create operational risk
- Manual handling of outgoing reference numbering and sent-mail filing

## 3. Vision

Friendly Mail turns Outlook into an intelligent work console that helps users keep control of high-volume email workflows without changing their core mail habits.

The product should feel like a highly capable assistant:

- It understands what an email is about
- It knows whether action is required
- It can suggest where the email belongs
- It keeps important work visible until done
- It reminds the user when something needs attention

## 4. Goals

- Reduce manual filing work by at least 70% for pilot users
- Reduce time spent identifying urgent emails by at least 80%
- Automatically generate tasks from relevant emails and attachments with high precision
- Prevent important items from being lost after filing
- Create a daily operating rhythm through morning and evening summaries
- Support both personal mailboxes and shared mailboxes where Microsoft Graph allows

## 5. Non-Goals

- Replacing Outlook as the primary email client
- Building a general-purpose team chat or collaboration suite
- Replacing formal ERP or accounts payable systems
- Supporting on-prem Exchange in v1
- Building enterprise document management outside email-driven workflows
- Offering fully autonomous mailbox actions without review controls in v1

## 6. Target Users and Personas

### Primary Personas

#### 6.1 Legal and Compliance Lead

- Receives contracts, notices, regulatory communications, and internal approvals
- Needs accurate filing by counterparty, committee, or subject
- Cannot afford to miss urgent legal notices or deadlines

#### 6.2 Executive or Chief of Staff

- Handles high-volume internal and external correspondence
- Filing style changes by role, topic, event, and team
- Needs a clean daily view of actions and priorities

#### 6.3 Finance or Operations Coordinator

- Receives invoices, payment reminders, approvals, and operational requests
- Needs invoice emails routed correctly and surfaced before due dates

#### 6.4 Shared Mailbox Team

- Operates a committee, legal, finance, or event mailbox
- Needs consistency across multiple users
- Requires visibility into what is pending versus resolved

## 7. Jobs To Be Done

- When a new email arrives, I want to know whether it is informational or actionable so I can focus on work that matters.
- When an email belongs to a known category, I want it filed consistently only after it is safe to move so I can retrieve it later without losing visibility.
- When an email or attachment contains a task or deadline, I want it converted into a tracked action automatically.
- When urgent items arrive, I want them surfaced immediately even if they are also filed away.
- At the start of the day, I want a clear list of unresolved critical items and near-term deadlines.
- At the end of the day, I want unfinished work rolled into tomorrow without manual copying.

## 8. Product Principles

- Assist before automate
- Keep critical work visible until resolved
- Separate email storage from task state
- Defer filing until the email has reached a safe state for retrieval
- Support user-specific workflows without forcing a single filing model
- Explain why the system took or suggested an action
- Earn trust through reversibility and clear controls

## 9. User Problems to Solve

### 9.1 Filing and Retrieval

Users must manually create subfolders and file emails based on personal logic such as counterparty, committee, event, or subject matter.

### 9.2 Triage and Priority

Users cannot safely rely on blunt auto-filing because important emails may disappear from attention once moved.

### 9.3 Task Creation

Users manually copy tasks from emails and documents into OneNote or other trackers.

### 9.4 Dynamic Prioritization

Priorities change throughout the day as new emails arrive, but the current workflow does not update task priority automatically.

### 9.5 Reminder Gaps

There is no trustworthy system that highlights what is due today, due soon, or overdue.

### 9.6 Special Workflows

Certain email types require workflow actions, such as redirecting invoice emails, handling notices, or numbering outgoing emails.

## 10. Product Scope

### 10.1 In Scope for MVP

- Outlook and Microsoft Graph integration
- Mail ingestion for supported user and shared mailboxes
- Folder and category suggestions
- AI classification of email type and business context
- Task extraction from messages and supported attachments
- Due date and urgency extraction
- Criticality scoring based on AI plus configurable rules
- Daily digest and urgent reminder workflows
- Invoice routing automation
- Outgoing email reference numbering support
- Audit trail for actions taken or suggested

### 10.2 Out of Scope for MVP

- Broad workflow orchestration across third-party systems
- Mobile-first native apps
- Full collaboration features such as comments, chat, or live co-editing
- Deep document lifecycle management outside mail-centric tasks
- Autonomous irreversible actions without human review thresholds

## 11. Solution Overview

Friendly Mail will integrate with Microsoft Graph to read mailbox data, organize messages, and perform mailbox actions. On top of this, Friendly Mail will maintain its own task and workflow layer.

The system will:

- Ingest email and attachment content
- Classify the message type and likely filing destination
- Detect whether action is required
- Extract due dates, tasks, entities, and urgency indicators
- Surface confidence and explanation for workflow intelligence decisions, especially when the system is uncertain
- Create or update a structured action record
- Surface critical items through a dashboard and digests
- Apply mailbox actions such as categories, forwarding, and draft preparation immediately where appropriate, while deferring folder moves until the email is safe to archive for later retrieval

## 12. Key Features

### 12.1 Smart Filing

- Suggest folder destination based on user-specific filing behavior
- Support categories such as contract, notice, policy, committee, event, internal, and invoice
- File by counterparty, subject matter, committee name, or event name depending on message type
- Move actionable emails into retrieval folders only after the related action is completed
- Move informational emails into retrieval folders only after the user has read them
- Apply to sent mail as well as received mail where supported

### 12.2 Action Extraction

- Detect tasks in email body and attachments
- Create action items with title, owner, due date, priority, and source email reference
- Keep multiple tasks linked to a single email when needed

### 12.3 Criticality and Priority Engine

- Identify urgent emails using keyword rules, sender rules, content cues, and AI reasoning
- Mark certain items as critical until explicitly resolved
- Re-rank pending tasks when new urgent emails arrive

### 12.4 Reminder System

- Morning briefing with critical pending items, due-today items, and due-soon items
- Midday or real-time alerts for newly detected urgent work
- Evening summary of completed items and rollovers

### 12.5 Workflow Automations

- Route invoice emails to a designated processor
- Maintain company-specific outgoing reference numbering
- Auto-file sent messages after send or draft preparation
- Defer inbox filing actions until completion state for actionable emails or read state for informational emails
- Support organization-level conventions while preserving personal filing structure

### 12.6 Feedback and Learning

- Let users approve, correct, snooze, delegate, or dismiss system suggestions
- Learn from corrections to improve filing, extraction, and urgency prediction over time

## 13. Functional Requirements

### 13.1 Mailbox Integration

- The system must connect to Microsoft 365 mailboxes using Microsoft Graph
- The system must read messages, folders, categories, and supported attachments
- The system must support change tracking using Graph-supported notification and sync mechanisms
- The system must support shared mailboxes where Graph permissions allow

### 13.2 Classification and Extraction

- The system must classify incoming emails into business-relevant categories
- The system must extract structured entities including due dates, counterparties, event names, and committee names
- The system must determine whether an email is informational or actionable
- The system must generate a confidence score and rationale for automated suggestions
- The system must expose a downstream-friendly explanation and confidence read model for user-facing and operational surfaces
- The system must surface ambiguous or low-confidence results explicitly instead of silently behaving as high confidence

### 13.3 Task Management

- The system must maintain a separate action store independent of Outlook folders
- The system must link every task back to its originating email and attachment context
- The system must support status transitions including open, snoozed, delegated, done, and dismissed
- The system must preserve critical status until a user action or configured business rule resolves it

### 13.4 Mailbox Actions

- The system must support creating or suggesting folders and subfolders
- The system must support moving messages only after filing conditions are met
- The system must support applying categories
- The system must support forwarding or routing designated email types
- The system must support draft preparation for outgoing numbered emails

### 13.5 Reminder and Digest

- The system must generate a morning digest of unresolved critical and near-due items
- The system must notify users when a new critical item arrives
- The system must generate an end-of-day summary with completed and rolled-over items

### 13.6 Admin and Configuration

- Admins must be able to configure organization-wide rules and mailbox routing policies
- Users must be able to configure personal filing preferences and notification preferences
- The system must log all applied and suggested actions for review

## 14. User Stories

- As a legal lead, I want notice emails surfaced immediately so I do not miss response deadlines.
- As a legal lead, I want contract and letter emails filed by counterparty so I can retrieve related history quickly.
- As a chief of staff, I want internal and event-related emails grouped intelligently so I spend less time organizing my mailbox.
- As a finance coordinator, I want invoice emails routed automatically so they are not missed until the last minute.
- As a user, I want tasks extracted automatically from emails and attachments so I do not maintain a separate manual list.
- As a user, I want critical emails to remain visible in my action list even after filing.
- As a user, I want to understand why the system marked an email urgent before I trust it.
- As an admin, I want shared mailbox policies enforced consistently without removing personal flexibility.

## 15. Acceptance Criteria

### 15.1 Filing

- Given a supported email type, the system suggests a filing destination with visible rationale
- Given an actionable email, the system does not move the message into a retrieval folder until the related task is marked complete or otherwise resolved
- Given an informational email, the system does not move the message into a retrieval folder until the user has read it
- Given a user-approved filing suggestion and satisfied filing conditions, the system can apply the move or category correctly
- After filing, the source email remains linked to any associated task

### 15.2 Task Extraction

- Given an email containing a clear request, the system creates an action item with a title and source reference
- Given a detectable due date in body or attachment text, the system assigns a due date to the action
- Given a non-actionable FYI email, the system does not create a task by default

### 15.3 Priority

- Given an email that matches critical criteria, the system marks it as critical and surfaces it in the action list
- When a new critical email arrives, the system updates the user's pending priorities without requiring manual re-entry
- Given a low-confidence or ambiguous classification, the system surfaces the uncertainty and explanation so the user can review it safely

### 15.4 Reminder

- At the start of the day, the system generates a pending critical-items summary
- At the end of the day, incomplete items are carried forward to the next day's list

### 15.5 Workflow Automation

- Given an invoice email, the system can route or suggest routing to the configured processor
- Given an outgoing email that requires a reference number, the system can allocate and attach the correct number before send

## 16. Success Metrics

### 16.1 User Outcome Metrics

- Average time spent on manual filing per day
- Average time spent triaging priority items per day
- Percentage reduction in missed urgent items
- Percentage reduction in overdue invoices or notices

### 16.2 Product Quality Metrics

- Filing suggestion precision
- Task extraction precision and recall
- Urgent-item detection precision and recall
- Attachment parsing success rate
- Percentage of suggestions accepted without edit

### 16.3 Adoption Metrics

- Weekly active users
- Daily digest open rate
- Percentage of users relying on Friendly Mail-generated task lists
- Number of shared mailboxes onboarded

## 17. Technical Assumptions

- Microsoft 365 and Exchange Online are the primary mailbox platforms
- Microsoft Graph is the system of record for mailbox data
- Friendly Mail maintains the source of truth for task state and workflow state
- The product will use Microsoft Graph-supported capabilities for mailbox read and write actions
- Some advanced workflow intelligence, especially task persistence and AI reasoning, must live outside native Outlook constructs

## 18. Dependencies

- Microsoft Graph mailbox access and permissions
- Attachment text extraction pipeline for PDFs and other supported file types
- AI model infrastructure for classification, extraction, summarization, and prioritization
- Secure storage for message metadata, task state, audit logs, and user preferences
- Notification delivery mechanism for digests and urgent alerts

## 19. Risks and Mitigations

### 19.1 False Negatives on Critical Items

Risk: The system misses an urgent email.

Mitigation: Start with suggestion-first flows, combine AI with explicit rules, and continuously evaluate high-risk categories such as notices and invoices.

### 19.2 Loss of Trust Due to Over-Automation

Risk: Users stop trusting the product if emails are moved incorrectly or too aggressively.

Mitigation: Make automation reversible, explain actions, and use approval thresholds before auto-applying high-impact changes.

### 19.3 Attachment Parsing Variability

Risk: Scanned or poorly formatted PDFs reduce extraction quality.

Mitigation: Use OCR where needed, surface low-confidence cases, and allow quick user correction.

### 19.4 Personalization Complexity

Risk: Filing styles differ by user, role, and organization.

Mitigation: Separate company-wide rules from personal preferences and learn from user corrections over time.

## 20. Rollout Plan

### Phase 1: Pilot

- Onboard 5 to 20 users in legal, finance, or executive workflows
- Run in suggestion-first mode
- Validate filing accuracy, task extraction quality, and digest usefulness

### Phase 2: Workflow Expansion

- Add shared mailbox support
- Add invoice routing and outgoing numbering
- Increase confidence-based automation in low-risk flows

### Phase 3: Scale

- Add broader administrative controls
- Add richer analytics and team-level reporting
- Extend to more mailbox types and workflows

## 21. Open Questions

- Should v1 default entirely to suggestion-only mode, or allow auto-apply for selected low-risk rules?
- What should be the canonical source for outgoing numbering across teams or business units?
- Should tasks be visible only to the individual user in v1, or should team/shared views be included?
- What attachment formats must be supported at launch beyond PDF?
- What is the minimum acceptable quality threshold for criticality detection before production rollout?

## 22. Appendix

### Source Inputs

- User problem summary extracted from local problem statement document
- Microsoft Graph Outlook mail overview: https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview

### Working Assumption

This PRD assumes that the first release will optimize for trust, correctness, and operational safety rather than maximum automation.
