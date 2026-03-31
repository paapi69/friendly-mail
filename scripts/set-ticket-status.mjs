import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , ticketIdArg, statusArg] = process.argv;

if (!ticketIdArg || !statusArg) {
  console.error(
    "Usage: node scripts/set-ticket-status.mjs <ticket-id> <pending|done>"
  );
  process.exit(1);
}

const ticketId = ticketIdArg.toUpperCase();
const normalizedStatus = statusArg.toLowerCase();

if (!["pending", "done"].includes(normalizedStatus)) {
  console.error("Status must be one of: pending, done");
  process.exit(1);
}

const projectRoot = process.cwd();
const statusPath = path.join(projectRoot, ".planning", "epic-status.json");
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

targetTicket.status = normalizedStatus;
parentEpic.status = parentEpic.tickets.every((ticket) => ticket.status === "done")
  ? "done"
  : "pending";
data.lastUpdated = new Date().toISOString().slice(0, 10);

fs.writeFileSync(statusPath, `${JSON.stringify(data, null, 2)}\n`);

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

console.log(`Set ${ticketId} to ${normalizedStatus}`);
