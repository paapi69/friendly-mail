import { describe, expect, it } from "vitest";

import { GraphSubscriptionStatus, OperationalHealthStatus } from "@friendly-mail/contracts";

import { buildBrowserPreviewContext } from "./host";
import { deriveMailboxReadinessViewModel } from "./readiness";

describe("deriveMailboxReadinessViewModel", () => {
  it("shows disconnected when no mailbox is configured", () => {
    const viewModel = deriveMailboxReadinessViewModel({
      context: buildBrowserPreviewContext("ready"),
      mailboxId: null,
      verification: null,
      verificationError: null,
      isLoading: false,
      isConnecting: false
    });

    expect(viewModel.status).toBe("disconnected");
    expect(viewModel.primaryAction).toBe("connect");
  });

  it("shows syncing while verification is loading", () => {
    const viewModel = deriveMailboxReadinessViewModel({
      context: buildBrowserPreviewContext("ready"),
      mailboxId: "mailbox_123",
      verification: null,
      verificationError: null,
      isLoading: true,
      isConnecting: false
    });

    expect(viewModel.status).toBe("syncing");
  });

  it("shows ready when operational verification is healthy", () => {
    const viewModel = deriveMailboxReadinessViewModel({
      context: buildBrowserPreviewContext("ready"),
      mailboxId: "mailbox_123",
      verification: {
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-06T10:00:00.000Z",
        overallStatus: OperationalHealthStatus.Healthy,
        subscription: {
          status: GraphSubscriptionStatus.Active,
          health: OperationalHealthStatus.Healthy
        },
        deltaSync: {
          trackedFolders: 4,
          healthyFolders: 4,
          staleFolders: 0,
          failedFolders: 0,
          missingCursorFolders: 0,
          maxCursorLagMinutes: 2,
          folders: []
        },
        immutableIds: {
          status: "enforced",
          messageReads: true,
          messageLists: true,
          deltaQueries: true,
          subscriptionCreation: true
        },
        checks: []
      },
      verificationError: null,
      isLoading: false,
      isConnecting: false
    });

    expect(viewModel.status).toBe("ready");
    expect(viewModel.primaryAction).toBe("view-workflow");
  });

  it("shows degraded when the host context is unavailable", () => {
    const viewModel = deriveMailboxReadinessViewModel({
      context: buildBrowserPreviewContext("host-unavailable"),
      mailboxId: "mailbox_123",
      verification: null,
      verificationError: "network",
      isLoading: false,
      isConnecting: false
    });

    expect(viewModel.status).toBe("degraded");
  });
});
