import {
  ClassificationReasonCode,
  MessageType,
  OperationalHealthStatus,
  VerificationCheckStatus,
  type ClassificationVerificationCountByMessageType,
  type MailboxClassificationVerificationReport,
  type SessionView,
  type VerificationCheck
} from "@friendly-mail/contracts";
import { type PrismaClient } from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";

type GetMailboxClassificationVerificationInput = {
  session: SessionView;
  mailboxId: string;
};

type MessageClassificationVerificationRecord = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  messageType:
    | "CONTRACT"
    | "NOTICE"
    | "LETTER"
    | "POLICY"
    | "COMMITTEE"
    | "EVENT"
    | "INVOICE"
    | "INTERNAL"
    | "FYI";
  confidenceScore: number;
  explanationJson: {
    summary: string;
    lowConfidence: boolean;
    reasons: Array<{
      code: ClassificationReasonCode;
      summary: string;
    }>;
  };
  dueDatesJson: unknown[];
  entitiesJson: unknown[];
  taskCandidatesJson: unknown[];
  criticalityLevel: "NORMAL" | "ELEVATED" | "CRITICAL";
  classifiedAt: Date;
};

type RawMessageClassificationVerificationRecord = Omit<
  MessageClassificationVerificationRecord,
  "actionability" | "messageType" | "explanationJson" | "dueDatesJson" | "entitiesJson" | "taskCandidatesJson"
> & {
  actionability: unknown;
  messageType: unknown;
  explanationJson: unknown;
  dueDatesJson: unknown;
  entitiesJson: unknown;
  taskCandidatesJson: unknown;
};

type MessageVerificationRecord = {
  id: string;
  ingestionVersionKey: string | null;
};

type MailboxOwnershipRecord = {
  id: string;
  tenantId: string;
  connection: {
    userId: string;
  } | null;
};

export type MailboxClassificationVerificationService = {
  getMailboxClassificationVerification(
    input: GetMailboxClassificationVerificationInput
  ): Promise<MailboxClassificationVerificationReport>;
};

export type CreatePrismaMailboxClassificationVerificationServiceInput = {
  prisma: PrismaClient;
  logger: Logger;
  now?: () => Date;
};

export function createPrismaMailboxClassificationVerificationService(
  input: CreatePrismaMailboxClassificationVerificationServiceInput
): MailboxClassificationVerificationService {
  const now = input.now ?? (() => new Date());

  return {
    async getMailboxClassificationVerification(verificationInput) {
      const checkedAt = now();
      const mailbox = await getOwnedMailbox(input.prisma, verificationInput);
      const messages = (await input.prisma.message.findMany({
        where: {
          mailboxId: mailbox.id
        },
        select: {
          id: true,
          ingestionVersionKey: true
        }
      })) as MessageVerificationRecord[];
      const classifications = (await input.prisma.messageClassification.findMany({
        where: {
          mailboxId: mailbox.id
        },
        orderBy: {
          classifiedAt: "desc"
        }
      })) as unknown as RawMessageClassificationVerificationRecord[];
      const normalizedClassifications = classifications.map(normalizeClassificationRecord);
      const currentClassifications = collectCurrentClassifications(messages, normalizedClassifications);
      const coverage = buildCoverageSummary(messages, currentClassifications);
      const confidence = buildConfidenceSummary(currentClassifications);
      const signals = buildSignalSummary(currentClassifications);
      const degradedCases = buildDegradedCaseSummary(currentClassifications);
      const checks = buildVerificationChecks(coverage, confidence, signals, degradedCases);
      const overallStatus = deriveOverallStatus(checks);

      input.logger.info("Built mailbox classification verification report", {
        mailboxId: mailbox.id,
        overallStatus,
        trackedMessages: coverage.trackedMessages,
        eligibleMessages: coverage.eligibleMessages,
        classifiedMessages: coverage.classifiedMessages,
        lowConfidenceMessages: confidence.lowConfidenceMessages,
        highRiskMissingDueDates: degradedCases.highRiskMissingDueDateMessageIds.length
      });

      return {
        mailboxId: mailbox.id,
        checkedAt: checkedAt.toISOString(),
        overallStatus,
        coverage,
        confidence,
        signals,
        degradedCases,
        checks
      };
    }
  };
}

