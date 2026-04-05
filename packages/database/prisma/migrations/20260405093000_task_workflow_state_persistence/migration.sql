-- CreateEnum
CREATE TYPE "TaskStatusReason" AS ENUM (
  'USER_COMPLETED',
  'USER_DISMISSED',
  'RESOLVED_BY_WORKFLOW',
  'DELEGATED',
  'SNOOZED'
);

-- CreateEnum
CREATE TYPE "TaskSourceKind" AS ENUM (
  'CLASSIFICATION_TASK_CANDIDATE',
  'MANUAL',
  'WORKFLOW_RULE'
);

-- CreateEnum
CREATE TYPE "MessageWorkflowStatus" AS ENUM (
  'PENDING_TASK_MATERIALIZATION',
  'ACTIVE_ACTIONABLE',
  'ACTIVE_INFORMATIONAL_UNREAD',
  'ACTIVE_INFORMATIONAL_REVIEWED',
  'FILING_BLOCKED',
  'ELIGIBLE_TO_FILE'
);

-- CreateEnum
CREATE TYPE "FilingBlockedBy" AS ENUM (
  'CLASSIFICATION_PENDING',
  'TASK_MATERIALIZATION_PENDING',
  'MESSAGE_UNREAD',
  'OPEN_TASK',
  'SNOOZED_TASK',
  'DELEGATED_TASK',
  'CRITICAL_WORK_REMAINING',
  'AWAITING_REVIEW',
  'POLICY_HOLD'
);

-- CreateEnum
CREATE TYPE "FilingEligibilityRequirement" AS ENUM (
  'MESSAGE_READ',
  'ALL_REQUIRED_TASKS_RESOLVED',
  'CRITICAL_WORK_CLEARED',
  'MANUAL_REVIEW_COMPLETED',
  'POLICY_CLEARANCE'
);

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "taskKey" TEXT,
ADD COLUMN "sourceTaskCandidateId" TEXT,
ADD COLUMN "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "criticality" "WorkflowCriticalityLevel" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "ownerUserId" TEXT,
ADD COLUMN "assignedUserId" TEXT,
ADD COLUMN "delegatedByUserId" TEXT,
ADD COLUMN "snoozedUntil" TIMESTAMP(3),
ADD COLUMN "resolutionReason" "TaskStatusReason",
ADD COLUMN "resolutionNote" TEXT;

-- Backfill
UPDATE "Task"
SET "taskKey" = CONCAT('legacy:', "id")
WHERE "taskKey" IS NULL;

-- AlterTable
ALTER TABLE "Task"
ALTER COLUMN "taskKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "TaskSourceLink" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "sourceKind" "TaskSourceKind" NOT NULL,
  "classificationIngestionVersionKey" TEXT,
  "classifierVersion" TEXT,
  "taskCandidateId" TEXT NOT NULL,
  "dueDateSignalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "entitySignalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "provenanceJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaskSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLifecycleEvent" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "fromStatus" "TaskStatus",
  "toStatus" "TaskStatus" NOT NULL,
  "reason" "TaskStatusReason" NOT NULL,
  "actorUserId" TEXT,
  "delegatedToUserId" TEXT,
  "note" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageWorkflowState" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "actionability" "MessageActionability" NOT NULL,
  "status" "MessageWorkflowStatus" NOT NULL,
  "filingState" "FilingState" NOT NULL,
  "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
  "criticality" "WorkflowCriticalityLevel" NOT NULL DEFAULT 'NORMAL',
  "isEligibleToFile" BOOLEAN NOT NULL DEFAULT false,
  "requirements" "FilingEligibilityRequirement"[] DEFAULT ARRAY[]::"FilingEligibilityRequirement"[],
  "blockedBy" "FilingBlockedBy"[] DEFAULT ARRAY[]::"FilingBlockedBy"[],
  "blockingTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "unresolvedTaskCount" INTEGER NOT NULL DEFAULT 0,
  "openTaskCount" INTEGER NOT NULL DEFAULT 0,
  "snoozedTaskCount" INTEGER NOT NULL DEFAULT 0,
  "delegatedTaskCount" INTEGER NOT NULL DEFAULT 0,
  "informationalReadRequired" BOOLEAN NOT NULL DEFAULT false,
  "messageIsRead" BOOLEAN NOT NULL DEFAULT false,
  "lastEvaluatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessageWorkflowState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskKey_key" ON "Task"("taskKey");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSourceLink_taskId_sourceKind_messageId_taskCandidateId_key"
ON "TaskSourceLink"("taskId", "sourceKind", "messageId", "taskCandidateId");

-- CreateIndex
CREATE INDEX "TaskSourceLink_mailboxId_idx" ON "TaskSourceLink"("mailboxId");

-- CreateIndex
CREATE INDEX "TaskSourceLink_messageId_idx" ON "TaskSourceLink"("messageId");

-- CreateIndex
CREATE INDEX "TaskLifecycleEvent_mailboxId_idx" ON "TaskLifecycleEvent"("mailboxId");

-- CreateIndex
CREATE INDEX "TaskLifecycleEvent_taskId_occurredAt_idx" ON "TaskLifecycleEvent"("taskId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageWorkflowState_messageId_key" ON "MessageWorkflowState"("messageId");

-- CreateIndex
CREATE INDEX "MessageWorkflowState_mailboxId_idx" ON "MessageWorkflowState"("mailboxId");

-- CreateIndex
CREATE INDEX "MessageWorkflowState_status_idx" ON "MessageWorkflowState"("status");

-- AddForeignKey
ALTER TABLE "TaskSourceLink"
ADD CONSTRAINT "TaskSourceLink_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSourceLink"
ADD CONSTRAINT "TaskSourceLink_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSourceLink"
ADD CONSTRAINT "TaskSourceLink_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLifecycleEvent"
ADD CONSTRAINT "TaskLifecycleEvent_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLifecycleEvent"
ADD CONSTRAINT "TaskLifecycleEvent_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageWorkflowState"
ADD CONSTRAINT "MessageWorkflowState_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageWorkflowState"
ADD CONSTRAINT "MessageWorkflowState_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
