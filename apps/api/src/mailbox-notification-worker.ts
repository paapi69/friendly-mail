import { getServerEnv } from "@friendly-mail/config";
import { getPrismaClient } from "@friendly-mail/database";
import { createWorker, queueNames } from "@friendly-mail/queue";
import { createLogger, type Logger } from "@friendly-mail/observability";
import { createPrismaMailboxMessageSyncService } from "./mailbox-message-sync-service";
import { createPrismaMailboxReconciliationService } from "./mailbox-reconciliation-service";

const env = getServerEnv();
const prisma = getPrismaClient();
const logger = createLogger({
  service: "friendly-mail-mailbox-notification-worker",
  context: {
    queueName: queueNames.mailboxNotifications
  }
});

const mailboxMessageSyncService = createPrismaMailboxMessageSyncService({
  prisma,
  env,
  logger: logger as Logger
});
const reconciliationService = createPrismaMailboxReconciliationService({
  mailboxMessageSyncService,
  logger: logger as Logger
});

const worker = createWorker(queueNames.mailboxNotifications, async (payload) => {
  await reconciliationService.processQueuedNotification(payload);
  return { ok: true };
});

worker.on("ready", () => {
  logger.info("Mailbox notification worker is ready.");
});

worker.on("failed", (job, error) => {
  logger.error("Mailbox notification worker failed job", {
    jobId: job?.id ?? "unknown",
    queueName: job?.queueName ?? queueNames.mailboxNotifications,
    error
  });
});

process.on("SIGINT", async () => {
  logger.info("Mailbox notification worker shutting down", {
    signal: "SIGINT"
  });
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Mailbox notification worker shutting down", {
    signal: "SIGTERM"
  });
  await worker.close();
  process.exit(0);
});
