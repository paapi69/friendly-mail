import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , epicIdArg, statusArg] = process.argv;

if (!epicIdArg || !statusArg) {
  console.error("Usage: node scripts/set-epic-status.mjs <E#> <pending|done>");
  process.exit(1);
}

const epicId = epicIdArg.toUpperCase();
const normalizedStatus = statusArg.toLowerCase();

if (!["pending", "done"].includes(normalizedStatus)) {
  console.error("Status must be one of: pending, done");
  process.exit(1);
}

const projectRoot = process.cwd();
const statusPath = path.join(projectRoot, ".planning", "epic-status.json");
const raw = fs.readFileSync(statusPath, "utf8");
const data = JSON.parse(raw);

const epic = data.epics.find((item) => item.id === epicId);
if (!epic) {
  console.error(`Unknown epic id: ${epicId}`);
  process.exit(1);
}

epic.status = normalizedStatus;
data.lastUpdated = new Date().toISOString().slice(0, 10);

fs.writeFileSync(statusPath, `${JSON.stringify(data, null, 2)}\n`);

const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "sync-checklist.mjs")], {
  cwd: projectRoot,
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Set ${epic.id} to ${normalizedStatus}`);
