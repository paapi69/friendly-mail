# Dashboard Analytics V1

## Summary

This document defines a narrow first cut of dashboard analytics for Friendly Mail's ticket-tracking board.

V1 covers only two progress-of-work metrics:

- completed tickets per week
- average cycle time

The goal is to introduce the smallest useful history model that can support both metrics reliably without adding a backend, a database change, or a larger sprint-planning system.

## Minimal History Model

V1 should capture only the fields required for the two selected metrics:

- `timestamp`
- `ticket_id`
- `status_transition`

Allowed `status_transition` values:

- `pending`
- `in_progress`
- `done`

Example event shape:

```json
{
  "events": [
    {
      "timestamp": "2026-04-05T10:30:00.000Z",
      "ticket_id": "E3-T6",
      "status_transition": "in_progress"
    },
    {
      "timestamp": "2026-04-08T16:45:00.000Z",
      "ticket_id": "E3-T6",
      "status_transition": "done"
    }
  ]
}
```

### V1 History Rules

- history is append-only
- only tracked tickets are included
- weekly rollups are calendar-week based
- no point field is required in this first cut
- each event represents a status change for a single tracked ticket

## Derived Metrics

### Completed Tickets Per Week

What it measures:

- the number of tracked tickets completed in each calendar week

How it is derived:

- count `done` events grouped by calendar week using `timestamp`

Why it is useful:

- provides the simplest trustworthy throughput metric
- shows whether work is actually reaching completion over time
- works without sizing, sprint windows, or additional planning metadata

V1 interpretation:

- this is a throughput metric, not a forecast
- this is the primary progress chart for the first analytics slice

### Average Cycle Time

What it measures:

- the average elapsed time from the first `in_progress` event to the first later `done` event for the same tracked ticket

How it is derived:

- find the first `in_progress` event for a ticket
- find the first later `done` event for that same ticket
- compute elapsed time between those two timestamps
- average the valid durations across included tickets

Display:

- show cycle time in days

Why it is useful:

- gives a simple signal for how long work takes once it starts
- helps the team understand whether throughput changes are coming from faster completion or just fewer starts
- stays useful even before the team has stable point-based velocity

## Edge-Case Rules

To keep implementation decision-complete, V1 should follow these rules:

- if a ticket has no `in_progress` event, exclude it from cycle-time calculations
- if a ticket has no `done` event, exclude it from cycle-time calculations
- if a ticket has multiple `in_progress` events before completion, use the first one before the first `done`
- if a ticket is reopened later, V1 still uses the first valid `in_progress -> done` pair only
- completed-tickets-per-week counts every `done` event; if the team later wants strict one-time completion counting, that can be a future refinement
- all analytics are tracked-ticket-only, not preview-only board-card analytics

## How to Visualize This

### Completed Tickets Per Week

Use:

- vertical bar chart

Chart definition:

- x-axis: week
- y-axis: completed ticket count

Why this chart:

- weekly throughput is easiest to compare in discrete bar form
- the chart makes week-over-week changes immediately visible

### Average Cycle Time

Use:

- KPI stat card

Card definition:

- display the value in days
- optional small trend sparkline only if enough history exists

Why this treatment:

- cycle time is a summary metric first
- a stat card keeps the first version simple and readable

### Presentation Rules

- use bar charts for weekly throughput
- use KPI cards for single-value summary metrics
- do not introduce pie or donut charts for this V1 slice

## Out of Scope for Now

This first cut explicitly does not include:

- completed points per week
- WIP count
- burn-up
- rolling velocity trends
- sprint metrics
- owner or lane breakdowns
- backend or API analytics endpoints
- database schema changes

These can be added later if the minimal history model proves useful and the team wants a broader progress dashboard.

## Test and Verification

Verify the implementation against this spec by confirming:

- the history model uses only `timestamp`, `ticket_id`, and `status_transition`
- both metrics are derivable from those fields alone
- cycle time is defined and displayed in days
- the visuals are limited to:
  - bar chart for completed tickets per week
  - KPI card for average cycle time
- V1 is tracked-ticket-only and weekly-window-based

## Assumptions

- the file lives at `docs/analytics-dashboard.md`
- this is an internal planning and specification document only
- weekly throughput is enough for this first cut
- the smallest useful history model is preferred over point tracking or sprint modeling in V1
