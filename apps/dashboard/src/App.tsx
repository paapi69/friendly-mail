import { useMemo, useState } from "react";

type BoardColumn = "Backlog" | "Ready" | "In Progress" | "Blocked" | "Done";
type Lane = "Design" | "Frontend" | "Backend";
type BoardView = "Master" | Lane;

type BoardCard = {
  id: string;
  title: string;
  owner: string;
  lane: Lane;
  column: BoardColumn;
  points: number;
  size: "S" | "M" | "L" | "XL";
  labels: string[];
};

const cards: BoardCard[] = [
  {
    id: "D-PROT-1",
    title: "Define add-in prototype flow",
    owner: "Dora",
    lane: "Design",
    column: "Ready",
    points: 3,
    size: "S",
    labels: ["discipline:design", "epic:E7", "surface:addin", "type:design", "priority:P0"]
  },
  {
    id: "D-PROT-2",
    title: "Wireframe the work panel and filing explanation",
    owner: "Dora",
    lane: "Design",
    column: "Ready",
    points: 5,
    size: "M",
    labels: ["discipline:design", "epic:E7", "surface:addin", "risk:workflow-safety"]
  },
  {
    id: "D-PROT-3",
    title: "Define dashboard prototype information architecture",
    owner: "Dora",
    lane: "Design",
    column: "Backlog",
    points: 5,
    size: "M",
    labels: ["discipline:design", "epic:E8", "surface:dashboard", "priority:P2"]
  },
  {
    id: "F-PROT-1",
    title: "Add mailbox connect and sync-status screen",
    owner: "Tom",
    lane: "Frontend",
    column: "Backlog",
    points: 5,
    size: "M",
    labels: ["discipline:frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0"]
  },
  {
    id: "F-PROT-2",
    title: "Build the add-in message work panel",
    owner: "Tom",
    lane: "Frontend",
    column: "Backlog",
    points: 8,
    size: "L",
    labels: ["discipline:frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0"]
  },
  {
    id: "F-PROT-3",
    title: "Bind add-in views to live mailbox sync APIs",
    owner: "Tom",
    lane: "Frontend",
    column: "Blocked",
    points: 5,
    size: "M",
    labels: [
      "discipline:frontend",
      "epic:E7",
      "surface:addin",
      "type:integration",
      "priority:P0"
    ]
  },
  {
    id: "E2-T1",
    title: "Define Microsoft Entra and Graph connectivity contract",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 2,
    size: "S",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:graph",
      "type:spec",
      "priority:P0",
      "status:done"
    ]
  },
  {
    id: "E2-T2",
    title: "Extend persistence for mailbox connectivity and sync state",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 5,
    size: "M",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:api",
      "type:feature",
      "priority:P0",
      "status:done"
    ]
  },
  {
    id: "E2-T3",
    title: "Implement the core Microsoft Graph connector",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 5,
    size: "M",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:graph",
      "type:integration",
      "priority:P0",
      "status:done"
    ]
  },
  {
    id: "E2-T4",
    title: "Build delegated mailbox onboarding",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 8,
    size: "L",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:api",
      "type:feature",
      "priority:P0",
      "risk:security",
      "status:done"
    ]
  },
  {
    id: "E2-T5",
    title: "Implement folder discovery and initial folder sync",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 5,
    size: "M",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:api",
      "type:feature",
      "priority:P0",
      "status:done"
    ]
  },
  {
    id: "E2-T6",
    title: "Implement message metadata sync with delta links",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 8,
    size: "L",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:api",
      "type:feature",
      "priority:P0",
      "risk:workflow-safety",
      "status:done"
    ]
  },
  {
    id: "E2-T7",
    title: "Implement Graph subscription and webhook lifecycle",
    owner: "Jerry",
    lane: "Backend",
    column: "Done",
    points: 8,
    size: "L",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:graph",
      "type:integration",
      "integration:webhooks",
      "priority:P0",
      "risk:security",
      "status:done"
    ]
  },
  {
    id: "E2-T8",
    title: "Implement reconciliation between webhooks and delta sync",
    owner: "Jerry",
    lane: "Backend",
    column: "Ready",
    points: 8,
    size: "L",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:workflow",
      "type:feature",
      "integration:webhooks",
      "priority:P0",
      "risk:workflow-safety"
    ]
  },
  {
    id: "E2-T9",
    title: "Add shared-mailbox readiness and operational verification",
    owner: "Jerry",
    lane: "Backend",
    column: "Backlog",
    points: 5,
    size: "M",
    labels: [
      "discipline:backend",
      "epic:E2",
      "surface:graph",
      "type:verification",
      "priority:P1"
    ]
  },
  {
    id: "B-PROT-1",
    title: "Expose prototype mailbox status endpoint for add-in",
    owner: "Jerry",
    lane: "Backend",
    column: "Backlog",
    points: 3,
    size: "S",
    labels: ["discipline:backend", "epic:E7", "surface:api", "type:feature", "priority:P1"]
  }
];

