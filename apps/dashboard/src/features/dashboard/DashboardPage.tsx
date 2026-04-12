import { useMemo, useState } from "react";
import { deriveDashboardAnalytics, ticketStatusHistoryEvents } from "./dashboard.analytics";
import { cards } from "./dashboard.data";
import type { BoardView } from "./dashboard.types";
import { AnalyticsSidebar } from "./components/AnalyticsSidebar";
import { KanbanBoard } from "./components/KanbanBoard";
import { SideNav } from "./components/SideNav";
import { TopBar } from "./components/TopBar";

export function DashboardPage() {
  const [activeView, setActiveView] = useState<BoardView>("Master");

  const visibleCards = useMemo(
    () => (activeView === "Master" ? cards : cards.filter((card) => card.owner === activeView)),
    [activeView]
  );

  const analytics = useMemo(
    () => deriveDashboardAnalytics(visibleCards, ticketStatusHistoryEvents),
    [visibleCards]
  );

  return (
    <div className="dashboard-shell">
      <SideNav activeView={activeView} onViewChange={setActiveView} />

      <main className="dashboard-main">
        <TopBar />

        <div className="board-layout">
          <KanbanBoard cards={visibleCards} />
          <AnalyticsSidebar
            completion={analytics.snapshot.completionPercent}
            activityBars={analytics.snapshot.activityBars}
            laneBreakdown={analytics.snapshot.laneBreakdown}
            total={analytics.snapshot.totalCards}
            completedTicketsPerDay={analytics.completedTicketsPerDay}
            averageCycleTimeMinutes={analytics.averageCycleTimeMinutes}
          />
        </div>

        <button type="button" className="floating-button" aria-label="Add task">
          <span className="material-symbols-outlined floating-button__icon">add</span>
        </button>
      </main>
    </div>
  );
}
