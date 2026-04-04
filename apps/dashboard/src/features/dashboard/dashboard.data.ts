import planningStatus from "../../../../../.planning/epic-status.json";
import type { BoardCard, BoardColumn, BoardView, Lane, Person } from "./dashboard.types";

type PlanningTicketStatus = "pending" | "done";

type PlanningTicketRecord = {
  id: string;
  title: string;
  status: PlanningTicketStatus;
};

type PlanningStatusDocument = {
  epics: Array<{
    id: string;
    tickets?: PlanningTicketRecord[];
  }>;
};

type BoardCardMetadata = {
  id: string;
  title: string;
  stakeholderSummary: string;
  owner: Person;
  lane: Lane;
  plannedColumn: Exclude<BoardColumn, "Done">;
  points: number;
  size: "S" | "M" | "L" | "XL";
  labels: string[];
  syncWithPlanning?: boolean;
};

export const columns: BoardColumn[] = ["Backlog", "Ready", "In Progress", "Blocked", "Done"];
export const views: BoardView[] = ["Master", "Tom", "Dick", "Harry"];

const boardCardMetadata: BoardCardMetadata[] = [
  {
    id: "E7-T1",
    title: "Define add-in prototype flow",
    stakeholderSummary:
      "Clarifies the first Outlook add-in experience so the prototype tells a coherent product story.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["design", "epic:E7", "surface:addin", "type:design", "priority:P0"]
  },
  {
    id: "E7-T2",
    title: "Wireframe the work panel and filing explanation",
    stakeholderSummary:
      "Shows how users will understand what Friendly Mail knows about an email and why it suggests action.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Ready",
    points: 5,
    size: "M",
    labels: ["design", "epic:E7", "surface:addin", "risk:workflow-safety"]
  },
  {
    id: "E8-T1",
    title: "Define dashboard prototype information architecture",
    stakeholderSummary:
      "Organizes the dashboard so leaders can quickly see critical work, status, and unresolved items.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["design", "epic:E8", "surface:dashboard", "priority:P2"]
  },
  {
    id: "E7-T3",
    title: "Add mailbox connect and sync-status screen",
    stakeholderSummary:
      "Gives users a simple entry point to connect Outlook and see whether Friendly Mail is actively syncing.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0"]
  },
  {
    id: "E7-T4",
    title: "Build the add-in message work panel",
    stakeholderSummary:
      "Creates the core in-context email panel where Friendly Mail will explain work, urgency, and filing state.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0"]
  },
  {
    id: "E7-T5",
    title: "Bind add-in views to live mailbox sync APIs",
    stakeholderSummary:
      "Turns the add-in from a static demo into a live experience backed by real mailbox status and sync data.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Blocked",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E7", "surface:addin", "type:integration", "priority:P0"]
  },
  {
    id: "E2-T1",
    title: "Define Microsoft Entra and Graph connectivity contract",
    stakeholderSummary:
      "Locked how Friendly Mail connects to Outlook safely so later mailbox work builds on a stable access model.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 2,
    size: "S",
    labels: ["backend", "epic:E2", "surface:graph", "type:spec", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E2-T2",
    title: "Extend persistence for mailbox connectivity and sync state",
    stakeholderSummary:
      "Stores mailbox connection and sync progress so Friendly Mail can track real setup and syncing over time.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E2", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E2-T3",
    title: "Implement the core Microsoft Graph connector",
    stakeholderSummary:
      "Built the shared Outlook data connector that all mailbox reading and syncing now depends on.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E2", "surface:graph", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E2-T4",
    title: "Build delegated mailbox onboarding",
    stakeholderSummary:
      "Lets a user connect their Outlook mailbox so Friendly Mail can start working with real email.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E2", "surface:api", "type:feature", "priority:P0", "risk:security"],
    syncWithPlanning: true
  },
  {
    id: "E2-T5",
    title: "Implement folder discovery and initial folder sync",
    stakeholderSummary:
      "Gives Friendly Mail a reliable picture of a mailbox folder structure before deeper email processing begins.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E2", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E2-T6",
    title: "Implement message metadata sync with delta links",
    stakeholderSummary:
      "Keeps mailbox message records up to date efficiently so Friendly Mail can react to changes without rereading everything.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E2", "surface:api", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E2-T7",
    title: "Implement Graph subscription and webhook lifecycle",
    stakeholderSummary:
      "Allows Friendly Mail to hear about mailbox changes quickly instead of waiting for slow periodic refreshes.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: [
      "backend",
      "epic:E2",
      "surface:graph",
      "type:integration",
      "integration:webhooks",
      "priority:P0",
      "risk:security"
    ],
    syncWithPlanning: true
  },
  {
    id: "E2-T8",
    title: "Implement reconciliation between webhooks and delta sync",
    stakeholderSummary:
      "Makes mailbox updates durable so Friendly Mail stays accurate even when real-time notifications are missed.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: [
      "backend",
      "epic:E2",
      "surface:workflow",
      "type:feature",
      "integration:webhooks",
      "priority:P0",
      "risk:workflow-safety"
    ],
    syncWithPlanning: true
  },
  {
    id: "E2-T9",
    title: "Add shared-mailbox readiness and operational verification",
    stakeholderSummary:
      "Shows whether mailbox connectivity is healthy and makes shared-mailbox limitations explicit before rollout.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E2", "surface:graph", "type:verification", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E3-T1",
    title: "Define message ingestion and extraction contract",
    stakeholderSummary:
      "Defined what email and attachment content Friendly Mail will capture before it starts classifying or automating work.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E3", "surface:workflow", "type:spec", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T2",
    title: "Extend persistence for message bodies, attachments, and extraction state",
    stakeholderSummary:
      "Stores email body and attachment information so later features can understand what work the message contains.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E3", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T3",
    title: "Implement the message ingestion service",
    stakeholderSummary:
      "Turns synced mailbox records into normalized email content that the rest of Friendly Mail can reason about.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E3", "surface:workflow", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T4",
    title: "Implement attachment metadata retrieval and durable linking",
    stakeholderSummary:
      "Gives Friendly Mail a dependable inventory of attachments so important supporting documents are not overlooked.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E3", "surface:api", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T5",
    title: "Implement PDF-first attachment text extraction",
    stakeholderSummary:
      "Lets Friendly Mail read the contents of PDF attachments, where many notices, invoices, and contracts actually live.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E3", "surface:workflow", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T6",
    title: "Add OCR fallback and extraction confidence handling",
    stakeholderSummary:
      "Improves coverage for scanned documents while still showing when Friendly Mail is less certain about what it read.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E3", "surface:workflow", "type:feature", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E3-T7",
    title: "Orchestrate idempotent ingestion and attachment processing",
    stakeholderSummary:
      "Prevents duplicate processing so repeated mailbox updates do not create noisy or inconsistent downstream results.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E3", "surface:workflow", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E3-T8",
    title: "Add operational verification for ingestion and extraction",
    stakeholderSummary:
      "Shows whether content ingestion and document reading are healthy so the team can spot reliability gaps early.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E3", "surface:workflow", "type:verification", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E7-T6",
    title: "Expose prototype mailbox status endpoint for add-in",
    stakeholderSummary:
      "Gives the add-in a simple backend signal for showing mailbox health and sync readiness inside Outlook.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E7", "surface:api", "type:feature", "priority:P1"]
  }
];

