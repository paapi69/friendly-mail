import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const statusPath = path.join(projectRoot, ".planning", "epic-status.json");
const checklistPath = path.join(projectRoot, "checklist.md");

function readStatus() {
  const raw = fs.readFileSync(statusPath, "utf8");
  return JSON.parse(raw);
}

function buildChecklist(data) {
  const completed = data.epics.filter((epic) => epic.status === "done").length;
  const total = data.epics.length;

  const lines = [
    "# Friendly Mail MVP Checklist",
    "",
    `Generated from \`.planning/epic-status.json\`.`,
    "",
    `Progress: ${completed}/${total} epics complete`,
    "",
    "## Epics",
    ""
  ];

  for (const epic of data.epics) {
    const checked = epic.status === "done" ? "x" : " ";
    lines.push(`- [${checked}] ${epic.id}: ${epic.title}`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Update epic status with `node scripts/set-epic-status.mjs <E#> <pending|done>`.");
  lines.push("- Rebuild this file with `node scripts/sync-checklist.mjs`.");
  lines.push(`- Last status update: ${data.lastUpdated}`);
  lines.push("");

  return lines.join("\n");
}

const data = readStatus();
const markdown = buildChecklist(data);
fs.writeFileSync(checklistPath, markdown);
console.log(`Updated ${checklistPath}`);
