import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { getQueueEnv } from "@friendly-mail/config";

export const queueNames = {
  health: "friendly-mail-health",
  mailboxNotifications: "friendly-mail-mailbox-notifications"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

export type QueueJobMap = {
  [queueNames.health]: {
    input: { requestedBy: string };
    output: { ok: true };
  };
  [queueNames.mailboxNotifications]: {
    input:
      | {
          kind: "graph_change_notification";
          mailboxId: string;
          graphSubscriptionId: string;
          receivedAt: string;
          tenantId?: string;
          changeType: string;
          resource?: string;
          resourceDataId?: string;
          subscriptionExpirationDateTime?: string;
        }
      | {
          kind: "graph_lifecycle_notification";
          mailboxId: string;
          graphSubscriptionId: string;
          receivedAt: string;
          tenantId?: string;
          lifecycleEvent: string;
          subscriptionExpirationDateTime?: string;
        };
    output: { ok: true };
  };
};

export function createRedisConnection() {
  const env = getQueueEnv();
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
}

type QueueOptions = {
  connection?: IORedis;
};

export function createQueue<TName extends QueueName>(
  name: TName,
  options: QueueOptions = {}
) {
  return new Queue<QueueJobMap[TName]["input"], QueueJobMap[TName]["output"]>(
    name,
    {
      connection: options.connection ?? createRedisConnection()
    }
  );
}

export function createWorker<TName extends QueueName>(
  name: TName,
  processor: (
    payload: QueueJobMap[TName]["input"]
  ) => Promise<QueueJobMap[TName]["output"]>,
  options: QueueOptions = {}
) {
  return new Worker<QueueJobMap[TName]["input"], QueueJobMap[TName]["output"]>(
    name,
    async (job) => processor(job.data),
    {
      connection: options.connection ?? createRedisConnection()
    }
  );
}
