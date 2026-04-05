import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalyticsSidebar } from "./AnalyticsSidebar";

describe("AnalyticsSidebar", () => {
  it("renders the redesigned analytics sections and weekly throughput bars", () => {
    const markup = renderToStaticMarkup(
      createElement(AnalyticsSidebar, {
        completion: 42,
        activityBars: [
          { label: "B", value: 1 },
          { label: "R", value: 2 },
          { label: "W", value: 3 },
          { label: "X", value: 1 },
          { label: "D", value: 4 }
        ],
        laneBreakdown: [
          { lane: "Design", count: 1, percent: 17 },
          { lane: "Frontend", count: 2, percent: 33 },
          { lane: "Backend", count: 3, percent: 50 }
        ],
        total: 10,
        completedTicketsPerDay: [
          { label: "10", dayStart: "2026-03-10", completedTickets: 0 },
          { label: "11", dayStart: "2026-03-11", completedTickets: 2 },
          { label: "12", dayStart: "2026-03-12", completedTickets: 4 }
        ],
        averageCycleTimeMinutes: 150
      })
    );

    expect(markup).toContain("Board Completion");
    expect(markup).toContain("42%");
    expect(markup).toContain("4 of 10 in Done");
    expect(markup).toContain("Completed Tickets Per Day");
    expect(markup).toContain("4 today");
    expect(markup).toContain("Avg Cycle Time");
    expect(markup).toContain("150 min");
    expect(markup).toContain("shown in minutes over the last 14 days");
    expect(markup).toContain("Lane Breakdown");
    expect(markup.match(/data-testid="throughput-bar"/g)).toHaveLength(3);
    expect(markup.match(/data-testid="lane-row"/g)).toHaveLength(3);
    expect(markup).toContain('data-testid="board-completion-track"');
    expect(markup).toContain(">0<");
    expect(markup).toContain(">2<");
    expect(markup).toContain(">4<");
  });

  it("renders the cycle-time fallback and minimum-height bars for empty weeks", () => {
    const markup = renderToStaticMarkup(
      createElement(AnalyticsSidebar, {
        completion: 0,
        activityBars: [
          { label: "B", value: 2 },
          { label: "R", value: 0 },
          { label: "W", value: 0 },
          { label: "X", value: 0 },
          { label: "D", value: 0 }
        ],
        laneBreakdown: [
          { lane: "Design", count: 0, percent: 0 },
          { lane: "Frontend", count: 0, percent: 0 },
          { lane: "Backend", count: 0, percent: 0 }
        ],
        total: 2,
        completedTicketsPerDay: [
          { label: "10", dayStart: "2026-03-10", completedTickets: 0 },
          { label: "11", dayStart: "2026-03-11", completedTickets: 0 }
        ],
        averageCycleTimeMinutes: null
      })
    );

    expect(markup).toContain("Waiting for tracked tickets completed in the last 14 days.");
    expect(markup).toContain('height:10%');
    expect(markup).toContain('style="width:0%"');
  });
});
