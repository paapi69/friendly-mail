import { DonutChart } from "./DonutChart";

const reminderItems = [
  { title: "Team Standup", time: "Today at 10:00 AM", tone: "danger" },
  { title: "Review Kanban Backlog", time: "Tomorrow at 1:30 PM", tone: "success" }
] as const;

export function AnalyticsSidebar({
  completion,
  growthText,
  activityBars,
  laneBreakdown,
  total
}: {
  completion: number;
  growthText: string;
  activityBars: Array<{ label: string; value: number }>;
  laneBreakdown: Array<{ lane: string; percent: number }>;
  total: number;
}) {
  return (
    <aside className="analytics-sidebar">
      <section className="analytics-panel">
        <div className="analytics-panel__header">
          <h2 className="analytics-panel__title">Activity</h2>
          <span className="analytics-panel__link">See all</span>
        </div>

        <div className="analytics-panel__metric">
          <span className="analytics-panel__metric-value">{completion}%</span>
          <div className="analytics-panel__metric-copy">
            <p className="analytics-panel__growth">
              <span className="material-symbols-outlined analytics-panel__growth-icon">
                trending_up
              </span>
              {growthText}
            </p>
            <p className="analytics-panel__growth-label">Growth</p>
          </div>
        </div>

        <div className="analytics-panel__bars">
          {activityBars.map((bar) => {
            const max = Math.max(...activityBars.map((item) => item.value), 1);
            const height = Math.max(40, Math.round((bar.value / max) * 95));

            return (
              <div key={bar.label} className="analytics-panel__bar-group">
                <div className="analytics-panel__bar-shell">
                  <div className="analytics-panel__bar-fill" style={{ height: `${height}%` }} />
                </div>
                <span className="analytics-panel__bar-label">{bar.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="analytics-panel analytics-panel--projects">
        <h2 className="analytics-panel__title">Projects worked</h2>
        <div className="analytics-panel__projects">
          <DonutChart values={laneBreakdown.map((item) => item.percent)} total={total} />
          <div className="analytics-panel__legend">
            {laneBreakdown.map((item) => (
              <div key={item.lane} className="analytics-panel__legend-row">
                <div className="analytics-panel__legend-label">
                  <span
                    className={`analytics-panel__legend-dot analytics-panel__legend-dot--${item.lane.toLowerCase()}`}
                  />
                  <span>{item.lane}</span>
                </div>
                <span className="analytics-panel__legend-value">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="analytics-panel">
        <h2 className="analytics-panel__title">Reminders</h2>
        <div className="reminders-list">
          {reminderItems.map((reminder) => (
            <div key={reminder.title} className="reminder-card">
              <span className={`reminder-card__dot reminder-card__dot--${reminder.tone}`} />
              <div className="reminder-card__copy">
                <p className="reminder-card__title">{reminder.title}</p>
                <p className="reminder-card__time">{reminder.time}</p>
              </div>
              <span className="material-symbols-outlined reminder-card__chevron">chevron_right</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
