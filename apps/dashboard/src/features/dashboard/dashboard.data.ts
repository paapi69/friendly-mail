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
    title: "Define the Outlook add-in surface contract and interaction flow",
    stakeholderSummary:
      "Clarifies the first real Outlook add-in experience, including supported clients, pinned task-pane behavior, and trust-first fallback rules for the workflow surface.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["design", "epic:E7", "surface:addin", "type:design", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E11-T1",
    title: "Define the Microsoft tenant setup contract and operator guide",
    stakeholderSummary:
      "Turns the Microsoft-side setup into a clear operator checklist so tenant registration stops depending on ad hoc engineering memory.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["design", "epic:E11", "surface:ops", "type:design", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E7-T2",
    title: "Extend the add-in shell, manifest, and host integration baseline",
    stakeholderSummary:
      "Turns the current shell into a compliant Outlook add-in baseline with manifest, command-surface, pinned-host behavior, and a live preview lane ready for the first slice.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E7", "surface:addin", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E8-T1",
    title: "Define the mobile-first dashboard triage information architecture",
    stakeholderSummary:
      "Locks the mailbox-level dashboard structure so high-volume users can understand the day without opening every message.",
    owner: "Tom",
    lane: "Design",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["design", "epic:E8", "surface:dashboard", "type:design", "priority:P1", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E8-T2",
    title: "Add mailbox-wide dashboard aggregation APIs and bucket read models",
    stakeholderSummary:
      "Gives the dashboard one stable backend contract for Today queue counts, bucket summaries, and mailbox-wide workflow signals.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E8", "surface:dashboard", "type:integration", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E7-T3",
    title: "Implement mailbox connect and sync-status entry view",
    stakeholderSummary:
      "Gives users a trustworthy first screen inside Outlook that shows connection state, sync health, and connect or retry paths clearly.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E7-T4",
    title: "Implement the message workflow summary and explanation panel",
    stakeholderSummary:
      "Creates the core in-context Outlook panel for classification, urgency, explanation, blockers, and filing-state context.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E7-T5",
    title: "Implement the task action panel and lifecycle mutations",
    stakeholderSummary:
      "Lets users complete, snooze, delegate, dismiss, and reopen work from inside Outlook without losing workflow integrity.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E7-T6",
    title: "Implement filing decision, folder suggestion, and approval UX",
    stakeholderSummary:
      "Exposes delayed-filing decisions and mailbox-action approval in a suggestion-first Outlook workflow.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E7-T7",
    title: "Implement compose and draft numbering experience",
    stakeholderSummary:
      "Brings the outgoing numbering workflow into Outlook compose and draft flows for supported MVP cases.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E7", "surface:addin", "type:feature", "priority:P1", "integration:microsoft-graph"],
    syncWithPlanning: true
  },
  {
    id: "E8-T3",
    title: "Implement the mobile-first Today queue and priority buckets",
    stakeholderSummary:
      "Creates the mailbox-wide dashboard home for Needs Attention work, urgent tasks, and due-soon review.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["frontend", "epic:E8", "surface:dashboard", "type:feature", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E8-T4",
    title: "Implement FYI and CC batch-review surfaces",
    stakeholderSummary:
      "Gives users a calmer place to review low-noise mail without mixing it into the main action queue.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E8", "surface:dashboard", "type:feature", "priority:P2"],
    syncWithPlanning: true
  },
  {
    id: "E8-T5",
    title: "Implement junk-candidate review and safe handling controls",
    stakeholderSummary:
      "Separates low-value mail from real work while keeping junk treatment reversible and trust-first.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E8", "surface:dashboard", "type:feature", "priority:P2", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E8-T6",
    title: "Implement the ready-to-file queue and post-action filing overview",
    stakeholderSummary:
      "Shows which messages are now safe to move without forcing users back into Outlook message-by-message.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E8", "surface:dashboard", "type:feature", "priority:P2", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E8-T7",
    title: "Implement dashboard filters, search, and mobile drill-down flows",
    stakeholderSummary:
      "Makes the dashboard usable at real mailbox volume on mobile-sized screens and larger layouts.",
    owner: "Dick",
    lane: "Frontend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["frontend", "epic:E8", "surface:dashboard", "type:feature", "priority:P2"],
    syncWithPlanning: true
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
    plannedColumn: "Ready",
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
    id: "E4-T1",
    title: "Define the classification and workflow intelligence contract",
    stakeholderSummary:
      "Locks the classification output shape so later task and filing work can build on explainable workflow signals instead of ad hoc inference.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E4", "surface:workflow", "type:spec", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E4-T2",
    title: "Extend persistence for classification results and workflow signals",
    stakeholderSummary:
      "Stores classification output, confidence, and extracted workflow cues so later features can trust a durable intelligence layer.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E4", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E4-T3",
    title: "Implement the classification orchestration service",
    stakeholderSummary:
      "Creates the repeat-safe pipeline that packages message and attachment content into one classification path.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E4", "surface:workflow", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E4-T4",
    title: "Implement actionability and message-type classification",
    stakeholderSummary:
      "Lets Friendly Mail tell whether an email needs action and what kind of work it represents before task state exists.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E4", "surface:workflow", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E4-T5",
    title: "Implement due date, entity, and task-candidate extraction",
    stakeholderSummary:
      "Pulls out the dates, parties, and suggested actions that later become real workflow records.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E4", "surface:workflow", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E4-T6",
    title: "Implement urgency and criticality signal scoring",
    stakeholderSummary:
      "Adds a trust-first way to surface important notices and near-due work before automations act on them.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E4", "surface:workflow", "type:feature", "priority:P1", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E4-T7",
    title: "Add confidence and explanation read models for downstream surfaces",
    stakeholderSummary:
      "Makes the intelligence layer explainable enough for the add-in and dashboard to show why Friendly Mail reached a conclusion.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E4", "surface:workflow", "type:integration", "priority:P1", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E4-T8",
    title: "Add operational verification for classification quality and readiness",
    stakeholderSummary:
      "Shows whether classification coverage and confidence are strong enough to safely feed later workflow features.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E4", "surface:workflow", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E5-T1",
    title: "Define the task and workflow state contract",
    stakeholderSummary:
      "Locks the task and workflow-state shape so delayed filing and user surfaces build on one stable state engine.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E5", "surface:workflow", "type:spec", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E5-T2",
    title: "Extend persistence for tasks, source links, and message workflow state",
    stakeholderSummary:
      "Stores first-class tasks and message workflow state so Friendly Mail can track work independently from folder location.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E5", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E5-T3",
    title: "Implement task materialization from classification output",
    stakeholderSummary:
      "Turns Epic 4 task candidates into durable tasks so actionable email becomes real tracked work.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E5", "surface:workflow", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E5-T4",
    title: "Implement task lifecycle transitions and resolution semantics",
    stakeholderSummary:
      "Defines how work moves through snooze, delegation, completion, and dismissal without losing accountability.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E5", "surface:workflow", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E5-T5",
    title: "Implement message workflow state projection and filing blockers",
    stakeholderSummary:
      "Keeps email visibility tied to work state and read state instead of folder moves or hidden assumptions.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E5", "surface:workflow", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E5-T6",
    title: "Implement task ownership, delegation, and criticality persistence",
    stakeholderSummary:
      "Makes responsibility and urgency durable so critical work stays attributable across personal and shared-mailbox flows.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E5", "surface:workflow", "type:feature", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E5-T7",
    title: "Add workflow read models and internal APIs for downstream surfaces",
    stakeholderSummary:
      "Gives the add-in, dashboard, and later filing flows one stable backend shape for task and workflow state.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E5", "surface:api", "type:integration", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E5-T8",
    title: "Add operational verification for task and workflow readiness",
    stakeholderSummary:
      "Shows whether task creation, lifecycle integrity, and workflow blockers are reliable before delayed filing depends on them.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E5", "surface:workflow", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E6-T1",
    title: "Define the delayed filing and mailbox action contract",
    stakeholderSummary:
      "Locks how Friendly Mail turns workflow eligibility into safe mailbox actions without blurring mailbox state and workflow state.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E6", "surface:workflow", "type:spec", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E6-T2",
    title: "Extend persistence for filing decisions, target folders, and mailbox action audit",
    stakeholderSummary:
      "Stores delayed-filing decisions and mailbox-action history so every future move or route remains auditable.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E6", "surface:api", "type:feature", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E6-T3",
    title: "Implement filing decision orchestration from workflow state",
    stakeholderSummary:
      "Turns explicit filing blockers into one repeat-safe decision the mailbox-action layer can trust.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Ready",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E6", "surface:workflow", "type:integration", "priority:P0"],
    syncWithPlanning: true
  },
  {
    id: "E6-T4",
    title: "Implement informational filing execution for read or reviewed messages",
    stakeholderSummary:
      "Applies delayed filing to low-risk informational mail only after the message is safe to move.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E6", "surface:workflow", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E6-T5",
    title: "Implement actionable filing execution for resolved workflow state",
    stakeholderSummary:
      "Moves actionable mail only after real work is resolved, keeping delayed filing trustworthy.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E6", "surface:workflow", "type:feature", "priority:P0", "risk:workflow-safety"],
    syncWithPlanning: true
  },
  {
    id: "E6-T6",
    title: "Implement folder suggestion and category application flow",
    stakeholderSummary:
      "Gives users understandable filing destinations and low-risk mailbox actions before full automation.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E6", "surface:api", "type:integration", "priority:P1"],
    syncWithPlanning: true
  },
  {
    id: "E6-T7",
    title: "Implement invoice routing and outgoing numbering mailbox actions",
    stakeholderSummary:
      "Covers the MVP's highest-value specialized mailbox actions for finance and outbound workflows.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 8,
    size: "L",
    labels: ["backend", "epic:E6", "surface:api", "type:feature", "priority:P1", "integration:microsoft-graph"],
    syncWithPlanning: true
  },
  {
    id: "E6-T8",
    title: "Add operational verification for delayed filing and mailbox action readiness",
    stakeholderSummary:
      "Shows whether filing decisions and mailbox actions are safe enough to trust before they touch live mail.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E6", "surface:workflow", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E7-T8",
    title: "Add Outlook add-in verification and rollout readiness",
    stakeholderSummary:
      "Proves the add-in is safe enough for pilot-facing use by covering host states, workflow actions, and failure handling.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E7", "surface:addin", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E8-T8",
    title: "Add dashboard verification and rollout readiness",
    stakeholderSummary:
      "Proves the mobile-first dashboard is trustworthy for mailbox-level triage before pilot-facing use expands.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E8", "surface:dashboard", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E11-T2",
    title: "Register the Microsoft Entra app and baseline redirect URIs",
    stakeholderSummary:
      "Captures the real tenant, app, and callback values so local and pilot onboarding stop depending on placeholders.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E11", "surface:ops", "type:integration", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E11-T3",
    title: "Configure delegated Graph permissions and consent strategy",
    stakeholderSummary:
      "Makes the required Graph scopes and consent path explicit before real-tenant testing broadens.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 3,
    size: "S",
    labels: ["backend", "epic:E11", "surface:ops", "type:spec", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E11-T4",
    title: "Provision secrets and environment configuration for local and staging",
    stakeholderSummary:
      "Turns the Microsoft registration values into working local and staging environment configuration.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E11", "surface:ops", "type:feature", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E11-T5",
    title: "Expose a public webhook endpoint and validate Graph callback reachability",
    stakeholderSummary:
      "Solves the public HTTPS callback requirement so subscriptions and webhooks can be verified end to end.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E11", "surface:ops", "type:integration", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  },
  {
    id: "E11-T6",
    title: "Run end-to-end tenant setup verification and operator handoff",
    stakeholderSummary:
      "Produces the final setup proof and handoff so the tenant path no longer depends on informal knowledge.",
    owner: "Harry",
    lane: "Backend",
    plannedColumn: "Backlog",
    points: 5,
    size: "M",
    labels: ["backend", "epic:E11", "surface:ops", "type:verification", "priority:P1", "risk:operational-readiness"],
    syncWithPlanning: true
  }
];

