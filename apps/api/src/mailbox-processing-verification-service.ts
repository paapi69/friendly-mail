import {
  OperationalHealthStatus,
  VerificationCheckStatus,
  type ProcessingVerificationCountByErrorCode,
  type ProcessingVerificationCountByReason,
  type MailboxProcessingVerificationReport,
  type SessionView,
  type VerificationCheck
} from "@friendly-mail/contracts";
import { type PrismaClient } from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";

type GetMailboxProcessingVerificationInput = {
  session: SessionView;
  mailboxId: string;
};

type MessageVerificationRecord = {
  id: string;
  hasAttachments: boolean;
  ingestionVersionKey: string | null;
  ingestedAt: Date | null;
};

type AttachmentVerificationRecord = {
  id: string;
  extractionStatus:
    | "NOT_ATTEMPTED"
    | "PENDING"
    | "COMPLETED"
    | "COMPLETED_WITH_OCR"
    | "UNSUPPORTED"
    | "FAILED";
  extractionAttempts: number;
  extractionDecisionReason: string | null;
  lastExtractionErrorCode: string | null;
};

export type MailboxProcessingVerificationService = {
  getMailboxProcessingVerification(
    input: GetMailboxProcessingVerificationInput
  ): Promise<MailboxProcessingVerificationReport>;
};

export type CreatePrismaMailboxProcessingVerificationServiceInput = {
  prisma: PrismaClient;
  logger: Logger;
  now?: () => Date;
};

export function createPrismaMailboxProcessingVerificationService(
  input: CreatePrismaMailboxProcessingVerificationServiceInput
): MailboxProcessingVerificationService {
  const now = input.now ?? (() => new Date());

  return {
    async getMailboxProcessingVerification(verificationInput) {
      const checkedAt = now();
      const mailbox = await input.prisma.mailbox.findFirst({
        where: {
          id: verificationInput.mailboxId,
          tenantId: verificationInput.session.principal.tenantId
        },
        include: {
          connection: true
        }
      });

      if (!mailbox) {
        throw new AppError("MAILBOX_NOT_FOUND", "Mailbox not found.", {
          statusCode: 404
        });
      }

      if (!mailbox.connection || mailbox.connection.userId !== verificationInput.session.principal.userId) {
        throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
          statusCode: 403
        });
      }

      const messages = (await input.prisma.message.findMany({
        where: {
          mailboxId: mailbox.id
        },
        select: {
          id: true,
          hasAttachments: true,
          ingestionVersionKey: true,
          ingestedAt: true
        }
      })) as MessageVerificationRecord[];
      const attachments = (await input.prisma.messageAttachment.findMany({
        where: {
          mailboxId: mailbox.id
        },
        select: {
          id: true,
          extractionStatus: true,
          extractionAttempts: true,
          extractionDecisionReason: true,
          lastExtractionErrorCode: true
        }
      })) as AttachmentVerificationRecord[];

      const ingestion = buildIngestionSummary(messages);
      const extraction = buildExtractionSummary(attachments);
      const checks = buildVerificationChecks(ingestion, extraction);
      const overallStatus = deriveOverallStatus(checks);

      input.logger.info("Built mailbox processing verification report", {
        mailboxId: mailbox.id,
        overallStatus,
        trackedMessages: ingestion.trackedMessages,
        trackedAttachments: extraction.trackedAttachments,
        retryBacklogAttachments: extraction.retryBacklogAttachments,
        failureRate: extraction.failureRate
      });

      return {
        mailboxId: mailbox.id,
        checkedAt: checkedAt.toISOString(),
        overallStatus,
        ingestion,
        extraction,
        checks
      };
    }
  };
}

function buildIngestionSummary(messages: MessageVerificationRecord[]) {
  const trackedMessages = messages.length;
  const ingestedMessages = messages.filter(
    (message) => Boolean(message.ingestionVersionKey) && Boolean(message.ingestedAt)
  ).length;
  const messagesWithAttachments = messages.filter((message) => message.hasAttachments).length;

  return {
    trackedMessages,
    ingestedMessages,
    pendingMessages: Math.max(0, trackedMessages - ingestedMessages),
    messagesWithAttachments
  };
}

