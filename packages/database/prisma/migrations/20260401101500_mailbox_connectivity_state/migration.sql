-- CreateEnum
CREATE TYPE "MailboxConnectionStatus" AS ENUM (
  'PENDING_CONSENT',
  'ACTIVE',
  'NEEDS_REAUTH',
  'FAILED',
  'DISCONNECTED'
);

-- CreateEnum
CREATE TYPE "FolderSyncStatus" AS ENUM ('PENDING', 'ACTIVE', 'IDLE', 'FAILED');

-- CreateEnum
CREATE TYPE "GraphSubscriptionStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'REMOVED',
  'REAUTH_REQUIRED',
  'FAILED'
);

-- AlterTable
ALTER TABLE "Folder"
ADD COLUMN "isSyncEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN "graphParentFolderId" TEXT,
ADD COLUMN "graphChangeKey" TEXT,
ADD COLUMN "lastGraphModifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MailboxConnection" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "graphTenantId" TEXT NOT NULL,
  "graphUserId" TEXT NOT NULL,
  "status" "MailboxConnectionStatus" NOT NULL DEFAULT 'PENDING_CONSENT',
  "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "accessTokenCiphertext" TEXT,
  "refreshTokenCiphertext" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3),
  "lastValidatedAt" TIMESTAMP(3),
  "lastReauthorizedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderSyncState" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "folderId" TEXT NOT NULL,
  "deltaLink" TEXT,
  "syncStatus" "FolderSyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP(3),
  "lastCursorUpdatedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FolderSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphSubscription" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "graphSubscriptionId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "changeTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notificationUrl" TEXT NOT NULL,
  "lifecycleNotificationUrl" TEXT,
  "clientStateHash" TEXT,
  "status" "GraphSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastValidatedAt" TIMESTAMP(3),
  "lastNotificationAt" TIMESTAMP(3),
  "lastLifecycleEventAt" TIMESTAMP(3),
  "lastReauthorizedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GraphSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailboxConnection_mailboxId_key" ON "MailboxConnection"("mailboxId");

-- CreateIndex
CREATE INDEX "MailboxConnection_tenantId_idx" ON "MailboxConnection"("tenantId");

-- CreateIndex
CREATE INDEX "MailboxConnection_userId_idx" ON "MailboxConnection"("userId");

-- CreateIndex
CREATE INDEX "MailboxConnection_status_idx" ON "MailboxConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FolderSyncState_folderId_key" ON "FolderSyncState"("folderId");

-- CreateIndex
CREATE INDEX "FolderSyncState_mailboxId_idx" ON "FolderSyncState"("mailboxId");

-- CreateIndex
CREATE INDEX "FolderSyncState_syncStatus_idx" ON "FolderSyncState"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GraphSubscription_graphSubscriptionId_key" ON "GraphSubscription"("graphSubscriptionId");

-- CreateIndex
CREATE INDEX "GraphSubscription_mailboxId_idx" ON "GraphSubscription"("mailboxId");

-- CreateIndex
CREATE INDEX "GraphSubscription_status_expiresAt_idx" ON "GraphSubscription"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "MailboxConnection"
ADD CONSTRAINT "MailboxConnection_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxConnection"
ADD CONSTRAINT "MailboxConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxConnection"
ADD CONSTRAINT "MailboxConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSyncState"
ADD CONSTRAINT "FolderSyncState_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSyncState"
ADD CONSTRAINT "FolderSyncState_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphSubscription"
ADD CONSTRAINT "GraphSubscription_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
