import { createWorker, queueNames } from "./index";
import { createLogger } from "@friendly-mail/observability";

const logger = createLogger({
  service: "friendly-mail-queue-worker",
  context: {
    queueName: queueNames.health
  }
});

const worker = createWorker(queueNames.health, async (payload) => {
  logger.info("Worker processed queue job", {
    requestedBy: payload.requestedBy
  });
  return { ok: true };
});

const mailboxNotificationLogger = createLogger({
  service: "friendly-mail-queue-worker",
  context: {
    queueName: queueNames.mailboxNotifications
  }
});

const mailboxNotificationWorker = createWorker(
  queueNames.mailboxNotifications,
  async (payload) => {
    mailboxNotificationLogger.info("Worker accepted mailbox notification job", payload);
    return { ok: true };
  }
);

worker.on("ready", () => {
  logger.info("Friendly Mail queue worker is ready.");
});

mailboxNotificationWorker.on("ready", () => {
  mailboxNotificationLogger.info("Mailbox notification worker is ready.");
});

worker.on("failed", (job, error) => {
  logger.error("Worker failed job", {
    jobId: job?.id ?? "unknown",
    queueName: job?.queueName ?? queueNames.health,
    error
  });
});

mailboxNotificationWorker.on("failed", (job, error) => {
  mailboxNotificationLogger.error("Worker failed job", {
    jobId: job?.id ?? "unknown",
    queueName: job?.queueName ?? queueNames.mailboxNotifications,
    error
  });
});

process.on("SIGINT", async () => {
  logger.info("Queue worker shutting down", {
    signal: "SIGINT"
  });
  await worker.close();
  await mailboxNotificationWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Queue worker shutting down", {
    signal: "SIGTERM"
  });
  await worker.close();
  await mailboxNotificationWorker.close();
  process.exit(0);
});
