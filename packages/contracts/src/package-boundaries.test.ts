import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();

describe("workspace package boundaries", () => {
  it("keeps workspace dependencies aligned with the documented direction rules", () => {
    expect(readWorkspaceDependencies("packages/contracts/package.json")).toEqual([]);
    expect(readWorkspaceDependencies("packages/config/package.json")).toEqual([]);
    expect(readWorkspaceDependencies("packages/auth/package.json")).toEqual([]);
    expect(readWorkspaceDependencies("packages/database/package.json")).toEqual([]);
    expect(readWorkspaceDependencies("packages/observability/package.json")).toEqual([]);
    expect(readWorkspaceDependencies("packages/queue/package.json")).toEqual([
      "@friendly-mail/config",
      "@friendly-mail/observability"
    ]);
    expect(readWorkspaceDependencies("apps/api/package.json")).toEqual([
      "@friendly-mail/auth",
      "@friendly-mail/config",
      "@friendly-mail/contracts",
      "@friendly-mail/database",
      "@friendly-mail/observability"
    ]);
    expect(readWorkspaceDependencies("apps/dashboard/package.json")).toEqual([
      "@friendly-mail/contracts"
    ]);
    expect(readWorkspaceDependencies("apps/outlook-addin/package.json")).toEqual([
      "@friendly-mail/contracts"
    ]);
  });
});

function readWorkspaceDependencies(relativePath: string) {
  const packageJson = JSON.parse(
    readFileSync(path.join(workspaceRoot, relativePath), "utf8")
  ) as {
    dependencies?: Record<string, string>;
  };

  return Object.keys(packageJson.dependencies ?? {})
    .filter((dependency) => dependency.startsWith("@friendly-mail/"))
    .sort();
}
