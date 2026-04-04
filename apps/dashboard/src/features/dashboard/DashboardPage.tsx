import { useMemo, useState } from "react";
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

  const counts = useMemo(
    () => ({
      total: visibleCards.length,
      backlog: visibleCards.filter((card) => card.column === "Backlog").length,
      ready: visibleCards.filter((card) => card.column === "Ready").length,
      progress: visibleCards.filter((card) => card.column === "In Progress").length,
      blocked: visibleCards.filter((card) => card.column === "Blocked").length,
      done: visibleCards.filter((card) => card.column === "Done").length
    }),
    [visibleCards]
  );

  const completion = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;

  const laneBreakdown = useMemo(() => {
    const lanes = ["Design", "Frontend", "Backend"] as const;
    const total = Math.max(visibleCards.length, 1);

    return lanes.map((lane) => {
      const count = visibleCards.filter((card) => card.lane === lane).length;
      return {
        lane,
        count,
        percent: Math.round((count / total) * 100)
      };
    });
  }, [visibleCards]);

  const activityBars = [
    { label: "B", value: counts.backlog },
    { label: "R", value: counts.ready },
    { label: "W", value: counts.progress },
    { label: "X", value: counts.blocked },
    { label: "D", value: counts.done }
  ];

  const growthText = counts.total
    ? `+${Math.max(1, Math.round((counts.ready / counts.total) * 100))}%`
    : "+0%";

  return (
    <div className="dashboard-shell">
      <SideNav activeView={activeView} onViewChange={setActiveView} />

      <main className="dashboard-main">
        <TopBar />

        <div className="board-layout">
          <KanbanBoard cards={visibleCards} />
          <AnalyticsSidebar
            completion={completion}
            growthText={growthText}
            activityBars={activityBars}
            laneBreakdown={laneBreakdown}
            total={counts.total}
          />
        </div>

        <button type="button" className="floating-button" aria-label="Add task">
          <span className="material-symbols-outlined floating-button__icon">add</span>
        </button>
      </main>
    </div>
  );
}
