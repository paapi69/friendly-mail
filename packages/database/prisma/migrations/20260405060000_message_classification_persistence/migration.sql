-- CreateEnum
CREATE TYPE "MessageType" AS ENUM (
  'CONTRACT',
  'NOTICE',
  'LETTER',
  'POLICY',
  'COMMITTEE',
  'EVENT',
  'INVOICE',
  'INTERNAL',
  'FYI'
);

-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkflowCriticalityLevel" AS ENUM ('NORMAL', 'ELEVATED', 'CRITICAL');

-- CreateTable
CREATE TABLE "MessageClassification" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "ingestionVersionKey" TEXT NOT NULL,
  "classifierVersion" TEXT NOT NULL,
  "actionability" "MessageActionability" NOT NULL,
  "messageType" "MessageType" NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "explanationSummary" TEXT NOT NULL,
  "explanationLowConfidence" BOOLEAN NOT NULL DEFAULT false,
  "explanationJson" JSONB NOT NULL,
  "dueDatesJson" JSONB NOT NULL,
  "entitiesJson" JSONB NOT NULL,
  "taskCandidatesJson" JSONB NOT NULL,
  "urgencyLevel" "MessagePriority" NOT NULL,
  "urgencyConfidenceScore" DOUBLE PRECISION NOT NULL,
  "urgencyRationale" TEXT NOT NULL,
  "urgencyReasonsJson" JSONB NOT NULL,
  "criticalityLevel" "WorkflowCriticalityLevel" NOT NULL,
  "criticalityConfidenceScore" DOUBLE PRECISION NOT NULL,
  "criticalityRationale" TEXT NOT NULL,
  "criticalityReasonsJson" JSONB NOT NULL,
  "sourceAttachmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sourceArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "classifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessageClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageClassification_messageId_ingestionVersionKey_classifierVersion_key"
ON "MessageClassification"("messageId", "ingestionVersionKey", "classifierVersion");

-- CreateIndex
CREATE INDEX "MessageClassification_mailboxId_messageId_idx"
ON "MessageClassification"("mailboxId", "messageId");

-- CreateIndex
CREATE INDEX "MessageClassification_mailboxId_classifiedAt_idx"
ON "MessageClassification"("mailboxId", "classifiedAt");

-- AddForeignKey
ALTER TABLE "MessageClassification"
ADD CONSTRAINT "MessageClassification_mailboxId_fkey"
FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageClassification"
ADD CONSTRAINT "MessageClassification_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
