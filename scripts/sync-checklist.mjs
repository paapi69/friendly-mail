import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const statusPath = path.join(projectRoot, ".planning", "epic-status.json");
const checklistPath = path.join(projectRoot, "checklist.md");

function readStatus() {
  const raw = fs.readFileSync(statusPath, "utf8");
  return JSON.parse(raw);
}

function getDerivedEpicStatus(epic) {
  if (!epic.tickets || epic.tickets.length === 0) {
    return epic.status;
  }

  return epic.tickets.every((ticket) => ticket.status === "done")
    ? "done"
    : "pending";
}

function buildChecklist(data) {
  const completedEpics = data.epics.filter(
    (epic) => getDerivedEpicStatus(epic) === "done"
  ).length;
  const totalEpics = data.epics.length;

  const lines = [
    "# Friendly Mail MVP Checklist",
    "",
    "Generated from `.planning/epic-status.json`.",
    "",
    `Progress: ${completedEpics}/${totalEpics} epics complete`,
    "",
    "## Epics",
    ""
  ];

  for (const epic of data.epics) {
    const checked = getDerivedEpicStatus(epic) === "done" ? "x" : " ";
    lines.push(`- [${checked}] ${epic.id}: ${epic.title}`);
  }

  const epicsWithTickets = data.epics.filter(
    (epic) => epic.tickets && epic.tickets.length > 0
  );

  for (const epic of epicsWithTickets) {
    lines.push("");
    lines.push(`## ${epic.id} Tickets`);
    lines.push("");

    for (const ticket of epic.tickets) {
      const checked = ticket.status === "done" ? "x" : " ";
      lines.push(`- [${checked}] ${ticket.id}: ${ticket.title}`);
    }
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Update high-level epics with `node scripts/set-epic-status.mjs <E#> <pending|done>`.");
  lines.push("- Update detailed tickets with `node scripts/set-ticket-status.mjs <ticket-id> <pending|done>`.");
  lines.push("- Rebuild this file with `node scripts/sync-checklist.mjs`.");
  lines.push(`- Last status update: ${data.lastUpdated}`);
  lines.push("");

  return lines.join("\n");
}

const data = readStatus();
const markdown = buildChecklist(data);
fs.writeFileSync(checklistPath, markdown);
console.log(`Updated ${checklistPath}`);