const planningTicketMap = createPlanningTicketMap(planningStatus as PlanningStatusDocument);
const autoInProgressTicketIds = createAutoInProgressTicketIds(
  planningStatus as PlanningStatusDocument
);
const columnSortOrder: Record<BoardColumn, number> = {
  Backlog: 0,
  Ready: 1,
  "In Progress": 2,
  Blocked: 3,
  Done: 4
};

export const cards = buildBoardCards(
  boardCardMetadata,
  planningTicketMap,
  autoInProgressTicketIds
);

export function buildBoardCards(
  metadata: BoardCardMetadata[],
  planningTickets: Map<string, PlanningTicketRecord>,
  autoInProgressIds: Set<string> = new Set()
) {
  return metadata
    .map((meta, index) => {
      const planningTicket = planningTickets.get(meta.id);

      if (meta.syncWithPlanning && !planningTicket) {
        throw new Error(
          `Dashboard board metadata is missing planning status for tracked ticket "${meta.id}".`
        );
      }

      const column = resolveBoardColumn(meta, planningTicket, autoInProgressIds);

      return {
        id: meta.id,
        title: planningTicket?.title ?? meta.title,
        stakeholderSummary: meta.stakeholderSummary,
        owner: meta.owner,
        lane: meta.lane,
        column,
        points: meta.points,
        size: meta.size,
        labels: [...meta.labels],
        trackedInPlanning: Boolean(meta.syncWithPlanning),
        orderIndex: index
      };
    })
    .sort((left, right) => compareBoardCards(left, right))
    .map((entry) => {
      const { orderIndex, ...card } = entry;
      void orderIndex;
      return card satisfies BoardCard;
    });
}

