-- CreateEnum
CREATE TYPE "MailboxKind" AS ENUM ('USER', 'SHARED');

-- CreateEnum
CREATE TYPE "MessageActionability" AS ENUM ('ACTIONABLE', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FilingState" AS ENUM (
  'PENDING_CLASSIFICATION',
  'ACTIVE_ACTIONABLE',
  'ACTIVE_INFORMATIONAL_UNREAD',
  'ELIGIBLE_TO_FILE',
  'FILED',
  'FILING_BLOCKED'
);

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'SNOOZED', 'DELEGATED', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailbox" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "emailAddress" TEXT NOT NULL,
  "graphMailboxId" TEXT,
  "kind" "MailboxKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "graphFolderId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "parentGraphFolderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "folderId" TEXT,
  "graphMessageId" TEXT NOT NULL,
  "internetMessageId" TEXT,
  "conversationId" TEXT,
  "subject" TEXT NOT NULL,
  "fromAddress" TEXT,
  "receivedAt" TIMESTAMP(3),
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "actionability" "MessageActionability",
  "filingState" "FilingState" NOT NULL DEFAULT 'PENDING_CLASSIFICATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT,
  "actor" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payloadJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_emailAddress_key" ON "Mailbox"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_graphMailboxId_key" ON "Mailbox"("graphMailboxId");

-- CreateIndex
CREATE INDEX "Mailbox_tenantId_idx" ON "Mailbox"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_graphFolderId_key" ON "Folder"("graphFolderId");

-- CreateIndex
CREATE INDEX "Folder_mailboxId_idx" ON "Folder"("mailboxId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_graphMessageId_key" ON "Message"("graphMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_internetMessageId_key" ON "Message"("internetMessageId");

-- CreateIndex
CREATE INDEX "Message_mailboxId_idx" ON "Message"("mailboxId");

-- CreateIndex
CREATE INDEX "Message_folderId_idx" ON "Message"("folderId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Task_mailboxId_idx" ON "Task"("mailboxId");

-- CreateIndex
CREATE INDEX "Task_messageId_idx" ON "Task"("messageId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_idx" ON "AuditEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AuditEvent_messageId_idx" ON "AuditEvent"("messageId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Mailbox" ADD CONSTRAINT "Mailbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
