import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , ticketIdArg, statusArg] = process.argv;
const allowedStatuses = ["pending", "in_progress", "done"];

if (!ticketIdArg || !statusArg) {
  console.error(
    "Usage: node scripts/set-ticket-status.mjs <ticket-id> <pending|in_progress|done>"
  );
  process.exit(1);
}

const ticketId = ticketIdArg.toUpperCase();
const normalizedStatus = statusArg.toLowerCase();

if (!allowedStatuses.includes(normalizedStatus)) {
  console.error(`Status must be one of: ${allowedStatuses.join(", ")}`);
  process.exit(1);
}

const projectRoot = process.cwd();
const statusPath = path.join(projectRoot, ".planning", "epic-status.json");
const historyPath = path.join(projectRoot, ".planning", "ticket-status-history.json");
const raw = fs.readFileSync(statusPath, "utf8");
const data = JSON.parse(raw);

let parentEpic = null;
let targetTicket = null;

for (const epic of data.epics) {
  const ticket = epic.tickets?.find((item) => item.id === ticketId);
  if (ticket) {
    parentEpic = epic;
    targetTicket = ticket;
    break;
  }
}

if (!parentEpic || !targetTicket) {
  console.error(`Unknown ticket id: ${ticketId}`);
  process.exit(1);
}

const isHistoryOnlyStatus = normalizedStatus === "in_progress";
let statusChanged = false;

if (!isHistoryOnlyStatus && targetTicket.status !== normalizedStatus) {
  targetTicket.status = normalizedStatus;
  parentEpic.status = parentEpic.tickets.every((ticket) => ticket.status === "done")
    ? "done"
    : "pending";
  data.lastUpdated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(statusPath, `${JSON.stringify(data, null, 2)}\n`);
  statusChanged = true;
}

const historyEventAppended = appendHistoryEvent(historyPath, {
  ticket_id: ticketId,
  status_transition: normalizedStatus
});

if (statusChanged) {
  const result = spawnSync(
    process.execPath,
    [path.join(projectRoot, "scripts", "sync-checklist.mjs")],
    {
      cwd: projectRoot,
      stdio: "inherit"
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!statusChanged && !historyEventAppended) {
  console.log(`${ticketId} is already recorded as ${normalizedStatus}`);
  process.exit(0);
}

console.log(`Set ${ticketId} to ${normalizedStatus}`);

function appendHistoryEvent(historyFilePath, event) {
  const history = readHistoryDocument(historyFilePath);
  const latestTicketEvent = [...history.events]
    .reverse()
    .find((entry) => entry.ticket_id === event.ticket_id);

  if (latestTicketEvent?.status_transition === event.status_transition) {
    return false;
  }

  history.events.push({
    timestamp: new Date().toISOString(),
    ticket_id: event.ticket_id,
    status_transition: event.status_transition
  });

  fs.writeFileSync(historyFilePath, `${JSON.stringify(history, null, 2)}\n`);

  return true;
}

function readHistoryDocument(historyFilePath) {
  if (!fs.existsSync(historyFilePath)) {
    return { events: [] };
  }

  return JSON.parse(fs.readFileSync(historyFilePath, "utf8"));
}
