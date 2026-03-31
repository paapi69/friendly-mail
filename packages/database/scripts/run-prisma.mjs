import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const require = createRequire(import.meta.url);
const prismaEntry = require.resolve("prisma/build/index.js");

const result = spawnSync(process.execPath, [prismaEntry, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/friendly_mail"
  }
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
