import { QueueEvents } from "bullmq";
import { createLogger } from "@friendly-mail/observability";
import { createQueue, createRedisConnection, createWorker, queueNames } from "./index";

const logger = createLogger({
  service: "friendly-mail-queue-healthcheck",
  context: {
    queueName: queueNames.health
  }
});

async function main() {
  const queueConnection = createRedisConnection();
  const workerConnection = createRedisConnection();
  const queueEventsConnection = createRedisConnection();
  const worker = createWorker(
    queueNames.health,
    async (payload) => {
      logger.info("Processed queue health job", {
        requestedBy: payload.requestedBy
      });
      return { ok: true };
    },
    { connection: workerConnection }
  );
  const queue = createQueue(queueNames.health, {
    connection: queueConnection
  });
  const queueEvents = new QueueEvents(queueNames.health, {
    connection: queueEventsConnection
  });

  try {
    await Promise.all([
      worker.waitUntilReady(),
      queue.waitUntilReady(),
      queueEvents.waitUntilReady()
    ]);

    const job = await queue.add(
      queueNames.health,
      { requestedBy: "queue-healthcheck" },
      {
        removeOnComplete: true,
        removeOnFail: true
      }
    );

    await job.waitUntilFinished(queueEvents);
    logger.info("Queue healthcheck completed successfully.");
  } finally {
    await Promise.allSettled([queueEvents.close(), queue.close(), worker.close(true)]);
    await Promise.allSettled([
      queueEventsConnection.quit(),
      queueConnection.quit(),
      workerConnection.quit()
    ]);
  }
}

main().catch((error) => {
  logger.error("Queue healthcheck failed", {
    error
  });
  process.exit(1);
});
