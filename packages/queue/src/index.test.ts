import { describe, expect, it } from "vitest";
import { queueNames } from "./index";

describe("queue baseline", () => {
  it("defines the health queue name", () => {
    expect(queueNames.health).toBe("friendly-mail-health");
  });
});