function collectCurrentClassifications(
  messages: MessageVerificationRecord[],
  classifications: MessageClassificationVerificationRecord[]
) {
  const currentVersionByMessageId = new Map(
    messages.map((message) => [message.id, message.ingestionVersionKey])
  );
  const currentClassifications = new Map<string, MessageClassificationVerificationRecord>();

  for (const classification of classifications) {
    const currentVersionKey = currentVersionByMessageId.get(classification.messageId);
    if (!currentVersionKey || currentVersionKey !== classification.ingestionVersionKey) {
      continue;
    }

    if (!currentClassifications.has(classification.messageId)) {
      currentClassifications.set(classification.messageId, classification);
    }
  }

  return [...currentClassifications.values()];
}

function normalizeClassificationRecord(
  record: RawMessageClassificationVerificationRecord
): MessageClassificationVerificationRecord {
  return {
    ...record,
    actionability: normalizeActionability(record.actionability),
    messageType: normalizeMessageType(record.messageType),
    explanationJson: normalizeExplanation(record.explanationJson),
    dueDatesJson: normalizeArray(record.dueDatesJson),
    entitiesJson: normalizeArray(record.entitiesJson),
    taskCandidatesJson: normalizeArray(record.taskCandidatesJson)
  };
}

function normalizeActionability(value: unknown) {
  return value === "ACTIONABLE" || value === "INFORMATIONAL" ? value : "INFORMATIONAL";
}

function normalizeMessageType(value: unknown) {
  switch (value) {
    case "CONTRACT":
    case "NOTICE":
    case "LETTER":
    case "POLICY":
    case "COMMITTEE":
    case "EVENT":
    case "INVOICE":
    case "INTERNAL":
    case "FYI":
      return value;
    default:
      return "FYI";
  }
}

function normalizeExplanation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      summary: "",
      lowConfidence: false,
      reasons: []
    };
  }

  const candidate = value as {
    summary?: unknown;
    lowConfidence?: unknown;
    reasons?: unknown;
  };

  return {
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    lowConfidence: candidate.lowConfidence === true,
    reasons: Array.isArray(candidate.reasons)
      ? candidate.reasons
          .map((reason) => {
            if (!reason || typeof reason !== "object" || Array.isArray(reason)) {
              return undefined;
            }

            const reasonCandidate = reason as {
              code?: unknown;
              summary?: unknown;
            };

            return {
              code:
                typeof reasonCandidate.code === "string"
                  ? (reasonCandidate.code as ClassificationReasonCode)
                  : ClassificationReasonCode.AmbiguousContent,
              summary:
                typeof reasonCandidate.summary === "string" ? reasonCandidate.summary : ""
            };
          })
          .filter((reason): reason is { code: ClassificationReasonCode; summary: string } =>
            Boolean(reason)
          )
      : []
  };
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function buildCoverageSummary(
  messages: MessageVerificationRecord[],
  classifications: MessageClassificationVerificationRecord[]
) {
  const trackedMessages = messages.length;
  const eligibleMessages = messages.filter((message) => Boolean(message.ingestionVersionKey)).length;
  const classifiedMessages = classifications.length;
  const actionableMessages = classifications.filter(
    (classification) => classification.actionability === "ACTIONABLE"
  ).length;
  const informationalMessages = classifications.filter(
    (classification) => classification.actionability === "INFORMATIONAL"
  ).length;
  const messageTypeCounts = mapMessageTypeCounts(classifications);

  return {
    trackedMessages,
    eligibleMessages,
    classifiedMessages,
    pendingClassificationMessages: Math.max(0, eligibleMessages - classifiedMessages),
    actionableMessages,
    informationalMessages,
    messageTypeCounts
  };
}

