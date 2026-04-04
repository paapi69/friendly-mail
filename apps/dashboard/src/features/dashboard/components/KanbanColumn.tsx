import type { BoardCard, BoardColumn } from "../dashboard.types";
import { TaskCard } from "./TaskCard";

export function KanbanColumn({
  column,
  cards
}: {
  column: BoardColumn;
  cards: BoardCard[];
}) {
  const columnClass =
    column === "In Progress"
      ? "kanban-column kanban-column--progress"
      : column === "Done"
        ? "kanban-column kanban-column--done"
        : "kanban-column";

  return (
    <section className={columnClass}>
      <div className="kanban-column__header">
        <div className="kanban-column__title-row">
          <h3 className="kanban-column__title">{column}</h3>
          <span className="kanban-column__count">{cards.length}</span>
        </div>
        <span className="material-symbols-outlined kanban-column__more">more_horiz</span>
      </div>

      {cards.map((card) => (
        <TaskCard key={card.id} card={card} />
      ))}
    </section>
  );
}
