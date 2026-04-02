import { getServerEnv } from "@friendly-mail/config";
import { getPrismaClient } from "@friendly-mail/database";
import {
  createLogger,
  type Logger
} from "@friendly-mail/observability";
import { createPrismaAuthService } from "./auth-service";
import { createPrismaMailboxFolderSyncService } from "./mailbox-folder-sync-service";
import { createPrismaMailboxOnboardingService } from "./mailbox-onboarding-service";
import { createServer } from "./server";

const env = getServerEnv();
const logger = createLogger({
  service: "friendly-mail-api"
});
const prisma = getPrismaClient();
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
const mailboxFolderSyncService = createPrismaMailboxFolderSyncService({
  prisma,
  env,
  logger: logger as Logger
});
const server = createServer({
  env,
  authService,
  mailboxOnboardingService,
  mailboxFolderSyncService,
  logger: logger as Logger
});

server.listen(env.API_PORT, () => {
  logger.info("Friendly Mail API listening", {
    port: env.API_PORT,
    environment: env.NODE_ENV
  });
});