function buildConfidenceSummary(classifications: MessageClassificationVerificationRecord[]) {
  const lowConfidenceMessages = classifications.filter(
    (classification) =>
      classification.explanationJson.lowConfidence || classification.confidenceScore < 0.5
  ).length;
  const mediumConfidenceMessages = classifications.filter(
    (classification) => classification.confidenceScore >= 0.5 && classification.confidenceScore < 0.75
  ).length;
  const highConfidenceMessages = classifications.filter(
    (classification) => classification.confidenceScore >= 0.75
  ).length;
  const ambiguousMessages = classifications.filter((classification) =>
    classification.explanationJson.reasons.some(
      (reason) => reason.code === ClassificationReasonCode.AmbiguousContent
    )
  ).length;

  return {
    averageScore:
      classifications.length > 0
        ? Number(
            (
              classifications.reduce((sum, classification) => sum + classification.confidenceScore, 0) /
              classifications.length
            ).toFixed(2)
          )
        : 0,
    lowConfidenceMessages,
    mediumConfidenceMessages,
    highConfidenceMessages,
    ambiguousMessages
  };
}

function buildSignalSummary(classifications: MessageClassificationVerificationRecord[]) {
  const highRiskClassifications = classifications.filter((classification) =>
    isHighRiskMessageType(classification.messageType)
  );

  return {
    messagesWithDueDates: classifications.filter((classification) => classification.dueDatesJson.length > 0)
      .length,
    messagesWithEntities: classifications.filter((classification) => classification.entitiesJson.length > 0)
      .length,
    messagesWithTaskCandidates: classifications.filter(
      (classification) => classification.taskCandidatesJson.length > 0
    ).length,
    messagesWithCriticality: classifications.filter((classification) => Boolean(classification.criticalityLevel))
      .length,
    highRiskMessages: highRiskClassifications.length,
    highRiskMessagesWithDueDates: highRiskClassifications.filter(
      (classification) => classification.dueDatesJson.length > 0
    ).length
  };
}

function buildDegradedCaseSummary(classifications: MessageClassificationVerificationRecord[]) {
  return {
    lowConfidenceMessageIds: classifications
      .filter((classification) => classification.explanationJson.lowConfidence)
      .map((classification) => classification.messageId)
      .sort(),
    ambiguousMessageIds: classifications
      .filter((classification) =>
        classification.explanationJson.reasons.some(
          (reason) => reason.code === ClassificationReasonCode.AmbiguousContent
        )
      )
      .map((classification) => classification.messageId)
      .sort(),
    highRiskMissingDueDateMessageIds: classifications
      .filter(
        (classification) =>
          isHighRiskMessageType(classification.messageType) && classification.dueDatesJson.length === 0
      )
      .map((classification) => classification.messageId)
      .sort()
  };
}

