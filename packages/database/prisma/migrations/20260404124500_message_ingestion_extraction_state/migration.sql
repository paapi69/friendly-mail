-- CreateEnum
CREATE TYPE "MessageBodyContentType" AS ENUM ('TEXT');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('FILE', 'ITEM', 'REFERENCE');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM (
  'NOT_ATTEMPTED',
  'PENDING',
  'COMPLETED',
  'COMPLETED_WITH_OCR',
  'UNSUPPORTED',
  'FAILED'
);

-- CreateEnum
CREATE TYPE "ExtractionArtifactKind" AS ENUM (
  'ATTACHMENT_TEXT',
  'ATTACHMENT_OCR'
);

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN "bodyPreview" TEXT,
ADD COLUMN "bodyContentType" "MessageBodyContentType",
ADD COLUMN "bodyText" TEXT,
ADD COLUMN "uniqueBodyText" TEXT,
ADD COLUMN "webLink" TEXT,
ADD COLUMN "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ingestionVersionKey" TEXT,
ADD COLUMN "ingestedAt" TIMESTAMP(3),
ADD COLUMN "lastIngestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "graphMessageId" TEXT NOT NULL,
  "graphAttachmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contentType" TEXT,
  "sizeInBytes" INTEGER NOT NULL,
  "isInline" BOOLEAN NOT NULL DEFAULT false,
  "attachmentKind" "AttachmentKind" NOT NULL,
  "lastGraphModifiedAt" TIMESTAMP(3),
  "isExtractionCandidate" BOOLEAN NOT NULL DEFAULT false,
  "extractionDecisionReason" TEXT,
  "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED',
  "extractionAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastExtractionAt" TIMESTAMP(3),
  "lastExtractionErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionArtifact" (
  "id" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "artifactKind" "ExtractionArtifactKind" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "textLength" INTEGER,
  "contentHash" TEXT,
  "confidenceScore" DOUBLE PRECISION,
  "sourceVersionKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExtractionArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_mailboxId_graphAttachmentId_key" ON "MessageAttachment"("mailboxId", "graphAttachmentId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "MessageAttachment_graphMessageId_idx" ON "MessageAttachment"("graphMessageId");

-- CreateIndex
CREATE INDEX "MessageAttachment_extractionStatus_idx" ON "MessageAttachment"("extractionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionArtifact_attachmentId_artifactKind_key" ON "ExtractionArtifact"("attachmentId", "artifactKind");

-- CreateIndex
CREATE INDEX "ExtractionArtifact_mailboxId_idx" ON "ExtractionArtifact"("mailboxId");

-- CreateIndex
CREATE INDEX "ExtractionArtifact_messageId_idx" ON "ExtractionArtifact"("messageId");

-- AddForeignKey
ALTER TABLE "MessageAttachment"
ADD CONSTRAINT "MessageAttachment_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment"
ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionArtifact"
ADD CONSTRAINT "ExtractionArtifact_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionArtifact"
ADD CONSTRAINT "ExtractionArtifact_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionArtifact"
ADD CONSTRAINT "ExtractionArtifact_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