const columns: BoardColumn[] = ["Backlog", "Ready", "In Progress", "Blocked", "Done"];
const views: BoardView[] = ["Master", "Design", "Frontend", "Backend"];

const palette = {
  pageTop: "#fdf4df",
  pageBottom: "#ede5d7",
  board: "#fffaf2",
  boardAlt: "#fcf6eb",
  ink: "#21313a",
  muted: "#62717b",
  border: "#d7c8b0",
  accent: "#0f6a68",
  accentSoft: "#d7efee",
  warning: "#b8681d",
  warningSoft: "#f7e6d6",
  done: "#2c6a42",
  doneSoft: "#dcecdf",
  blocked: "#963949",
  blockedSoft: "#f4dbe1",
  design: "#a54f2b",
  designSoft: "#f5e1d5",
  frontend: "#2667a8",
  frontendSoft: "#dbe8f6",
  backend: "#386238",
  backendSoft: "#ddebd9"
} as const;

export function App() {
  const [activeView, setActiveView] = useState<BoardView>("Master");

  const visibleCards = useMemo(() => {
    return activeView === "Master" ? cards : cards.filter((card) => card.lane === activeView);
  }, [activeView]);

  const counts = useMemo(() => {
    return {
      total: visibleCards.length,
      design: cards.filter((card) => card.lane === "Design").length,
      frontend: cards.filter((card) => card.lane === "Frontend").length,
      backend: cards.filter((card) => card.lane === "Backend").length
    };
  }, [visibleCards]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${palette.pageTop} 0%, ${palette.pageBottom} 100%)`,
        color: palette.ink,
        fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
        padding: "32px"
      }}
    >
      <section
        style={{
          maxWidth: "1480px",
          margin: "0 auto"
        }}
      >
        <header
          style={{
            display: "grid",
            gap: "12px",
            marginBottom: "28px"
          }}
        >
          <p
            style={{
              margin: 0,
              color: palette.accent,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontSize: "0.76rem",
              fontWeight: 700
            }}
          >
            Friendly Mail Prototype Delivery Board
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 4vw, 3.7rem)",
              lineHeight: 1.02
            }}
          >
            Master board first, team dashboards when you need them.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "960px",
              color: palette.muted,
              fontSize: "1.02rem",
              lineHeight: 1.55
            }}
          >
            The default view shows Dora, Tom, and Jerry together in one PM-style board. Use the
            pills to switch into Design, Frontend, or Backend-only views.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "22px"
          }}
        >
          <StatCard label="Prototype milestone" value="End of E2-T9" tone="accent" />
          <StatCard
            label={activeView === "Master" ? "Visible tickets" : `${activeView} tickets`}
            value={String(counts.total)}
            tone="accent"
          />
          <StatCard label="Design pool" value={String(counts.design)} tone="design" />
          <StatCard label="Frontend pool" value={String(counts.frontend)} tone="frontend" />
          <StatCard label="Backend pool" value={String(counts.backend)} tone="backend" />
        </section>

        <section
          style={{
            background: palette.board,
            border: `1px solid ${palette.border}`,
            borderRadius: "26px",
            padding: "18px",
            boxShadow: "0 18px 40px rgba(52, 35, 15, 0.08)",
            marginBottom: "20px"
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >
            {views.map((view) => {
              const tone = getViewTone(view);
              const isActive = view === activeView;

              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  style={{
                    border: `1px solid ${isActive ? tone.color : palette.border}`,
                    background: isActive ? tone.background : "#fffdf8",
                    color: isActive ? tone.color : palette.ink,
                    borderRadius: "999px",
                    padding: "12px 18px",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    fontWeight: 700
                  }}
                >
                  {getViewLabel(view)}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: palette.board,
            border: `1px solid ${palette.border}`,
            borderRadius: "28px",
            padding: "20px",
            boxShadow: "0 18px 40px rgba(52, 35, 15, 0.08)"
          }}
        >
          <BoardHeader activeView={activeView} ticketCount={visibleCards.length} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "14px"
            }}
          >
            {columns.map((column) => {
              const columnCards = visibleCards.filter((card) => card.column === column);

              return (
                <section
                  key={`${activeView}-${column}`}
                  style={{
                    minHeight: "240px",
                    background: palette.boardAlt,
                    border: `1px solid ${palette.border}`,
                    borderRadius: "18px",
                    padding: "14px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px"
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1rem"
                      }}
                    >
                      {column}
                    </h3>
                    <span
                      style={{
                        color: palette.muted,
                        fontSize: "0.82rem"
                      }}
                    >
                      {columnCards.length}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {columnCards.length ? (
                      columnCards.map((card) => <BoardCardView key={card.id} card={card} />)
                    ) : (
                      <div
                        style={{
                          borderRadius: "14px",
                          border: `1px dashed ${palette.border}`,
                          padding: "18px",
                          color: palette.muted,
                          fontSize: "0.92rem",
                          textAlign: "center"
                        }}
                      >
                        No tickets in {column.toLowerCase()}.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function BoardHeader(props: { activeView: BoardView; ticketCount: number }) {
  const tone = getViewTone(props.activeView);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        marginBottom: "16px"
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.55rem"
          }}
        >
          {props.activeView === "Master" ? "Master View" : `${props.activeView} Dashboard`}
        </h2>
        <p
          style={{
            margin: "5px 0 0",
            color: palette.muted
          }}
        >
          {getViewDescription(props.activeView)}
        </p>
      </div>
      <span
        style={{
          padding: "8px 12px",
          borderRadius: "999px",
          background: tone.background,
          color: tone.color,
          fontSize: "0.86rem",
          fontWeight: 700
        }}
      >
        {props.ticketCount} visible tickets
      </span>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  tone: "accent" | "design" | "frontend" | "backend";
}) {
  const toneMap = {
    accent: {
      background: palette.accentSoft,
      color: palette.accent
    },
    design: {
      background: palette.designSoft,
      color: palette.design
    },
    frontend: {
      background: palette.frontendSoft,
      color: palette.frontend
    },
    backend: {
      background: palette.backendSoft,
      color: palette.backend
    }
  } as const;

  return (
    <article
      style={{
        background: palette.board,
        border: `1px solid ${palette.border}`,
        borderRadius: "20px",
        padding: "16px 18px",
        boxShadow: "0 10px 24px rgba(56, 42, 23, 0.05)"
      }}
    >
      <p
        style={{
          margin: 0,
          color: palette.muted,
          fontSize: "0.82rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em"
        }}
      >
        {props.label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          display: "inline-flex",
          padding: "8px 12px",
          borderRadius: "999px",
          background: toneMap[props.tone].background,
          color: toneMap[props.tone].color,
          fontSize: "1rem",
          fontWeight: 700
        }}
      >
        {props.value}
      </p>
    </article>
  );
}

function BoardCardView({ card }: { card: BoardCard }) {
  const columnTone = getColumnTone(card.column);
  const laneTone = getViewTone(card.lane);

  return (
    <article
      style={{
        background: "#fffdf8",
        border: `1px solid ${palette.border}`,
        borderLeft: `6px solid ${columnTone.color}`,
        borderRadius: "16px",
        padding: "12px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "start",
          justifyContent: "space-between",
          gap: "10px"
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.74rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: palette.muted
            }}
          >
            {card.id}
          </p>
          <h4
            style={{
              margin: "6px 0 0",
              fontSize: "1rem",
              lineHeight: 1.25
            }}
          >
            {card.title}
          </h4>
        </div>
        <span
          style={{
            whiteSpace: "nowrap",
            padding: "6px 8px",
            borderRadius: "999px",
            background: columnTone.background,
            color: columnTone.color,
            fontSize: "0.78rem",
            fontWeight: 700
          }}
        >
          {card.size} · {card.points}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: "12px",
          paddingBottom: "12px",
          borderBottom: `1px solid ${palette.border}`
        }}
      >
        <span
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            background: laneTone.background,
            color: laneTone.color,
            fontSize: "0.8rem",
            fontWeight: 700
          }}
        >
          {card.lane} / {card.owner}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginTop: "12px"
        }}
      >
        {card.labels.map((label) => (
          <LabelChip key={`${card.id}-${label}`} label={label} />
        ))}
      </div>
    </article>
  );
}

function LabelChip({ label }: { label: string }) {
  const tone = getLabelTone(label);

  return (
    <span
      style={{
        padding: "5px 9px",
        borderRadius: "999px",
        background: tone.background,
        color: tone.color,
        fontSize: "0.78rem",
        border: `1px solid ${tone.border}`
      }}
    >
      {label}
    </span>
  );
}

function getLabelTone(label: string) {
  if (label.startsWith("discipline:design")) {
    return {
      background: palette.designSoft,
      color: palette.design,
      border: "#e6bda7"
    };
  }

  if (label.startsWith("discipline:frontend")) {
    return {
      background: palette.frontendSoft,
      color: palette.frontend,
      border: "#b9d0ea"
    };
  }

  if (label.startsWith("discipline:backend")) {
    return {
      background: palette.backendSoft,
      color: palette.backend,
      border: "#bfd7b8"
    };
  }

  if (label.startsWith("priority:P0")) {
    return {
      background: palette.blockedSoft,
      color: palette.blocked,
      border: "#e5b8c1"
    };
  }

  if (label.startsWith("priority:P1") || label.startsWith("priority:P2")) {
    return {
      background: palette.warningSoft,
      color: palette.warning,
      border: "#e9c6a6"
    };
  }

  if (label.startsWith("risk:")) {
    return {
      background: "#f6e5d8",
      color: "#995822",
      border: "#e7c7a8"
    };
  }

  if (label.startsWith("surface:addin")) {
    return {
      background: "#ece3f7",
      color: "#6d3f99",
      border: "#d3bce9"
    };
  }

  if (label.startsWith("surface:dashboard")) {
    return {
      background: "#e6f1fb",
      color: "#2a679a",
      border: "#c0d6ec"
    };
  }

  if (
    label.startsWith("surface:graph") ||
    label.startsWith("surface:api") ||
    label.startsWith("surface:workflow")
  ) {
    return {
      background: "#e0f0e1",
      color: "#386238",
      border: "#bdd7bf"
    };
  }

  if (label.startsWith("integration:")) {
    return {
      background: "#e7f4f1",
      color: palette.accent,
      border: "#bfe0dc"
    };
  }

  if (label.startsWith("status:done")) {
    return {
      background: palette.doneSoft,
      color: palette.done,
      border: "#bcd8c0"
    };
  }

  return {
    background: "#f0e7d8",
    color: palette.ink,
    border: "#dccfbf"
  };
}

function getColumnTone(column: BoardColumn) {
  switch (column) {
    case "Ready":
      return {
        background: palette.accentSoft,
        color: palette.accent
      };
    case "Done":
      return {
        background: palette.doneSoft,
        color: palette.done
      };
    case "Blocked":
      return {
        background: palette.blockedSoft,
        color: palette.blocked
      };
    default:
      return {
        background: palette.warningSoft,
        color: palette.warning
      };
  }
}

function getViewTone(view: BoardView) {
  switch (view) {
    case "Master":
      return {
        background: palette.accentSoft,
        color: palette.accent
      };
    case "Design":
      return {
        background: palette.designSoft,
        color: palette.design
      };
    case "Frontend":
      return {
        background: palette.frontendSoft,
        color: palette.frontend
      };
    case "Backend":
      return {
        background: palette.backendSoft,
        color: palette.backend
      };
  }
}

function getViewLabel(view: BoardView) {
  switch (view) {
    case "Master":
      return "Master View";
    case "Design":
      return "Design";
    case "Frontend":
      return "Frontend";
    case "Backend":
      return "Backend";
  }
}

function getViewDescription(view: BoardView) {
  switch (view) {
    case "Master":
      return "The full PM board showing Dora, Tom, and Jerry together.";
    case "Design":
      return "Flows, wireframes, and UX definition for the prototype.";
    case "Frontend":
      return "Outlook add-in and dashboard surfaces users will interact with.";
    case "Backend":
      return "Graph, API, sync, webhook, and workflow plumbing.";
  }
}