function buildVerificationChecks(
  coverage: MailboxClassificationVerificationReport["coverage"],
  confidence: MailboxClassificationVerificationReport["confidence"],
  signals: MailboxClassificationVerificationReport["signals"],
  degradedCases: MailboxClassificationVerificationReport["degradedCases"]
): VerificationCheck[] {
  return [
    {
      code: "classification_coverage",
      status:
        coverage.pendingClassificationMessages === 0
          ? VerificationCheckStatus.Pass
          : coverage.classifiedMessages === 0
            ? VerificationCheckStatus.Fail
            : VerificationCheckStatus.Warn,
      detail:
        coverage.eligibleMessages === 0
          ? "No ingested messages are currently eligible for classification verification."
          : coverage.pendingClassificationMessages === 0
            ? "All ingested messages have a current-version classification result."
            : `${coverage.pendingClassificationMessages} ingested messages are still pending classification.`
    },
    {
      code: "message_type_presence",
      status:
        coverage.classifiedMessages === 0
          ? VerificationCheckStatus.Fail
          : coverage.messageTypeCounts.length === coverage.classifiedMessages
            ? VerificationCheckStatus.Pass
            : VerificationCheckStatus.Pass,
      detail:
        coverage.classifiedMessages === 0
          ? "No current classifications exist yet, so actionability and message-type coverage cannot be verified."
          : "Current classifications include explicit actionability and message-type values for every classified message."
    },
    {
      code: "high_risk_due_date_visibility",
      status:
        signals.highRiskMessages === 0
          ? VerificationCheckStatus.Pass
          : degradedCases.highRiskMissingDueDateMessageIds.length === 0
            ? VerificationCheckStatus.Pass
            : degradedCases.highRiskMissingDueDateMessageIds.length === signals.highRiskMessages
              ? VerificationCheckStatus.Fail
              : VerificationCheckStatus.Warn,
      detail:
        signals.highRiskMessages === 0
          ? "No high-risk notice or invoice messages are currently in the classified sample."
          : degradedCases.highRiskMissingDueDateMessageIds.length === 0
            ? "High-risk messages keep due-date visibility where the current classification rules expect it."
            : `${degradedCases.highRiskMissingDueDateMessageIds.length} high-risk messages are missing due-date signals and should be reviewed before Epic 5 depends on them.`
    },
    {
      code: "criticality_signal_presence",
      status:
        coverage.classifiedMessages === 0
          ? VerificationCheckStatus.Fail
          : signals.messagesWithCriticality === coverage.classifiedMessages
            ? VerificationCheckStatus.Pass
            : VerificationCheckStatus.Warn,
      detail:
        coverage.classifiedMessages === 0
          ? "No current classifications exist yet, so criticality output cannot be verified."
          : signals.messagesWithCriticality === coverage.classifiedMessages
            ? "Every classified message carries an explicit criticality signal."
            : `${coverage.classifiedMessages - signals.messagesWithCriticality} classified messages are missing criticality output.`
    },
    {
      code: "low_confidence_visibility",
      status:
        coverage.classifiedMessages === 0
          ? VerificationCheckStatus.Fail
          : confidence.lowConfidenceMessages === 0
            ? VerificationCheckStatus.Pass
            : VerificationCheckStatus.Warn,
      detail:
        coverage.classifiedMessages === 0
          ? "No current classifications exist yet, so low-confidence handling cannot be verified."
          : confidence.lowConfidenceMessages === 0
            ? "No current messages are classified as low confidence."
            : `${confidence.lowConfidenceMessages} classified messages remain explicitly visible as low confidence or ambiguous.`
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

function mapMessageTypeCounts(classifications: MessageClassificationVerificationRecord[]) {
  const counts = new Map<MessageType, number>();

  for (const classification of classifications) {
    const messageType = fromDatabaseMessageType(classification.messageType);
    counts.set(messageType, (counts.get(messageType) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(
      ([messageType, count]): ClassificationVerificationCountByMessageType => ({
        messageType,
        count
      })
    );
}

function fromDatabaseMessageType(value: MessageClassificationVerificationRecord["messageType"]) {
  switch (value) {
    case "CONTRACT":
      return MessageType.Contract;
    case "NOTICE":
      return MessageType.Notice;
    case "LETTER":
      return MessageType.Letter;
    case "POLICY":
      return MessageType.Policy;
    case "COMMITTEE":
      return MessageType.Committee;
    case "EVENT":
      return MessageType.Event;
    case "INVOICE":
      return MessageType.Invoice;
    case "INTERNAL":
      return MessageType.Internal;
    case "FYI":
      return MessageType.Fyi;
    default:
      return assertNever(value);
  }
}

function isHighRiskMessageType(messageType: MessageClassificationVerificationRecord["messageType"]) {
  return messageType === "INVOICE" || messageType === "NOTICE";
}

async function getOwnedMailbox(
  prisma: PrismaClient,
  input: {
    session: SessionView;
    mailboxId: string;
  }
) {
  const mailbox = (await prisma.mailbox.findFirst({
    where: {
      id: input.mailboxId,
      tenantId: input.session.principal.tenantId
    },
    include: {
      connection: true
    }
  })) as MailboxOwnershipRecord | null;

  if (!mailbox) {
    throw new AppError("MAILBOX_NOT_FOUND", "Mailbox not found.", {
      statusCode: 404
    });
  }

  if (!mailbox.connection || mailbox.connection.userId !== input.session.principal.userId) {
    throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
      statusCode: 403
    });
  }

  return mailbox;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
