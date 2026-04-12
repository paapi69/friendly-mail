import { describe, expect, it } from "vitest";

import {
  buildBrowserPreviewContext,
  buildOfficeAddinContext,
  createOutlookHostController,
  resolveClientFamily,
  resolvePreviewScenario
} from "./host";

describe("resolveClientFamily", () => {
  it("maps Outlook on the web into the MVP client family", () => {
    expect(resolveClientFamily("OfficeOnline")).toBe("outlook-web");
  });

  it("maps Windows Outlook into the MVP client family", () => {
    expect(resolveClientFamily("PC")).toBe("windows-outlook");
  });

  it("treats unsupported platforms as out of scope", () => {
    expect(resolveClientFamily("Mac")).toBe("unsupported");
  });
});

describe("resolvePreviewScenario", () => {
  it("defaults to the ready browser-preview lane", () => {
    expect(resolvePreviewScenario("")).toBe("ready");
  });

  it("reads preview scenarios from the URL query string", () => {
    expect(resolvePreviewScenario("?scenario=compose")).toBe("compose");
  });
});

describe("buildBrowserPreviewContext", () => {
  it("builds the missing-item fallback lane", () => {
    const context = buildBrowserPreviewContext("missing-item");

    expect(context.source).toBe("browser-preview");
    expect(context.stage).toBe("missing-item");
    expect(context.message.status).toBe("missing");
  });
});

describe("buildOfficeAddinContext", () => {
  it("builds a ready Outlook-web host context for a selected message", () => {
    const context = buildOfficeAddinContext({
      platform: "OfficeOnline",
      item: {
        itemId: "msg_123",
        itemType: "message",
        subject: "Friendly Mail host test",
        from: { emailAddress: "sender@example.com" },
        dateTimeCreated: "2026-04-06T04:00:00.000Z"
      }
    });

    expect(context.stage).toBe("ready");
    expect(context.clientFamily).toBe("outlook-web");
    expect(context.message.subject).toBe("Friendly Mail host test");
  });

  it("treats missing message context as a first-class shell state", () => {
    const context = buildOfficeAddinContext({
      platform: "PC",
      item: null
    });

    expect(context.stage).toBe("missing-item");
    expect(context.clientFamily).toBe("windows-outlook");
  });
});

describe("createOutlookHostController", () => {
  it("falls back to the browser preview lane when Office.js is unavailable", async () => {
    const controller = createOutlookHostController({
      location: { search: "?scenario=unsupported-client" },
      history: {
        replaceState() {
          return undefined;
        }
      }
    });

    const context = await controller.loadInitialContext();

    expect(context.source).toBe("browser-preview");
    expect(context.stage).toBe("unsupported-client");
  });
});
