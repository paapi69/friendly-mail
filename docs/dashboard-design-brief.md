# Dashboard Design Brief

## Document Control

- Product: Friendly Mail
- Document type: Epic 8 design brief
- Version: v0.1
- Status: Locked baseline
- Date: 2026-04-11
- Related documents:
  - `friendly-mail-prd.md`
  - `friendly-mail-technical-design.md`
  - `friendly-mail-frontend-strategy.md`
  - `friendly-mail-epic-tickets.md`
  - `docs/outlook-addin-design-brief.md`

## Purpose

This brief defines the locked baseline for the companion dashboard after the product decision to keep the Outlook add-in as the primary desktop or web in-context surface while using the dashboard for mobile and deeper mailbox-level triage.

## Product Positioning

- Friendly Mail remains an Outlook workflow layer, not a replacement email client.
- The Outlook add-in is the primary desktop or web command-center surface on supported MVP clients.
- The dashboard is the mobile-first companion and deeper mailbox-level triage surface.
- The dashboard complements the add-in instead of duplicating the narrow Outlook task pane.

## Core User Problem

High-volume users can receive hundreds of emails a day and should not need to open each message to understand what needs attention.

The dashboard exists to answer:

- what needs my attention today
- what can I batch-review later
- what is junk or low-value noise
- what is safe to file

## Surface Boundary

### Outlook Add-in

Use the add-in for:

- `Today`
- `This Email`
- `Review`
- in-context workflow actions while the user is already in Outlook

### Dashboard

Use the dashboard for:

- mobile queue and detail
- deeper bucket review
- longer lists and filters
- broader mailbox oversight
- heavier triage sessions that do not fit the Outlook task pane well

## Primary Buckets

The dashboard must organize mailbox work into:

- `Needs Attention`
- `FYI / CC`
- `Junk Candidates`
- `Ready To File`

These buckets must stay consistent with the compact queue model shown in the Outlook add-in.

## First Screen Set

### 1. Today Queue

Purpose:

- show the most important work first

Core content:

- Needs Attention count
- Due Today count
- Ready To File count
- Waiting or Delegated count
- top-ranked tasks or messages

### 2. FYI / CC Review

Purpose:

- support low-noise batch review without polluting the main queue

### 3. Junk Candidate Review

Purpose:

- handle suspected junk safely and visibly

### 4. Ready To File

Purpose:

- show work that is now safe to archive or move

### 5. Mobile Detail

Purpose:

- provide message or task detail on mobile when the Outlook add-in is not the active surface

This is the dashboard equivalent of the add-in's `This Email` view.

## Design Principles

- mobile-first, then responsive upward
- one-glance triage before dense review
- structured over chat-first
- trust-first over aggressive automation
- make risk and blockers explicit
- reduce inbox decision fatigue through ranking and batching

## Interaction Model

The dashboard should feel like a calm operational console:

- top-level queue first
- compact state summaries
- fast drill-in to detail
- clear separation between urgent work and low-noise cleanup

## Success Criteria

The dashboard is successful if:

- a power user can understand the day in seconds
- users do not need to open every message to find the urgent subset
- low-noise review and junk review are visibly separated from real work
- the dashboard works well on mobile-sized screens
- the relationship between dashboard queues and add-in detail feels like one product