export function createAutoInProgressTicketIds(document: PlanningStatusDocument) {
  const ids = new Set<string>();

  for (const epic of document.epics) {
    const tickets = epic.tickets ?? [];
    if (tickets.length === 0) {
      continue;
    }

    const hasCompletedWork = tickets.some((ticket) => ticket.status === "done");
    if (!hasCompletedWork) {
      continue;
    }

    const nextPendingTicket = tickets.find((ticket) => ticket.status === "pending");
    if (nextPendingTicket) {
      ids.add(nextPendingTicket.id);
    }
  }

  return ids;
}

function compareBoardCards(
  left: BoardCard & { orderIndex: number },
  right: BoardCard & { orderIndex: number }
) {
  if (left.column !== right.column) {
    return columnSortOrder[left.column] - columnSortOrder[right.column];
  }

  if (left.column === "Ready" || left.column === "Backlog") {
    if (left.trackedInPlanning !== right.trackedInPlanning) {
      return left.trackedInPlanning ? -1 : 1;
    }

    const idComparison = compareTicketIds(left.id, right.id);
    if (idComparison !== 0) {
      return idComparison;
    }
  }

  if (left.column === "Done") {
    const idComparison = compareTicketIds(left.id, right.id);
    if (idComparison !== 0) {
      return -idComparison;
    }
  }

  return left.orderIndex - right.orderIndex;
}

function compareTicketIds(leftId: string, rightId: string) {
  const leftParts = parseTicketId(leftId);
  const rightParts = parseTicketId(rightId);

  if (leftParts && rightParts) {
    if (leftParts.epic !== rightParts.epic) {
      return leftParts.epic - rightParts.epic;
    }

    if (leftParts.ticket !== rightParts.ticket) {
      return leftParts.ticket - rightParts.ticket;
    }
  }

  return leftId.localeCompare(rightId);
}

function parseTicketId(id: string) {
  const match = /^E(?<epic>\d+)-T(?<ticket>\d+)$/.exec(id);

  if (!match?.groups) {
    return null;
  }

  return {
    epic: Number(match.groups.epic),
    ticket: Number(match.groups.ticket)
  };
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
  planningTicket: PlanningTicketRecord | undefined,
  autoInProgressIds: Set<string>
): BoardColumn {
  if (planningTicket?.status === "done") {
    return "Done";
  }

  if (planningTicket?.status === "pending" && autoInProgressIds.has(meta.id)) {
    return "In Progress";
  }

  return meta.plannedColumn;
}
