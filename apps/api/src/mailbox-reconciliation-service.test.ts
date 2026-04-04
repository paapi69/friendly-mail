import { describe, expect, it, vi } from "vitest";
import { createPrismaMailboxReconciliationService } from "./mailbox-reconciliation-service";

describe("mailbox reconciliation service", () => {
  it("reconciles a mailbox when a change notification is processed", async () => {
    const reconcileMailbox = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      reconciledFolders: 3,
      skippedFolders: 0,
      syncedMessages: 4,
      removedMessages: 1,
      syncedAt: "2026-04-03T09:30:00.000Z"
    });
    const service = createPrismaMailboxReconciliationService({
      mailboxMessageSyncService: {
        syncFolderMessages: vi.fn(),
        reconcileMailbox
      },
      logger: silentLogger()
    });

    const result = await service.processQueuedNotification({
      kind: "graph_change_notification",
      mailboxId: "mailbox_123",
      graphSubscriptionId: "subscription_123",
      receivedAt: "2026-04-03T09:29:00.000Z",
      changeType: "updated",
      resourceDataId: "message_123"
    });

    expect(reconcileMailbox).toHaveBeenCalledWith({
      mailboxId: "mailbox_123",
      reason: "change_notification"
    });
    expect(result).toEqual({
      action: "reconciled",
      mailboxId: "mailbox_123",
      reason: "change_notification",
      reconciledFolders: 3,
      skippedFolders: 0,
      syncedMessages: 4,
      removedMessages: 1,
      syncedAt: "2026-04-03T09:30:00.000Z"
    });
  });

  it("reconciles a mailbox after a missed lifecycle event", async () => {
    const reconcileMailbox = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      reconciledFolders: 2,
      skippedFolders: 1,
      syncedMessages: 0,
      removedMessages: 0,
      syncedAt: "2026-04-03T09:31:00.000Z"
    });
    const service = createPrismaMailboxReconciliationService({
      mailboxMessageSyncService: {
        syncFolderMessages: vi.fn(),
        reconcileMailbox
      },
      logger: silentLogger()
    });

    const result = await service.processQueuedNotification({
      kind: "graph_lifecycle_notification",
      mailboxId: "mailbox_123",
      graphSubscriptionId: "subscription_123",
      receivedAt: "2026-04-03T09:30:00.000Z",
      lifecycleEvent: "missed"
    });

    expect(reconcileMailbox).toHaveBeenCalledWith({
      mailboxId: "mailbox_123",
      reason: "lifecycle_missed"
    });
    expect(result.action).toBe("reconciled");
    expect(result.reason).toBe("lifecycle_missed");
  });

  it("skips lifecycle events that should not trigger delta reconciliation", async () => {
    const reconcileMailbox = vi.fn();
    const service = createPrismaMailboxReconciliationService({
      mailboxMessageSyncService: {
        syncFolderMessages: vi.fn(),
        reconcileMailbox
      },
      logger: silentLogger()
    });

    const result = await service.processQueuedNotification({
      kind: "graph_lifecycle_notification",
      mailboxId: "mailbox_123",
      graphSubscriptionId: "subscription_123",
      receivedAt: "2026-04-03T09:30:00.000Z",
      lifecycleEvent: "reauthorizationRequired"
    });

    expect(reconcileMailbox).not.toHaveBeenCalled();
    expect(result).toEqual({
      action: "skipped",
      mailboxId: "mailbox_123",
      reason: "lifecycle_reauthorizationRequired"
    });
  });
});

function silentLogger() {
  return {
    child() {
      return this;
    },
    debug() {
      return undefined;
    },
    info() {
      return undefined;
    },
    warn() {
      return undefined;
    },
    error() {
      return undefined;
    }
  };
}
