import { queueNames, type QueueJobMap } from "@friendly-mail/queue";
import { type Logger } from "@friendly-mail/observability";
import { type MailboxMessageSyncService } from "./mailbox-message-sync-service";

type MailboxNotificationJob = QueueJobMap[typeof queueNames.mailboxNotifications]["input"];

type ProcessQueuedNotificationResult =
  | {
      action: "reconciled";
      mailboxId: string;
      reason: string;
      reconciledFolders: number;
      skippedFolders: number;
      syncedMessages: number;
      removedMessages: number;
      syncedAt: string;
    }
  | {
      action: "skipped";
      mailboxId: string;
      reason: string;
    };

export type MailboxReconciliationService = {
  processQueuedNotification(
    input: MailboxNotificationJob
  ): Promise<ProcessQueuedNotificationResult>;
};

export type CreatePrismaMailboxReconciliationServiceInput = {
  mailboxMessageSyncService: MailboxMessageSyncService;
  logger: Logger;
};

export function createPrismaMailboxReconciliationService(
  input: CreatePrismaMailboxReconciliationServiceInput
): MailboxReconciliationService {
  return {
    async processQueuedNotification(notification) {
      if (notification.kind === "graph_change_notification") {
        const result = await input.mailboxMessageSyncService.reconcileMailbox({
          mailboxId: notification.mailboxId,
          reason: "change_notification"
        });

        input.logger.info("Reconciled mailbox from queued Graph change notification", {
          mailboxId: notification.mailboxId,
          graphSubscriptionId: notification.graphSubscriptionId,
          changeType: notification.changeType,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages
        });

        return {
          action: "reconciled",
          mailboxId: notification.mailboxId,
          reason: "change_notification",
          reconciledFolders: result.reconciledFolders,
          skippedFolders: result.skippedFolders,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages,
          syncedAt: result.syncedAt
        };
      }

      if (notification.lifecycleEvent === "missed") {
        const result = await input.mailboxMessageSyncService.reconcileMailbox({
          mailboxId: notification.mailboxId,
          reason: "lifecycle_missed"
        });

        input.logger.warn("Reconciled mailbox after missed Graph lifecycle notification", {
          mailboxId: notification.mailboxId,
          graphSubscriptionId: notification.graphSubscriptionId,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages
        });

        return {
          action: "reconciled",
          mailboxId: notification.mailboxId,
          reason: "lifecycle_missed",
          reconciledFolders: result.reconciledFolders,
          skippedFolders: result.skippedFolders,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages,
          syncedAt: result.syncedAt
        };
      }

      const reason = `lifecycle_${notification.lifecycleEvent}`;
      input.logger.info("Skipped mailbox delta reconciliation for Graph lifecycle notification", {
        mailboxId: notification.mailboxId,
        graphSubscriptionId: notification.graphSubscriptionId,
        lifecycleEvent: notification.lifecycleEvent
      });

      return {
        action: "skipped",
        mailboxId: notification.mailboxId,
        reason
      };
    }
  };
}
