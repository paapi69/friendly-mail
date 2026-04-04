import { getServerEnv } from "@friendly-mail/config";
import { getPrismaClient } from "@friendly-mail/database";
import { createQueue, queueNames } from "@friendly-mail/queue";
import {
  createLogger,
  type Logger
} from "@friendly-mail/observability";
import { createPrismaAuthService } from "./auth-service";
import { createPrismaMailboxFolderSyncService } from "./mailbox-folder-sync-service";
import { createPrismaMailboxMessageSyncService } from "./mailbox-message-sync-service";
import { createPrismaMailboxOnboardingService } from "./mailbox-onboarding-service";
import { createPrismaMailboxReadinessService } from "./mailbox-readiness-service";
import { createPrismaMailboxSubscriptionService } from "./mailbox-subscription-service";
import { createServer } from "./server";

const env = getServerEnv();
const logger = createLogger({
  service: "friendly-mail-api"
});
const prisma = getPrismaClient();
const mailboxNotificationQueue = createQueue(queueNames.mailboxNotifications);
const authService = createPrismaAuthService({
  prisma,
  sessionSecret: env.SESSION_SECRET,
  sessionMaxAgeHours: env.SESSION_MAX_AGE_HOURS,
  logger: logger as Logger
});
const mailboxOnboardingService = createPrismaMailboxOnboardingService({
  prisma,
  env,
  logger: logger as Logger
});
const mailboxReadinessService = createPrismaMailboxReadinessService({
  prisma,
  env,
  logger: logger as Logger
});
const mailboxFolderSyncService = createPrismaMailboxFolderSyncService({
  prisma,
  env,
  logger: logger as Logger
});
const mailboxMessageSyncService = createPrismaMailboxMessageSyncService({
  prisma,
  env,
  logger: logger as Logger
});
const mailboxSubscriptionService = createPrismaMailboxSubscriptionService({
  prisma,
  env,
  logger: logger as Logger,
  notificationQueue: mailboxNotificationQueue
});
const server = createServer({
  env,
  authService,
  mailboxOnboardingService,
  mailboxReadinessService,
  mailboxFolderSyncService,
  mailboxMessageSyncService,
  mailboxSubscriptionService,
  logger: logger as Logger
});

server.listen(env.API_PORT, () => {
  logger.info("Friendly Mail API listening", {
    port: env.API_PORT,
    environment: env.NODE_ENV
  });
});
