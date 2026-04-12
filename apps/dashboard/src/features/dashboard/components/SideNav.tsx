import { views } from "../dashboard.data";
import type { BoardView } from "../dashboard.types";

const viewIcons: Record<BoardView, string> = {
  Master: "dashboard",
  Tom: "tactic",
  Dick: "calendar_today",
  Harry: "group"
};

const utilityNavItems = [
  { icon: "timer", label: "Timeline" },
  { icon: "chat", label: "Messages" }
];

export function SideNav({
  activeView,
  onViewChange
}: {
  activeView: BoardView;
  onViewChange: (view: BoardView) => void;
}) {
  return (
    <aside className="side-nav">
      <div className="side-nav__brand-wrap">
        <span className="side-nav__brand">FM</span>
      </div>

      {views.map((view, index) => {
        const isActive = view === activeView;
        return (
          <div key={view} className="side-nav__slot">
            <button
              type="button"
              className={`side-nav__button ${isActive ? "side-nav__button--active" : ""}`}
              aria-label={view === "Master" ? "Master Board" : view}
              title={view === "Master" ? "Master Board" : view}
              onClick={() => onViewChange(view)}
            >
              <span className="material-symbols-outlined side-nav__icon">{viewIcons[view]}</span>
            </button>
            {index === 0 && isActive ? <span className="side-nav__indicator" /> : null}
          </div>
        );
      })}

      {utilityNavItems.map((item) => (
        <div key={item.icon} className="side-nav__slot">
          <button
            type="button"
            className="side-nav__button side-nav__button--ghost"
            aria-label={item.label}
            title={item.label}
          >
            <span className="material-symbols-outlined side-nav__icon side-nav__icon--muted">
              {item.icon}
            </span>
          </button>
        </div>
      ))}

      <div className="side-nav__footer-wrap">
        <div className="side-nav__footer">
          <button type="button" className="side-nav__pulse" aria-label="Status">
            <span className="side-nav__pulse-dot" />
          </button>
          <div className="side-nav__profile">S</div>
        </div>
      </div>
    </aside>
  );
}