function buildExtractionSummary(attachments: AttachmentVerificationRecord[]) {
  let candidateAttachments = 0;
  let completedAttachments = 0;
  let completedWithOcrAttachments = 0;
  let pendingAttachments = 0;
  let failedAttachments = 0;
  let unsupportedAttachments = 0;
  let retriedAttachments = 0;
  let maxExtractionAttempts = 0;
  const unsupportedReasonCounts = new Map<string, number>();
  const failureReasonCounts = new Map<string, number>();

  for (const attachment of attachments) {
    if (attachment.extractionAttempts > 1) {
      retriedAttachments += 1;
    }

    maxExtractionAttempts = Math.max(maxExtractionAttempts, attachment.extractionAttempts);

    if (attachment.lastExtractionErrorCode) {
      failureReasonCounts.set(
        attachment.lastExtractionErrorCode,
        (failureReasonCounts.get(attachment.lastExtractionErrorCode) ?? 0) + 1
      );
    }

    switch (attachment.extractionStatus) {
      case "COMPLETED":
        candidateAttachments += 1;
        completedAttachments += 1;
        break;
      case "COMPLETED_WITH_OCR":
        candidateAttachments += 1;
        completedWithOcrAttachments += 1;
        break;
      case "PENDING":
        candidateAttachments += 1;
        pendingAttachments += 1;
        break;
      case "FAILED":
        candidateAttachments += 1;
        failedAttachments += 1;
        break;
      case "UNSUPPORTED":
        unsupportedAttachments += 1;
        if (attachment.extractionDecisionReason) {
          unsupportedReasonCounts.set(
            attachment.extractionDecisionReason,
            (unsupportedReasonCounts.get(attachment.extractionDecisionReason) ?? 0) + 1
          );
        }
        break;
      case "NOT_ATTEMPTED":
        candidateAttachments += 1;
        pendingAttachments += 1;
        break;
    }
  }

  return {
    trackedAttachments: attachments.length,
    candidateAttachments,
    completedAttachments,
    completedWithOcrAttachments,
    pendingAttachments,
    failedAttachments,
    unsupportedAttachments,
    retriedAttachments,
    retryBacklogAttachments: pendingAttachments + failedAttachments,
    maxExtractionAttempts,
    failureRate:
      candidateAttachments > 0
        ? Number((failedAttachments / candidateAttachments).toFixed(4))
        : 0,
    unsupportedReasons: mapReasonCounts(unsupportedReasonCounts),
    failureReasons: mapErrorCodeCounts(failureReasonCounts)
  };
}

function buildVerificationChecks(
  ingestion: MailboxProcessingVerificationReport["ingestion"],
  extraction: MailboxProcessingVerificationReport["extraction"]
): VerificationCheck[] {
  return [
    {
      code: "message_ingestion_coverage",
      status:
        ingestion.pendingMessages === 0
          ? VerificationCheckStatus.Pass
          : ingestion.ingestedMessages === 0
            ? VerificationCheckStatus.Fail
            : VerificationCheckStatus.Warn,
      detail:
        ingestion.trackedMessages === 0
          ? "No tracked messages exist for this mailbox yet."
          : ingestion.pendingMessages === 0
            ? "All tracked messages have normalized ingestion records."
            : `${ingestion.pendingMessages} tracked messages are still pending normalized ingestion.`
    },
    {
      code: "retry_backlog",
      status:
        extraction.retryBacklogAttachments === 0
          ? VerificationCheckStatus.Pass
          : extraction.failedAttachments > 0
            ? VerificationCheckStatus.Fail
            : VerificationCheckStatus.Warn,
      detail:
        extraction.candidateAttachments === 0
          ? "No extraction candidates are currently tracked for this mailbox."
          : extraction.retryBacklogAttachments === 0
            ? "No extraction backlog is waiting on retry or remediation."
            : `${extraction.retryBacklogAttachments} extraction candidates remain pending or failed, with ${extraction.retriedAttachments} attachments showing retry history.`
    },
    {
      code: "attachment_failure_rate",
      status:
        extraction.failedAttachments === 0
          ? VerificationCheckStatus.Pass
          : extraction.failureRate >= 0.25
            ? VerificationCheckStatus.Fail
            : VerificationCheckStatus.Warn,
      detail:
        extraction.candidateAttachments === 0
          ? "No candidate attachments are in scope for extraction yet."
          : extraction.failedAttachments === 0
            ? "Candidate attachment extraction is succeeding without recorded failures."
            : `Attachment extraction failure rate is ${(extraction.failureRate * 100).toFixed(0)}% across current extraction candidates.`
    },
    {
      code: "unsupported_attachment_handling",
      status: VerificationCheckStatus.Pass,
      detail:
        extraction.unsupportedAttachments === 0
          ? "No unsupported attachment cases are currently tracked."
          : `Unsupported attachments remain explicitly visible: ${describeUnsupportedReasons(extraction.unsupportedReasons)}.`
    }
  ];
}

function deriveOverallStatus(checks: VerificationCheck[]) {
  if (checks.some((check) => check.status === VerificationCheckStatus.Fail)) {
    return OperationalHealthStatus.Critical;
  }

  if (checks.some((check) => check.status === VerificationCheckStatus.Warn)) {
    return OperationalHealthStatus.Warning;
  }

  return OperationalHealthStatus.Healthy;
}

function sortCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    });
}

function mapReasonCounts(counts: Map<string, number>): ProcessingVerificationCountByReason[] {
  return sortCounts(counts).map(([reason, count]) => ({
    reason,
    count
  }));
}

function mapErrorCodeCounts(
  counts: Map<string, number>
): ProcessingVerificationCountByErrorCode[] {
  return sortCounts(counts).map(([errorCode, count]) => ({
    errorCode,
    count
  }));
}

function describeUnsupportedReasons(
  reasons: MailboxProcessingVerificationReport["extraction"]["unsupportedReasons"]
) {
  return reasons.map((reason) => `${reason.reason} (${reason.count})`).join(", ");
}
