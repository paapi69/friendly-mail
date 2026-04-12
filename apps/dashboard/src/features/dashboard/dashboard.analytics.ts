import historyDocument from "../../../../../.planning/ticket-status-history.json";
import type { BoardCard } from "./dashboard.types";

export type TicketStatusTransition = "pending" | "in_progress" | "done";

export type TicketStatusHistoryEvent = {
  timestamp: string;
  ticket_id: string;
  status_transition: TicketStatusTransition;
};

type TicketStatusHistoryDocument = {
  events: TicketStatusHistoryEvent[];
};

export type DailyCompletionDatum = {
  label: string;
  dayStart: string;
  completedTickets: number;
};

export type ActivityBarDatum = {
  label: "B" | "R" | "W" | "X" | "D";
  value: number;
};

export type LaneBreakdownDatum = {
  lane: "Design" | "Frontend" | "Backend";
  count: number;
  percent: number;
};

export type BoardSnapshotAnalytics = {
  totalCards: number;
  completionPercent: number;
  activityBars: ActivityBarDatum[];
  laneBreakdown: LaneBreakdownDatum[];
};

export type DashboardAnalyticsSummary = {
  snapshot: BoardSnapshotAnalytics;
  completedTicketsPerDay: DailyCompletionDatum[];
  averageCycleTimeMinutes: number | null;
};

const minuteInMilliseconds = 60 * 1000;
const dayInMilliseconds = 24 * 60 * minuteInMilliseconds;

export const ticketStatusHistoryEvents = (
  historyDocument as TicketStatusHistoryDocument
).events.slice();

export function deriveDashboardAnalytics(
  cards: BoardCard[],
  events: TicketStatusHistoryEvent[],
  options: {
    now?: Date;
    days?: number;
    cycleTimeWindowDays?: number;
  } = {}
): DashboardAnalyticsSummary {
  const referenceNow = options.now ?? new Date();
  const trackedIds = new Set(
    cards.filter((card) => card.trackedInPlanning).map((card) => card.id)
  );
  const trackedEvents = sortHistoryEvents(
    events.filter((event) => trackedIds.has(event.ticket_id))
  );

  return {
    snapshot: buildBoardSnapshot(cards),
    completedTicketsPerDay: buildCompletedTicketsPerDay(
      trackedEvents,
      referenceNow,
      options.days ?? 6
    ),
    averageCycleTimeMinutes: calculateAverageCycleTimeMinutes(trackedEvents, {
      now: referenceNow,
      windowDays: options.cycleTimeWindowDays ?? 14
    })
  };
}

export function calculateAverageCycleTimeMinutes(
  events: TicketStatusHistoryEvent[],
  options: {
    now?: Date;
    windowDays?: number;
  } = {}
): number | null {
  const eventsByTicket = groupEventsByTicket(sortHistoryEvents(events));
  const durationsInMinutes: number[] = [];
  const referenceNow = options.now ?? new Date();
  const windowDays = Math.max(options.windowDays ?? 14, 1);
  const windowStartTimestamp = referenceNow.getTime() - windowDays * dayInMilliseconds;

  for (const ticketEvents of eventsByTicket.values()) {
    let firstInProgressTimestamp: number | null = null;

    for (const event of ticketEvents) {
      const eventTimestamp = Date.parse(event.timestamp);

      if (Number.isNaN(eventTimestamp)) {
        continue;
      }

      if (event.status_transition === "in_progress" && firstInProgressTimestamp === null) {
        firstInProgressTimestamp = eventTimestamp;
        continue;
      }

      if (
        event.status_transition === "done" &&
        firstInProgressTimestamp !== null &&
        eventTimestamp >= firstInProgressTimestamp
      ) {
        if (eventTimestamp < windowStartTimestamp || eventTimestamp > referenceNow.getTime()) {
          break;
        }

        durationsInMinutes.push(
          (eventTimestamp - firstInProgressTimestamp) / minuteInMilliseconds
        );
        break;
      }
    }
  }

  if (durationsInMinutes.length === 0) {
    return null;
  }

  const average =
    durationsInMinutes.reduce((sum, duration) => sum + duration, 0) / durationsInMinutes.length;

  return Math.round(average);
}

function buildBoardSnapshot(cards: BoardCard[]): BoardSnapshotAnalytics {
  const totalCards = cards.length;
  const doneCount = cards.filter((card) => card.column === "Done").length;
  const counts = {
    backlog: cards.filter((card) => card.column === "Backlog").length,
    ready: cards.filter((card) => card.column === "Ready").length,
    progress: cards.filter((card) => card.column === "In Progress").length,
    blocked: cards.filter((card) => card.column === "Blocked").length,
    done: doneCount
  };
  const denominator = Math.max(totalCards, 1);
  const lanes = ["Design", "Frontend", "Backend"] as const;

  return {
    totalCards,
    completionPercent: totalCards ? Math.round((doneCount / totalCards) * 100) : 0,
    activityBars: [
      { label: "B", value: counts.backlog },
      { label: "R", value: counts.ready },
      { label: "W", value: counts.progress },
      { label: "X", value: counts.blocked },
      { label: "D", value: counts.done }
    ],
    laneBreakdown: lanes.map((lane) => {
      const count = cards.filter((card) => card.lane === lane).length;

      return {
        lane,
        count,
        percent: Math.round((count / denominator) * 100)
      };
    })
  };
}

function buildCompletedTicketsPerDay(
  events: TicketStatusHistoryEvent[],
  now: Date,
  days: number
) {
  const safeDays = Math.max(days, 1);
  const currentDayStart = getDayStart(now);
  const dayStarts = Array.from({ length: safeDays }, (_, index) =>
    addDays(currentDayStart, -(safeDays - 1 - index))
  );

  const completedCountsByDay = new Map<string, number>();

  for (const event of events) {
    if (event.status_transition !== "done") {
      continue;
    }

    const timestamp = Date.parse(event.timestamp);
    if (Number.isNaN(timestamp)) {
      continue;
    }

    const dayStart = getDayStart(new Date(timestamp));
    const key = toIsoDate(dayStart);
    completedCountsByDay.set(key, (completedCountsByDay.get(key) ?? 0) + 1);
  }

  return dayStarts.map((dayStart) => {
    const key = toIsoDate(dayStart);

    return {
      label: formatDayLabel(dayStart),
      dayStart: key,
      completedTickets: completedCountsByDay.get(key) ?? 0
    };
  });
}

function sortHistoryEvents(events: TicketStatusHistoryEvent[]) {
  return [...events].sort((left, right) => {
    const leftTimestamp = Date.parse(left.timestamp);
    const rightTimestamp = Date.parse(right.timestamp);

    if (Number.isNaN(leftTimestamp) || Number.isNaN(rightTimestamp)) {
      return left.timestamp.localeCompare(right.timestamp);
    }

    return leftTimestamp - rightTimestamp;
  });
}

function groupEventsByTicket(events: TicketStatusHistoryEvent[]) {
  const eventsByTicket = new Map<string, TicketStatusHistoryEvent[]>();

  for (const event of events) {
    const ticketEvents = eventsByTicket.get(event.ticket_id) ?? [];
    ticketEvents.push(event);
    eventsByTicket.set(event.ticket_id, ticketEvents);
  }

  return eventsByTicket;
}

function getDayStart(date: Date) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  return dayStart;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    timeZone: "UTC"
  }).format(date);
}
