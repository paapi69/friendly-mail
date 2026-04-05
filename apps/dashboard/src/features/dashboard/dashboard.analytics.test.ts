import { describe, expect, it } from "vitest";
import {
  calculateAverageCycleTimeMinutes,
  deriveDashboardAnalytics,
  type TicketStatusHistoryEvent
} from "./dashboard.analytics";
import type { BoardCard } from "./dashboard.types";

const trackedCard = {
  id: "E3-T1",
  title: "Tracked ticket",
  stakeholderSummary: "Summary",
  owner: "Harry",
  lane: "Backend",
  column: "Done",
  points: 3,
  size: "S",
  labels: ["backend"],
  trackedInPlanning: true
} satisfies BoardCard;

describe("dashboard analytics", () => {
  it("counts completed tracked tickets per calendar day", () => {
    const metrics = deriveDashboardAnalytics(
      [
        trackedCard,
        {
          ...trackedCard,
          id: "E3-T2",
          title: "Second tracked ticket"
        },
        {
          ...trackedCard,
          id: "E7-T1",
          title: "Preview ticket",
          trackedInPlanning: false
        }
      ],
      [
        {
          ticket_id: "E3-T1",
          timestamp: "2026-03-31T09:30:00.000Z",
          status_transition: "done"
        },
        {
          ticket_id: "E3-T2",
          timestamp: "2026-04-07T15:45:00.000Z",
          status_transition: "done"
        },
        {
          ticket_id: "E7-T1",
          timestamp: "2026-04-07T12:00:00.000Z",
          status_transition: "done"
        }
      ],
      {
        days: 4,
        now: new Date("2026-04-02T12:00:00.000Z")
      }
    );

    expect(metrics.completedTicketsPerDay).toEqual([
      { label: "30", dayStart: "2026-03-30", completedTickets: 0 },
      { label: "31", dayStart: "2026-03-31", completedTickets: 1 },
      { label: "01", dayStart: "2026-04-01", completedTickets: 0 },
      { label: "02", dayStart: "2026-04-02", completedTickets: 0 }
    ]);
    expect(metrics.snapshot).toEqual({
      totalCards: 3,
      completionPercent: 100,
      activityBars: [
        { label: "B", value: 0 },
        { label: "R", value: 0 },
        { label: "W", value: 0 },
        { label: "X", value: 0 },
        { label: "D", value: 3 }
      ],
      laneBreakdown: [
        { lane: "Design", count: 0, percent: 0 },
        { lane: "Frontend", count: 0, percent: 0 },
        { lane: "Backend", count: 3, percent: 100 }
      ]
    });
  });

  it("derives average cycle time in minutes from the first valid in-progress to done pair", () => {
    const averageCycleTimeMinutes = calculateAverageCycleTimeMinutes([
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-01T09:00:00.000Z",
        status_transition: "in_progress"
      },
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-01T10:00:00.000Z",
        status_transition: "done"
      },
      {
        ticket_id: "E3-T2",
        timestamp: "2026-04-02T08:00:00.000Z",
        status_transition: "in_progress"
      },
      {
        ticket_id: "E3-T2",
        timestamp: "2026-04-04T08:00:00.000Z",
        status_transition: "in_progress"
      },
      {
        ticket_id: "E3-T2",
        timestamp: "2026-04-02T10:00:00.000Z",
        status_transition: "done"
      }
    ], {
      now: new Date("2026-04-03T00:00:00.000Z")
    });

    expect(averageCycleTimeMinutes).toBe(90);
  });

  it("excludes incomplete ticket histories from average cycle time", () => {
    const averageCycleTimeMinutes = calculateAverageCycleTimeMinutes([
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-01T09:00:00.000Z",
        status_transition: "pending"
      },
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-03T11:00:00.000Z",
        status_transition: "done"
      },
      {
        ticket_id: "E3-T2",
        timestamp: "2026-04-02T08:00:00.000Z",
        status_transition: "in_progress"
      }
    ], {
      now: new Date("2026-04-03T00:00:00.000Z")
    });

    expect(averageCycleTimeMinutes).toBeNull();
  });

  it("limits average cycle time to tickets completed in the last 14 days", () => {
    const averageCycleTimeMinutes = calculateAverageCycleTimeMinutes(
      [
        {
          ticket_id: "E3-T1",
          timestamp: "2026-03-01T09:00:00.000Z",
          status_transition: "in_progress"
        },
        {
          ticket_id: "E3-T1",
          timestamp: "2026-03-01T10:00:00.000Z",
          status_transition: "done"
        },
        {
          ticket_id: "E3-T2",
          timestamp: "2026-04-01T09:00:00.000Z",
          status_transition: "in_progress"
        },
        {
          ticket_id: "E3-T2",
          timestamp: "2026-04-01T11:00:00.000Z",
          status_transition: "done"
        }
      ],
      {
        now: new Date("2026-04-05T00:00:00.000Z"),
        windowDays: 14
      }
    );

    expect(averageCycleTimeMinutes).toBe(120);
  });

  it("ignores history for tickets outside the current tracked card set", () => {
    const events: TicketStatusHistoryEvent[] = [
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-01T09:00:00.000Z",
        status_transition: "in_progress"
      },
      {
        ticket_id: "E3-T1",
        timestamp: "2026-04-03T09:00:00.000Z",
        status_transition: "done"
      },
      {
        ticket_id: "E3-T9",
        timestamp: "2026-04-01T09:00:00.000Z",
        status_transition: "in_progress"
      },
      {
        ticket_id: "E3-T9",
        timestamp: "2026-04-10T09:00:00.000Z",
        status_transition: "done"
      }
    ];

    const metrics = deriveDashboardAnalytics([trackedCard], events, {
      days: 3,
      now: new Date("2026-04-03T12:00:00.000Z")
    });

    expect(metrics.averageCycleTimeMinutes).toBe(2880);
    expect(metrics.completedTicketsPerDay.at(-1)?.completedTickets).toBe(1);
  });

  it("derives board snapshot analytics from the visible cards", () => {
    const metrics = deriveDashboardAnalytics(
      [
        {
          ...trackedCard,
          id: "E7-T1",
          lane: "Design",
          column: "Backlog",
          trackedInPlanning: false
        },
        {
          ...trackedCard,
          id: "E7-T2",
          lane: "Frontend",
          column: "Ready",
          trackedInPlanning: false
        },
        {
          ...trackedCard,
          id: "E3-T6",
          lane: "Backend",
          column: "In Progress"
        },
        {
          ...trackedCard,
          id: "E3-T7",
          lane: "Backend",
          column: "Blocked"
        },
        {
          ...trackedCard,
          id: "E3-T5",
          lane: "Backend",
          column: "Done"
        }
      ],
      [],
      {
        days: 1,
        now: new Date("2026-04-12T00:00:00.000Z")
      }
    );

    expect(metrics.snapshot).toEqual({
      totalCards: 5,
      completionPercent: 20,
      activityBars: [
        { label: "B", value: 1 },
        { label: "R", value: 1 },
        { label: "W", value: 1 },
        { label: "X", value: 1 },
        { label: "D", value: 1 }
      ],
      laneBreakdown: [
        { lane: "Design", count: 1, percent: 20 },
        { lane: "Frontend", count: 1, percent: 20 },
        { lane: "Backend", count: 3, percent: 60 }
      ]
    });
  });
});
