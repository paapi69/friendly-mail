import type {
  DailyCompletionDatum,
  LaneBreakdownDatum,
} from "../dashboard.analytics";

export function AnalyticsSidebar({
  completion,
  activityBars,
  laneBreakdown,
  total,
  completedTicketsPerDay,
  averageCycleTimeMinutes
}: {
  completion: number;
  activityBars: Array<{ label: string; value: number }>;
  laneBreakdown: LaneBreakdownDatum[];
  total: number;
  completedTicketsPerDay: DailyCompletionDatum[];
  averageCycleTimeMinutes: number | null;
}) {
  const doneCount = activityBars.find((bar) => bar.label === "D")?.value ?? 0;
  const latestCompletedCount = completedTicketsPerDay.at(-1)?.completedTickets ?? 0;
  const maxCompletedCount = Math.max(
    ...completedTicketsPerDay.map((item) => item.completedTickets),
    1
  );
  const clampedCompletion = Math.max(0, Math.min(100, completion));
  const cycleTimeLabel =
    averageCycleTimeMinutes === null ? "--" : `${averageCycleTimeMinutes} min`;
  const cycleTimeCopy =
    averageCycleTimeMinutes === null
      ? "Waiting for tracked tickets completed in the last 14 days."
      : "Average elapsed time from first in progress to first done, shown in minutes over the last 14 days.";
  const laneRows = ["Frontend", "Backend", "Design"].map((lane) => {
    const match = laneBreakdown.find((item) => item.lane === lane);

    return {
      lane,
      percent: match?.percent ?? 0
    };
  });

  return (
    <aside className="analytics-sidebar">
      <section className="analytics-section">
        <div className="analytics-section__header">
          <h2 className="analytics-section__title">Board Completion</h2>
        </div>

        <div className="analytics-completion-card">
          <div className="analytics-completion-card__summary">
            <div className="analytics-completion-card__value-wrap">
              <p className="analytics-completion-card__value">{clampedCompletion}%</p>
            </div>
            <div className="analytics-completion-card__copy">
              <p className="analytics-completion-card__eyebrow">Visible board cards</p>
              <p className="analytics-completion-card__detail">
                {doneCount} of {total} in Done
              </p>
            </div>
          </div>

          <div className="analytics-completion-card__track" data-testid="board-completion-track">
            <div
              className="analytics-completion-card__fill"
              data-testid="board-completion-fill"
              style={{ width: `${clampedCompletion}%` }}
            />
          </div>
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__header analytics-section__header--split">
          <h2 className="analytics-section__title">Completed Tickets Per Day</h2>
          <p className="analytics-section__meta">{latestCompletedCount} today</p>
        </div>

        <div className="analytics-throughput-chart">
          <div className="analytics-throughput-chart__grid" aria-hidden="true">
            <span className="analytics-throughput-chart__line" />
            <span className="analytics-throughput-chart__line" />
          </div>

          <div className="analytics-throughput-chart__bars">
            {completedTicketsPerDay.map((bar, index) => {
              const height =
                bar.completedTickets === 0
                  ? 10
                  : Math.max(18, Math.round((bar.completedTickets / maxCompletedCount) * 100));
              const isActive = index === completedTicketsPerDay.length - 1;

              return (
                <div
                  key={bar.dayStart}
                  className="analytics-throughput-chart__bar-group"
                  data-testid="throughput-bar"
                >
                  <span className="analytics-throughput-chart__value">{bar.completedTickets}</span>
                  <div className="analytics-throughput-chart__bar-shell">
                    <div
                      className={`analytics-throughput-chart__bar-fill${
                        isActive ? " analytics-throughput-chart__bar-fill--active" : ""
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span
                    className={`analytics-throughput-chart__label${
                      isActive ? " analytics-throughput-chart__label--active" : ""
                    }`}
                  >
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__header">
          <h2 className="analytics-section__title">Avg Cycle Time</h2>
        </div>

        <div className="analytics-cycle-card">
          <p className="analytics-cycle-card__value">{cycleTimeLabel}</p>
          <p className="analytics-cycle-card__caption">{cycleTimeCopy}</p>
        </div>
      </section>

      <section className="analytics-section">
        <div className="analytics-section__header">
          <h2 className="analytics-section__title">Lane Breakdown</h2>
        </div>

        <div className="analytics-lane-list">
          {laneRows.map((row) => (
            <div key={row.lane} className="analytics-lane-row" data-testid="lane-row">
              <div className="analytics-lane-row__header">
                <span className="analytics-lane-row__label">{row.lane}</span>
                <span className="analytics-lane-row__value">{row.percent}%</span>
              </div>
              <div className="analytics-lane-row__track">
                <div
                  className={`analytics-lane-row__fill analytics-lane-row__fill--${row.lane.toLowerCase()}`}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
