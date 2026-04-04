import type { BoardCard } from "../dashboard.types";
import { getLabelTone, sortLabels } from "../dashboard.utils";

export function TaskCard({ card }: { card: BoardCard }) {
  const done = card.column === "Done";
  const inProgress = card.column === "In Progress";
  const epicLabel = card.labels.find((label) => label.startsWith("epic:")) ?? null;
  const epicPillText = epicLabel ? card.id : null;
  const orderedLabels = sortLabels(
    card.labels.filter((label) => !(epicLabel && label === epicLabel))
  );

  return (
    <article
      className={[
        "task-card",
        done ? "task-card--done" : "",
        inProgress ? "task-card--progress" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {epicPillText ? <span className="task-card__epic-pill">{epicPillText}</span> : null}

      <div className="task-card__copy">
        <h4 className="task-card__title">{card.title}</h4>
        <p className="task-card__summary">{card.stakeholderSummary}</p>
      </div>

      <div className="task-card__labels">
        {orderedLabels.map((label) => (
          <span
            key={`${card.id}-${label}`}
            className={`task-card__label task-card__label--${getLabelTone(label)}`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="task-card__footer">
        <div className="task-card__avatars">
          <span className={`task-card__avatar task-card__avatar--${card.owner.toLowerCase()}`}>
            {card.owner.slice(0, 1)}
          </span>
        </div>

        {done ? (
          <span className="material-symbols-outlined task-card__done-icon">check_circle</span>
        ) : (
          <div className="task-card__metric">
            <span className="material-symbols-outlined task-card__metric-icon">checklist</span>
            <span>{`${card.size} / ${card.points} pts`}</span>
          </div>
        )}
      </div>
    </article>
  );
}
