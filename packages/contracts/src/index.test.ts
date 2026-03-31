import { describe, expect, it } from "vitest";
import { FilingState, MessageActionability, TaskStatus } from "./index";

describe("shared workflow contracts", () => {
  it("exposes the delayed filing states", () => {
    expect(FilingState.EligibleToFile).toBe("eligible_to_file");
  });

  it("captures core message actionability states", () => {
    expect(MessageActionability.Actionable).toBe("actionable");
    expect(MessageActionability.Informational).toBe("informational");
  });

  it("defines the MVP task lifecycle states", () => {
    expect(TaskStatus.Done).toBe("done");
    expect(TaskStatus.Dismissed).toBe("dismissed");
  });
});