const planningTicketMap = createPlanningTicketMap(planningStatus as PlanningStatusDocument);

export const cards = buildBoardCards(boardCardMetadata, planningTicketMap);

export function buildBoardCards(
  metadata: BoardCardMetadata[],
  planningTickets: Map<string, PlanningTicketRecord>
) {
  return metadata.map((meta) => {
    const planningTicket = planningTickets.get(meta.id);

    if (meta.syncWithPlanning && !planningTicket) {
      throw new Error(
        `Dashboard board metadata is missing planning status for tracked ticket "${meta.id}".`
      );
    }

    const column = resolveBoardColumn(meta, planningTicket);

    return {
      id: meta.id,
      title: planningTicket?.title ?? meta.title,
      stakeholderSummary: meta.stakeholderSummary,
      owner: meta.owner,
      lane: meta.lane,
      column,
      points: meta.points,
      size: meta.size,
      labels: [...meta.labels]
    } satisfies BoardCard;
  });
}

function createPlanningTicketMap(document: PlanningStatusDocument) {
  const tickets = new Map<string, PlanningTicketRecord>();

  for (const epic of document.epics) {
    for (const ticket of epic.tickets ?? []) {
      tickets.set(ticket.id, ticket);
    }
  }

  return tickets;
}

function resolveBoardColumn(
  meta: BoardCardMetadata,
  planningTicket?: PlanningTicketRecord
): BoardColumn {
  if (planningTicket?.status === "done") {
    return "Done";
  }

  return meta.plannedColumn;
}
