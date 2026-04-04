import { columns } from "../dashboard.data";
import type { BoardCard } from "../dashboard.types";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard({ cards }: { cards: BoardCard[] }) {
  return (
    <section className="kanban-canvas">
      <div className="kanban-canvas__scroll">
        {columns.map((column) => (
          <KanbanColumn
            key={column}
            column={column}
            cards={cards.filter((card) => card.column === column)}
          />
        ))}
      </div>
    </section>
  );
}
