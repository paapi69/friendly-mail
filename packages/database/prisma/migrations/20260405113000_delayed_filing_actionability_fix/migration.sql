-- CreateEnum
CREATE TYPE "FilingDecisionStatus" AS ENUM (
  'BLOCKED',
  'ELIGIBLE',
  'EXECUTED',
  'FAILED'
);

-- CreateEnum
CREATE TYPE "MailboxActionType" AS ENUM (
  'MOVE_MESSAGE',
  'APPLY_CATEGORY',
  'FORWARD_MESSAGE',
  'STAMP_OUTGOING_REFERENCE'
);

-- CreateEnum
CREATE TYPE "MailboxActionMode" AS ENUM (
  'SUGGESTION_ONLY',
  'AUTO_APPLY',
  'APPROVED_APPLY'
);

-- CreateEnum
CREATE TYPE "MailboxActionStatus" AS ENUM (
  'SUGGESTED',
  'PENDING_APPROVAL',
  'SUCCEEDED',
  'FAILED',
  'SKIPPED'
);

-- CreateTable
CREATE TABLE "FilingDecision" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "workflowStateId" TEXT,
  "actionability" "MessageActionability" NOT NULL,
  "status" "FilingDecisionStatus" NOT NULL,
  "mode" "MailboxActionMode" NOT NULL,
  "targetFolderId" TEXT,
  "targetFolderGraphId" TEXT,
  "targetFolderName" TEXT,
  "suggestedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requirements" "FilingEligibilityRequirement"[] DEFAULT ARRAY[]::"FilingEligibilityRequirement"[],
  "blockedBy" "FilingBlockedBy"[] DEFAULT ARRAY[]::"FilingBlockedBy"[],
  "summary" TEXT NOT NULL,
  "rationale" TEXT,
  "sourceMessageIsRead" BOOLEAN NOT NULL DEFAULT false,
  "approvedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  "executedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FilingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxActionAttempt" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "filingDecisionId" TEXT,
  "actionType" "MailboxActionType" NOT NULL,
  "mode" "MailboxActionMode" NOT NULL,
  "status" "MailboxActionStatus" NOT NULL,
  "actorUserId" TEXT,
  "targetFolderId" TEXT,
  "targetFolderGraphId" TEXT,
  "targetFolderName" TEXT,
  "categoryName" TEXT,
  "forwardedTo" TEXT,
  "referenceNumber" TEXT,
  "graphMessageId" TEXT,
  "graphRequestId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MailboxActionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutgoingSequence" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "sequenceKey" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "lastAllocatedValue" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutgoingSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FilingDecision_messageId_key" ON "FilingDecision"("messageId");

-- CreateIndex
CREATE INDEX "FilingDecision_mailboxId_idx" ON "FilingDecision"("mailboxId");

-- CreateIndex
CREATE INDEX "FilingDecision_status_decidedAt_idx" ON "FilingDecision"("status", "decidedAt");

-- CreateIndex
CREATE INDEX "MailboxActionAttempt_mailboxId_attemptedAt_idx" ON "MailboxActionAttempt"("mailboxId", "attemptedAt");

-- CreateIndex
CREATE INDEX "MailboxActionAttempt_messageId_attemptedAt_idx" ON "MailboxActionAttempt"("messageId", "attemptedAt");

-- CreateIndex
CREATE INDEX "MailboxActionAttempt_filingDecisionId_idx" ON "MailboxActionAttempt"("filingDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "OutgoingSequence_mailboxId_sequenceKey_key"
ON "OutgoingSequence"("mailboxId", "sequenceKey");

-- CreateIndex
CREATE INDEX "OutgoingSequence_mailboxId_idx" ON "OutgoingSequence"("mailboxId");

-- AddForeignKey
ALTER TABLE "FilingDecision"
ADD CONSTRAINT "FilingDecision_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingDecision"
ADD CONSTRAINT "FilingDecision_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingDecision"
ADD CONSTRAINT "FilingDecision_targetFolderId_fkey"
FOREIGN KEY ("targetFolderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxActionAttempt"
ADD CONSTRAINT "MailboxActionAttempt_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxActionAttempt"
ADD CONSTRAINT "MailboxActionAttempt_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxActionAttempt"
ADD CONSTRAINT "MailboxActionAttempt_filingDecisionId_fkey"
FOREIGN KEY ("filingDecisionId") REFERENCES "FilingDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxActionAttempt"
ADD CONSTRAINT "MailboxActionAttempt_targetFolderId_fkey"
FOREIGN KEY ("targetFolderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutgoingSequence"
ADD CONSTRAINT "OutgoingSequence_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
