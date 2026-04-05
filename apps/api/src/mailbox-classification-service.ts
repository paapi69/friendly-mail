import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ClassificationReasonCode,
  ExtractionStatus,
  MessageActionability,
  MessagePriority,
  MessageType,
  type MessageClassificationReadModel,
  type MessageClassificationResult,
  type MessageWorkflowSignals,
  type SessionView,
  type WorkflowSignalProvenance,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  WorkflowCriticalityLevel
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertMessageClassification
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { type MailboxMessageProcessingService } from "./mailbox-message-processing-service";

type ClassifyMessageInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type GetMessageClassificationReadModelInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type ClassificationProcessingStatus = "processed" | "already_current";
type ClassificationStatus = "classified" | "already_current";

export type MailboxClassificationArtifact = {
  artifactId: string;
  artifactKind: "attachment_text" | "attachment_ocr";
  storageKey: string;
  contentHash?: string;
  confidenceScore?: number;
  textLength?: number;
  text: string;
};

export type MailboxClassificationAttachment = {
  attachmentId: string;
  graphAttachmentId: string;
  name: string;
  contentType?: string;
  isInline: boolean;
  attachmentKind: "file" | "item" | "reference";
  isExtractionCandidate: boolean;
  extractionDecisionReason?: string;
  extractionStatus: ExtractionStatus;
  artifacts: MailboxClassificationArtifact[];
};

export type MailboxClassificationJob = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  ingestionVersionKey: string;
  subject: string;
  fromAddress?: string;
  receivedAt?: string;
  bodyPreview?: string;
  bodyText?: string;
  uniqueBodyText?: string;
  attachments: MailboxClassificationAttachment[];
};

export type MailboxClassificationComputation = Pick<
  MessageClassificationResult,
  "actionability" | "messageType" | "confidenceScore" | "explanation" | "signals"
>;

export type MailboxClassificationPath = {
  classifierVersion: string;
  classifyMessage(input: MailboxClassificationJob): Promise<MailboxClassificationComputation>;
};

export type ClassifyMessageResult = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  ingestionVersionKey: string;
  idempotencyKey: string;
  classifierVersion: string;
  processingStatus: ClassificationProcessingStatus;
  classificationStatus: ClassificationStatus;
  classifiedAt: string;
  result: MessageClassificationResult;
};

export type MailboxClassificationService = {
  classifyMessage(input: ClassifyMessageInput): Promise<ClassifyMessageResult>;
  getMessageClassificationReadModel(
    input: GetMessageClassificationReadModelInput
  ): Promise<MessageClassificationReadModel>;
};

export type CreatePrismaMailboxClassificationServiceInput = {
  prisma: PrismaClient;
  logger: Logger;
  mailboxMessageProcessingService: MailboxMessageProcessingService;
  classificationPath?: MailboxClassificationPath;
  readArtifactText?: (storageKey: string) => Promise<string>;
  now?: () => Date;
};

type ExistingClassificationRecord = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifierVersion: string;
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
    reasons: MessageClassificationResult["explanation"]["reasons"];
  };
  dueDatesJson: MessageWorkflowSignals["dueDates"];
  entitiesJson: MessageWorkflowSignals["entities"];
  taskCandidatesJson: MessageWorkflowSignals["taskCandidates"];
  urgencyLevel: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  urgencyConfidenceScore: number;
  urgencyRationale: string;
  urgencyReasonsJson: MessageWorkflowSignals["urgency"]["reasons"];
  criticalityLevel: "NORMAL" | "ELEVATED" | "CRITICAL";
  criticalityConfidenceScore: number;
  criticalityRationale: string;
  criticalityReasonsJson: MessageWorkflowSignals["criticality"]["reasons"];
  classifiedAt: Date;
};

type MessageRecord = {
  id: string;
  mailboxId: string;
  graphMessageId: string;
  tenantId?: string;
  subject: string;
  fromAddress: string | null;
  receivedAt: Date | null;
  bodyPreview: string | null;
  bodyText: string | null;
  uniqueBodyText: string | null;
  ingestionVersionKey: string | null;
};

type MessageAttachmentRecord = {
  id: string;
  graphAttachmentId: string;
  name: string;
  contentType: string | null;
  isInline: boolean;
  attachmentKind: "FILE" | "ITEM" | "REFERENCE";
  isExtractionCandidate: boolean;
  extractionDecisionReason: string | null;
  extractionStatus:
    | "NOT_ATTEMPTED"
    | "PENDING"
    | "COMPLETED"
    | "COMPLETED_WITH_OCR"
    | "UNSUPPORTED"
    | "FAILED";
};

type ExtractionArtifactRecord = {
  id: string;
  attachmentId: string;
  artifactKind: "ATTACHMENT_TEXT" | "ATTACHMENT_OCR";
  storageKey: string;
  contentHash: string | null;
  confidenceScore: number | null;
  textLength: number | null;
  sourceVersionKey: string;
  createdAt: Date;
};

type MailboxOwnershipRecord = {
  id: string;
  tenantId: string;
  connection: {
    userId: string;
  } | null;
};

type ClassificationReason = MessageClassificationResult["explanation"]["reasons"][number];

type ClassificationTextEvidence = {
  text: string;
  normalizedText: string;
  sourceKind: WorkflowSignalSourceKind;
  field: string;
  attachmentId?: string;
  artifactId?: string;
  isAttachment: boolean;
};

type ClassificationCueMatch = {
  phrase: string;
  evidence: ClassificationTextEvidence;
};

type MessageTypeRule = {
  messageType: MessageType;
  label: string;
  reasonCode: ClassificationReasonCode;
  actionableByDefault: boolean;
  keywordPhrases: string[];
  actionPhrases?: string[];
  informationalPhrases?: string[];
};

type MessageTypeEvaluation = {
  rule: MessageTypeRule;
  score: number;
  keywordMatches: ClassificationCueMatch[];
  actionMatches: ClassificationCueMatch[];
  informationalMatches: ClassificationCueMatch[];
  primaryMatch?: ClassificationCueMatch;
};

type ExtractedDueDateSignal = MessageWorkflowSignals["dueDates"][number];
type ExtractedEntitySignal = MessageWorkflowSignals["entities"][number];
type ExtractedTaskCandidateSignal = MessageWorkflowSignals["taskCandidates"][number];

const RULES_CLASSIFIER_VERSION = "rules-classifier:v1";
const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;
const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
] as const;
const NUMBER_WORDS = new Map<string, number>([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["fourteen", 14],
  ["thirty", 30]
]);

const MESSAGE_TYPE_RULES: MessageTypeRule[] = [
  {
    messageType: MessageType.Contract,
    label: "contract",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: true,
    keywordPhrases: ["contract", "agreement", "service agreement", "msa"],
    actionPhrases: ["sign", "signature", "review and sign", "execute"]
  },
  {
    messageType: MessageType.Notice,
    label: "notice",
    reasonCode: ClassificationReasonCode.NoticeCueDetected,
    actionableByDefault: true,
    keywordPhrases: ["notice", "formal notice", "hearing notice", "notice of hearing"],
    actionPhrases: ["response required", "respond", "within seven days"]
  },
  {
    messageType: MessageType.Letter,
    label: "letter",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: true,
    keywordPhrases: ["letter", "correspondence", "counsel"],
    actionPhrases: ["respond", "reply", "review the attached letter"]
  },
  {
    messageType: MessageType.Policy,
    label: "policy",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: false,
    keywordPhrases: ["policy", "guideline", "procedure", "handbook"],
    informationalPhrases: ["updated policy", "policy update"]
  },
  {
    messageType: MessageType.Committee,
    label: "committee",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: false,
    keywordPhrases: ["committee", "meeting minutes", "minutes", "agenda"],
    informationalPhrases: ["committee meeting", "minutes"]
  },
  {
    messageType: MessageType.Event,
    label: "event",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: true,
    keywordPhrases: ["event", "attendance", "register", "rsvp"],
    actionPhrases: ["please rsvp", "confirm your attendance", "register", "rsvp"]
  },
  {
    messageType: MessageType.Invoice,
    label: "invoice",
    reasonCode: ClassificationReasonCode.InvoiceCueDetected,
    actionableByDefault: true,
    keywordPhrases: ["invoice", "payment", "inv ", "billing", "remit"],
    actionPhrases: ["pay", "payment due", "remit payment", "due immediately"]
  },
  {
    messageType: MessageType.Internal,
    label: "internal update",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: false,
    keywordPhrases: ["internal", "team update", "leadership team", "company update"],
    informationalPhrases: ["awareness only", "internal update"]
  },
  {
    messageType: MessageType.Fyi,
    label: "FYI",
    reasonCode: ClassificationReasonCode.AmbiguousContent,
    actionableByDefault: false,
    keywordPhrases: ["fyi", "for your information", "summary", "for reference"],
    informationalPhrases: ["no action required", "summary only", "for awareness only"]
  }
];

const ACTION_REQUEST_PHRASES = [
  "please review",
  "review and sign",
  "sign",
  "signature",
  "respond",
  "response required",
  "reply",
  "pay",
  "payment due",
  "due immediately",
  "please rsvp",
  "rsvp",
  "register",
  "confirm your attendance"
];

const DEADLINE_CUE_PHRASES = [
  "by friday",
  "by thursday",
  "by monday",
  "by tuesday",
  "by wednesday",
  "within seven days",
  "due",
  "deadline"
];

const INFORMATIONAL_CUE_PHRASES = [
  "for your information",
  "fyi",
  "no action required",
  "for awareness only",
  "for reference",
  "summary only",
  "minutes"
];

export function createPrismaMailboxClassificationService(
  input: CreatePrismaMailboxClassificationServiceInput
): MailboxClassificationService {
  const classificationPath = input.classificationPath ?? createRulesBasedMailboxClassificationPath();
  const readArtifactText = input.readArtifactText ?? readStoredArtifactText;
  const now = input.now ?? (() => new Date());

  return {
    async classifyMessage(classifyInput) {
      const processing = await input.mailboxMessageProcessingService.processMessage(classifyInput);
      const existingClassification = (await input.prisma.messageClassification.findFirst({
        where: {
          messageId: classifyInput.messageId,
          ingestionVersionKey: processing.ingestionVersionKey,
          classifierVersion: classificationPath.classifierVersion
        }
      })) as ExistingClassificationRecord | null;

      if (existingClassification) {
        const result = mapStoredClassificationRecord(existingClassification);

        return {
          mailboxId: processing.mailboxId,
          messageId: processing.messageId,
          graphMessageId: processing.graphMessageId,
          ingestionVersionKey: processing.ingestionVersionKey,
          idempotencyKey: buildClassificationIdempotencyKey(
            processing.ingestionVersionKey,
            classificationPath.classifierVersion
          ),
          classifierVersion: classificationPath.classifierVersion,
          processingStatus: processing.processingStatus,
          classificationStatus: "already_current",
          classifiedAt: result.classifiedAt,
          result
        };
      }

      const message = (await input.prisma.message.findFirst({
        where: {
          id: classifyInput.messageId,
          mailboxId: classifyInput.mailboxId
        }
      })) as MessageRecord | null;

      if (!message) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      if (!message.ingestionVersionKey) {
        throw new AppError(
          "MAILBOX_MESSAGE_NOT_INGESTED",
          "Mailbox message must be ingested before classification can run.",
          {
            statusCode: 409
          }
        );
      }

      const attachments = (await input.prisma.messageAttachment.findMany({
        where: {
          mailboxId: classifyInput.mailboxId,
          messageId: classifyInput.messageId
        }
      })) as MessageAttachmentRecord[];
      const artifacts = (await input.prisma.extractionArtifact.findMany({
        where: {
          messageId: classifyInput.messageId,
          sourceVersionKey: processing.ingestionVersionKey
        },
        orderBy: {
          createdAt: "asc"
        }
      })) as ExtractionArtifactRecord[];

      const job = await buildClassificationJob({
        message,
        attachments,
        artifacts,
        readArtifactText
      });
      const classifiedAt = now();
      const computation = await classificationPath.classifyMessage(job);
      const result: MessageClassificationResult = {
        mailboxId: classifyInput.mailboxId,
        messageId: classifyInput.messageId,
        ingestionVersionKey: processing.ingestionVersionKey,
        classifiedAt: classifiedAt.toISOString(),
        classifierVersion: classificationPath.classifierVersion,
        actionability: computation.actionability,
        messageType: computation.messageType,
        confidenceScore: computation.confidenceScore,
        explanation: computation.explanation,
        signals: computation.signals
      };

      await upsertMessageClassification(
        {
          messageClassification: input.prisma.messageClassification
        },
        {
          mailboxId: result.mailboxId,
          messageId: result.messageId,
          ingestionVersionKey: result.ingestionVersionKey,
          classifierVersion: result.classifierVersion,
          classifiedAt,
          actionability: toDatabaseActionability(result.actionability),
          messageType: toDatabaseMessageType(result.messageType),
          confidenceScore: result.confidenceScore,
          explanation: {
            summary: result.explanation.summary,
            lowConfidence: result.explanation.lowConfidence,
            reasons: result.explanation.reasons.map(toDatabaseClassificationReason)
          },
          signals: {
            dueDates: result.signals.dueDates.map((dueDate) => ({
              ...dueDate,
              provenance: dueDate.provenance.map(toDatabaseProvenance)
            })),
            entities: result.signals.entities.map((entity) => ({
              ...entity,
              kind: toDatabaseEntityKind(entity.kind),
              provenance: entity.provenance.map(toDatabaseProvenance)
            })),
            taskCandidates: result.signals.taskCandidates.map((taskCandidate) => ({
              ...taskCandidate,
              provenance: taskCandidate.provenance.map(toDatabaseProvenance)
            })),
            urgency: {
              ...result.signals.urgency,
              level: toDatabasePriority(result.signals.urgency.level),
              reasons: result.signals.urgency.reasons.map(toDatabaseClassificationReason)
            },
            criticality: {
              ...result.signals.criticality,
              level: toDatabaseCriticality(result.signals.criticality.level),
              reasons: result.signals.criticality.reasons.map(toDatabaseClassificationReason)
            }
          }
        }
      );

      input.logger.info("Classified mailbox message through orchestration service", {
        mailboxId: result.mailboxId,
        messageId: result.messageId,
        graphMessageId: processing.graphMessageId,
        ingestionVersionKey: result.ingestionVersionKey,
        classifierVersion: result.classifierVersion,
        processingStatus: processing.processingStatus,
        classificationStatus: "classified"
      });

      return {
        mailboxId: result.mailboxId,
        messageId: result.messageId,
        graphMessageId: processing.graphMessageId,
        ingestionVersionKey: result.ingestionVersionKey,
        idempotencyKey: buildClassificationIdempotencyKey(
          result.ingestionVersionKey,
          result.classifierVersion
        ),
        classifierVersion: result.classifierVersion,
        processingStatus: processing.processingStatus,
        classificationStatus: "classified",
        classifiedAt: result.classifiedAt,
        result
      };
    },

    async getMessageClassificationReadModel(readModelInput) {
      await getOwnedMailbox(input.prisma, readModelInput);

      const message = (await input.prisma.message.findFirst({
        where: {
          id: readModelInput.messageId,
          mailboxId: readModelInput.mailboxId
        }
      })) as MessageRecord | null;

      if (!message) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      if (!message.ingestionVersionKey) {
        throw new AppError(
          "MAILBOX_CLASSIFICATION_NOT_FOUND",
          "Classification is not available until the message has been ingested and classified.",
          {
            statusCode: 404
          }
        );
      }

      const classification = (await input.prisma.messageClassification.findFirst({
        where: {
          mailboxId: readModelInput.mailboxId,
          messageId: readModelInput.messageId,
          ingestionVersionKey: message.ingestionVersionKey
        },
        orderBy: {
          classifiedAt: "desc"
        }
      })) as ExistingClassificationRecord | null;

      if (!classification) {
        throw new AppError(
          "MAILBOX_CLASSIFICATION_NOT_FOUND",
          "Stored classification output was not found for this message.",
          {
            statusCode: 404
          }
        );
      }

      const result = mapStoredClassificationRecord(classification);
      const readModel = buildMessageClassificationReadModel(result);

      input.logger.info("Loaded mailbox classification read model", {
        mailboxId: readModel.mailboxId,
        messageId: readModel.messageId,
        classifierVersion: readModel.classifierVersion,
        ingestionVersionKey: readModel.ingestionVersionKey
      });

      return readModel;
    }
  };
}

export function createRulesBasedMailboxClassificationPath(): MailboxClassificationPath {
  return {
    classifierVersion: RULES_CLASSIFIER_VERSION,
    async classifyMessage(input) {
      const evidence = collectClassificationTextEvidence(input);
      const evaluations = MESSAGE_TYPE_RULES.map((rule) => evaluateMessageType(rule, evidence));
      const bestEvaluation =
        evaluations
          .slice()
          .sort((left, right) => {
            if (right.score !== left.score) {
              return right.score - left.score;
            }

            return MESSAGE_TYPE_RULES.findIndex((rule) => rule.messageType === left.rule.messageType)
              - MESSAGE_TYPE_RULES.findIndex((rule) => rule.messageType === right.rule.messageType);
          })[0] ?? evaluateMessageType(MESSAGE_TYPE_RULES[MESSAGE_TYPE_RULES.length - 1]!, evidence);
      const lowSignal = bestEvaluation.score < 0.3;
      const actionCueMatches = findCueMatches(evidence, ACTION_REQUEST_PHRASES);
      const deadlineCueMatches = findCueMatches(evidence, DEADLINE_CUE_PHRASES);
      const informationalCueMatches = findCueMatches(evidence, INFORMATIONAL_CUE_PHRASES);
      const actionability = determineActionability(
        bestEvaluation,
        actionCueMatches,
        deadlineCueMatches,
        informationalCueMatches
      );
      const confidenceScore = lowSignal
        ? 0.42
        : computeClassificationConfidence(
            bestEvaluation,
            actionability,
            actionCueMatches,
            informationalCueMatches
          );
      const reasons = buildClassificationReasons({
        evaluation: bestEvaluation,
        actionability,
        actionCueMatches,
        deadlineCueMatches,
        informationalCueMatches,
        lowConfidence: lowSignal,
        fallbackProvenance: createBaselineProvenance(input)
      });
      const signals = buildWorkflowSignals({
        job: input,
        evidence,
        evaluation: bestEvaluation,
        actionability,
        actionCueMatches
      });

      return {
        actionability,
        messageType: lowSignal ? MessageType.Fyi : bestEvaluation.rule.messageType,
        confidenceScore,
        explanation: {
          summary: buildClassificationSummary({
            evaluation: bestEvaluation,
            actionability,
            lowConfidence: lowSignal
          }),
          lowConfidence: lowSignal,
          reasons
        },
        signals
      };
    }
  };
}

export function createBaselineMailboxClassificationPath(): MailboxClassificationPath {
  return {
    classifierVersion: "baseline-classifier:v1",
    async classifyMessage(input) {
      const provenance = createBaselineProvenance(input);
      const reason = {
        code: ClassificationReasonCode.LowConfidence,
        summary:
          "Friendly Mail stored a low-confidence baseline result so Epic 4 orchestration can persist one repeat-safe classification run before dedicated classifiers are implemented.",
        provenance
      };

      return {
        actionability: MessageActionability.Informational,
        messageType: MessageType.Fyi,
        confidenceScore: 0.2,
        explanation: {
          summary:
            "This is a low-confidence baseline classification result produced by the orchestration path before the dedicated Epic 4 classifiers are implemented.",
          lowConfidence: true,
          reasons: [reason]
        },
        signals: {
          dueDates: [],
          entities: [],
          taskCandidates: [],
          urgency: {
            level: MessagePriority.Normal,
            confidenceScore: 0.2,
            rationale:
              "Dedicated urgency scoring has not been implemented yet, so the orchestration baseline defaults to normal urgency.",
            reasons: [reason]
          },
          criticality: {
            level: WorkflowCriticalityLevel.Normal,
            confidenceScore: 0.2,
            rationale:
              "Dedicated criticality scoring has not been implemented yet, so the orchestration baseline defaults to normal criticality.",
            reasons: [reason]
          }
        }
      };
    }
  };
}

function collectClassificationTextEvidence(
  input: MailboxClassificationJob
): ClassificationTextEvidence[] {
  const evidence: ClassificationTextEvidence[] = [];
  const seen = new Set<string>();

  const pushEvidence = (
    text: string | undefined,
    config: Omit<ClassificationTextEvidence, "text" | "normalizedText">
  ) => {
    if (!text?.trim()) {
      return;
    }

    const normalizedText = normalizeClassificationText(text);
    if (!normalizedText) {
      return;
    }

    const key = `${config.sourceKind}:${config.field}:${config.attachmentId ?? ""}:${config.artifactId ?? ""}:${normalizedText}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    evidence.push({
      text,
      normalizedText,
      ...config
    });
  };

  pushEvidence(input.subject, {
    sourceKind: WorkflowSignalSourceKind.MessageMetadata,
    field: "subject",
    isAttachment: false
  });
  pushEvidence(input.bodyText, {
    sourceKind: WorkflowSignalSourceKind.BodyText,
    field: "bodyText",
    isAttachment: false
  });
  pushEvidence(input.uniqueBodyText, {
    sourceKind: WorkflowSignalSourceKind.UniqueBodyText,
    field: "uniqueBodyText",
    isAttachment: false
  });
  pushEvidence(input.bodyPreview, {
    sourceKind: WorkflowSignalSourceKind.MessageMetadata,
    field: "bodyPreview",
    isAttachment: false
  });

  for (const attachment of input.attachments) {
    for (const artifact of attachment.artifacts) {
      pushEvidence(artifact.text, {
        sourceKind:
          artifact.artifactKind === "attachment_ocr"
            ? WorkflowSignalSourceKind.AttachmentOcr
            : WorkflowSignalSourceKind.AttachmentText,
        field: "text",
        attachmentId: attachment.attachmentId,
        artifactId: artifact.artifactId,
        isAttachment: true
      });
    }
  }

  return evidence;
}

function evaluateMessageType(
  rule: MessageTypeRule,
  evidence: ClassificationTextEvidence[]
): MessageTypeEvaluation {
  const keywordMatches = findCueMatches(evidence, rule.keywordPhrases);
  const actionMatches = findCueMatches(evidence, rule.actionPhrases ?? []);
  const informationalMatches = findCueMatches(evidence, rule.informationalPhrases ?? []);
  const primaryMatch = pickPrimaryMatch([...keywordMatches, ...actionMatches, ...informationalMatches]);
  const attachmentBonus = primaryMatch?.evidence.isAttachment ? 0.08 : 0;
  const score = Math.min(
    1.2,
    keywordMatches.length * 0.34 +
      actionMatches.length * 0.22 +
      informationalMatches.length * 0.18 +
      attachmentBonus
  );

  return {
    rule,
    score,
    keywordMatches,
    actionMatches,
    informationalMatches,
    primaryMatch
  };
}

function determineActionability(
  evaluation: MessageTypeEvaluation,
  actionCueMatches: ClassificationCueMatch[],
  deadlineCueMatches: ClassificationCueMatch[],
  informationalCueMatches: ClassificationCueMatch[]
) {
  const hasActionCue = actionCueMatches.length > 0;
  const hasDeadlineCue = deadlineCueMatches.length > 0;
  const hasInformationalCue = informationalCueMatches.length > 0;
  const hasExplicitNoActionCue = informationalCueMatches.some((match) =>
    ["no action required", "for your information", "fyi"].includes(match.phrase)
  );

  if (hasExplicitNoActionCue && !hasActionCue) {
    return MessageActionability.Informational;
  }

  if (hasActionCue || hasDeadlineCue) {
    return MessageActionability.Actionable;
  }

  if (evaluation.rule.actionableByDefault && evaluation.score >= 0.34) {
    return MessageActionability.Actionable;
  }

  if (hasInformationalCue) {
    return MessageActionability.Informational;
  }

  return MessageActionability.Informational;
}

function computeClassificationConfidence(
  evaluation: MessageTypeEvaluation,
  actionability: MessageActionability,
  actionCueMatches: ClassificationCueMatch[],
  informationalCueMatches: ClassificationCueMatch[]
) {
  let confidenceScore = 0.58;

  if (evaluation.score >= 0.9) {
    confidenceScore = 0.91;
  } else if (evaluation.score >= 0.65) {
    confidenceScore = 0.83;
  } else if (evaluation.score >= 0.45) {
    confidenceScore = 0.73;
  } else if (evaluation.score >= 0.3) {
    confidenceScore = 0.64;
  }

  if (
    (actionability === MessageActionability.Actionable && actionCueMatches.length > 0) ||
    (actionability === MessageActionability.Informational && informationalCueMatches.length > 0)
  ) {
    confidenceScore += 0.04;
  }

  return Math.min(0.96, confidenceScore);
}

function buildClassificationReasons(input: {
  evaluation: MessageTypeEvaluation;
  actionability: MessageActionability;
  actionCueMatches: ClassificationCueMatch[];
  deadlineCueMatches: ClassificationCueMatch[];
  informationalCueMatches: ClassificationCueMatch[];
  lowConfidence: boolean;
  fallbackProvenance: WorkflowSignalProvenance[];
}) {
  const reasons: ClassificationReason[] = [];

  if (input.evaluation.score >= 0.3) {
    reasons.push({
      code: input.evaluation.rule.reasonCode,
      summary: `The message contains ${input.evaluation.rule.label.toLowerCase()} cues.`,
      provenance: input.evaluation.primaryMatch
        ? toReasonProvenance(input.evaluation.primaryMatch)
        : input.fallbackProvenance
    });
  } else {
    reasons.push({
      code: ClassificationReasonCode.AmbiguousContent,
      summary:
        "The message does not contain clear contract, notice, task, or document cues, so it is treated as FYI until richer extraction is available.",
      provenance: input.fallbackProvenance
    });
  }

  if (input.evaluation.primaryMatch?.evidence.isAttachment) {
    reasons.push({
      code: ClassificationReasonCode.AttachmentEvidenceUsed,
      summary: "Attachment text materially contributed to the classification result.",
      provenance: toReasonProvenance(input.evaluation.primaryMatch)
    });
  }

  if (
    input.actionability === MessageActionability.Actionable &&
    input.actionCueMatches.length > 0
  ) {
    reasons.push({
      code: ClassificationReasonCode.ActionRequested,
      summary: `The message asks the recipient to ${input.actionCueMatches[0]!.phrase}.`,
      provenance: toReasonProvenance(input.actionCueMatches[0]!)
    });
  }

  if (input.deadlineCueMatches.length > 0) {
    reasons.push({
      code: deadlineReasonCodeForEvaluation(input.evaluation),
      summary: `The message includes a deadline cue such as "${input.deadlineCueMatches[0]!.phrase}".`,
      provenance: toReasonProvenance(input.deadlineCueMatches[0]!)
    });
  }

  if (
    input.actionability === MessageActionability.Informational &&
    input.informationalCueMatches.length > 0
  ) {
    reasons.push({
      code: ClassificationReasonCode.AmbiguousContent,
      summary: `The message reads as informational because it uses "${input.informationalCueMatches[0]!.phrase}" language.`,
      provenance: toReasonProvenance(input.informationalCueMatches[0]!)
    });
  }

  if (input.lowConfidence) {
    reasons.push({
      code: ClassificationReasonCode.LowConfidence,
      summary:
        "Friendly Mail did not find enough clear workflow cues to classify this message with high confidence.",
      provenance: input.fallbackProvenance
    });
  }

  return reasons;
}

function deadlineReasonCodeForEvaluation(evaluation: MessageTypeEvaluation) {
  if (evaluation.rule.messageType === MessageType.Invoice) {
    return ClassificationReasonCode.DueDateDetected;
  }

  return ClassificationReasonCode.DeadlineCueDetected;
}

function buildClassificationSummary(input: {
  evaluation: MessageTypeEvaluation;
  actionability: MessageActionability;
  lowConfidence: boolean;
}) {
  if (input.lowConfidence) {
    return "Classified as informational FYI with low confidence because the message does not contain clear workflow or document cues.";
  }

  if (input.actionability === MessageActionability.Actionable) {
    return `Classified as actionable ${input.evaluation.rule.label.toLowerCase()} because the message requests follow-up or contains strong workflow cues.`;
  }

  return `Classified as informational ${input.evaluation.rule.label.toLowerCase()} because the message shares context without clearly requesting follow-up.`;
}

function buildWorkflowSignals(input: {
  job: MailboxClassificationJob;
  evidence: ClassificationTextEvidence[];
  evaluation: MessageTypeEvaluation;
  actionability: MessageActionability;
  actionCueMatches: ClassificationCueMatch[];
}): MessageClassificationResult["signals"] {
  const dueDates = extractDueDateSignals(input.job, input.evidence);
  const entities = extractEntitySignals(input.evidence, input.evaluation);
  const taskCandidates = extractTaskCandidateSignals({
    job: input.job,
    actionability: input.actionability,
    evaluation: input.evaluation,
    actionCueMatches: input.actionCueMatches,
    dueDates,
    entities
  });
  const urgency = scoreUrgencySignal({
    job: input.job,
    actionability: input.actionability,
    evaluation: input.evaluation,
    actionCueMatches: input.actionCueMatches,
    dueDates
  });
  const criticality = scoreCriticalitySignal({
    actionability: input.actionability,
    evaluation: input.evaluation,
    dueDates
  });

  return {
    dueDates,
    entities,
    taskCandidates,
    urgency,
    criticality
  };
}

function extractDueDateSignals(
  job: MailboxClassificationJob,
  evidence: ClassificationTextEvidence[]
): ExtractedDueDateSignal[] {
  const referenceDate = normalizeToUtcDate(job.receivedAt ? new Date(job.receivedAt) : new Date());
  const dueDates: ExtractedDueDateSignal[] = [];
  const seen = new Set<string>();

  const pushDueDate = (
    value: Date,
    rationale: string,
    source: ClassificationTextEvidence,
    confidenceScore: number
  ) => {
    const normalizedValue = normalizeToUtcDate(value).toISOString();
    const key = `${normalizedValue}:${source.sourceKind}:${source.attachmentId ?? ""}:${source.artifactId ?? ""}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    dueDates.push({
      id: `due-date-${dueDates.length + 1}`,
      label: "Requested due date",
      value: normalizedValue,
      confidenceScore,
      rationale,
      provenance: provenanceFromEvidence(source)
    });
  };

  for (const source of evidence) {
    for (const match of source.text.matchAll(
      /\b(?:by|before|on|due)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi
    )) {
      const weekdayName = match[1]?.toLowerCase();
      if (!weekdayName) {
        continue;
      }

      const weekday = WEEKDAY_NAMES.indexOf(weekdayName as (typeof WEEKDAY_NAMES)[number]);
      if (weekday < 0) {
        continue;
      }

      pushDueDate(
        resolveNextWeekday(referenceDate, weekday),
        `The message includes the relative due-date cue "${match[0]}".`,
        source,
        0.78
      );
    }

    for (const match of source.text.matchAll(
      /\bwithin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|thirty)\s+days?\b/gi
    )) {
      const token = match[1]?.toLowerCase();
      const days = token ? parseNumericToken(token) : undefined;
      if (!days) {
        continue;
      }

      pushDueDate(
        addUtcDays(referenceDate, days),
        `The message sets a response window of ${days} day${days === 1 ? "" : "s"}.`,
        source,
        0.82
      );
    }

    for (const match of source.text.matchAll(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/gi
    )) {
      const monthName = match[1]?.toLowerCase();
      const dayToken = match[2];
      if (!monthName || !dayToken) {
        continue;
      }

      const parsedDate = resolveMonthDayDate(referenceDate, monthName, Number(dayToken), match[3]);
      if (!parsedDate) {
        continue;
      }

      pushDueDate(
        parsedDate,
        `The message names an explicit date: "${match[0]}".`,
        source,
        0.9
      );
    }
  }

  return dueDates.sort((left, right) => left.value.localeCompare(right.value));
}

function extractEntitySignals(
  evidence: ClassificationTextEvidence[],
  evaluation: MessageTypeEvaluation
): ExtractedEntitySignal[] {
  const entities: ExtractedEntitySignal[] = [];
  const seen = new Set<string>();

  const pushEntity = (
    kind: WorkflowEntityKind,
    value: string,
    source: ClassificationTextEvidence,
    confidenceScore: number,
    rationale: string
  ) => {
    const normalizedValue = normalizeEntityValue(kind, value);
    const key = `${kind}:${normalizedValue}`;
    if (!normalizedValue || seen.has(key)) {
      return;
    }

    seen.add(key);
    entities.push({
      id: `entity-${entities.length + 1}`,
      kind,
      value,
      normalizedValue,
      confidenceScore,
      rationale,
      provenance: provenanceFromEvidence(source)
    });
  };

  for (const source of evidence) {
    for (const match of source.text.matchAll(/\bINV[- ]?\d+\b/gi)) {
      pushEntity(
        WorkflowEntityKind.Invoice,
        match[0].replace(/\s+/g, "-").toUpperCase(),
        source,
        0.91,
        "The message references a specific invoice identifier."
      );
    }

    for (const match of source.text.matchAll(
      /\b(?:[Vv]endor|[Ff]rom|[Cc]ounterparty)\s+([A-Z][A-ZA-Za-z0-9&.-]*(?:\s+[A-Z][A-ZA-Za-z0-9&.-]*){0,4})/g
    )) {
      const counterparty = match[1]?.trim();
      if (!counterparty) {
        continue;
      }

      pushEntity(
        WorkflowEntityKind.Counterparty,
        counterparty,
        source,
        0.72,
        "The message names an external counterparty."
      );
    }

    for (const match of source.text.matchAll(
      /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+Committee\b/g
    )) {
      const committeeName = `${match[1]} Committee`;
      pushEntity(
        WorkflowEntityKind.Committee,
        committeeName,
        source,
        0.82,
        "The message names a committee directly."
      );
    }

    for (const match of source.text.matchAll(
      /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(Summit|Conference|Forum|Workshop|Meeting)\b/g
    )) {
      const eventName = `${match[1]} ${match[2]}`;
      pushEntity(
        WorkflowEntityKind.Event,
        eventName,
        source,
        0.8,
        "The message names an event directly."
      );
    }

    for (const match of source.text.matchAll(/\b([A-Za-z]+)\s+policy\b/gi)) {
      const policyName = `${capitalizeWord(match[1])} policy`;
      pushEntity(
        WorkflowEntityKind.Policy,
        policyName,
        source,
        0.74,
        "The message references a named policy."
      );
    }

    for (const match of source.text.matchAll(
      /\b(board packet|service agreement|agreement|contract|letter|notice)\b/gi
    )) {
      pushEntity(
        WorkflowEntityKind.Document,
        match[0].toLowerCase(),
        source,
        0.68,
        "The message references a document artifact."
      );
    }
  }

  if (
    evaluation.rule.messageType === MessageType.Event &&
    !entities.some((entity) => entity.kind === WorkflowEntityKind.Event)
  ) {
    const fallbackEventSource = evidence.find((source) => source.field === "subject");
    if (fallbackEventSource) {
      pushEntity(
        WorkflowEntityKind.Event,
        toTitleCase(fallbackEventSource.text.replace(/\s+materials$/i, "")),
        fallbackEventSource,
        0.62,
        "The event name is inferred from the message subject."
      );
    }
  }

  return entities;
}

function scoreUrgencySignal(input: {
  job: MailboxClassificationJob;
  actionability: MessageActionability;
  evaluation: MessageTypeEvaluation;
  actionCueMatches: ClassificationCueMatch[];
  dueDates: ExtractedDueDateSignal[];
}): MessageWorkflowSignals["urgency"] {
  const referenceDate = normalizeToUtcDate(input.job.receivedAt ? new Date(input.job.receivedAt) : new Date());
  const nearestDueDate = input.dueDates[0];
  const daysUntilNearestDue = nearestDueDate
    ? diffUtcDays(referenceDate, new Date(nearestDueDate.value))
    : undefined;
  const reasons: ClassificationReason[] = [];
  let level = MessagePriority.Normal;
  let confidenceScore = 0.58;
  let rationale =
    "No deadline or escalation cue substantially raises urgency, so the message stays at normal urgency.";

  if (
    input.actionability === MessageActionability.Informational &&
    !nearestDueDate &&
    input.actionCueMatches.length === 0
  ) {
    level = MessagePriority.Low;
    confidenceScore = 0.78;
    rationale =
      "The message reads as informational and does not contain a deadline or action request, so it is low urgency.";
    reasons.push({
      code: ClassificationReasonCode.AmbiguousContent,
      summary: "No action request or due date elevates urgency for this informational message."
    });
  } else if (nearestDueDate && daysUntilNearestDue !== undefined && daysUntilNearestDue <= 3) {
    level = MessagePriority.High;
    confidenceScore = 0.84;
    rationale =
      "The message includes a near-term due date, so it should be surfaced quickly for attention.";
    reasons.push({
      code:
        input.evaluation.rule.messageType === MessageType.Invoice
          ? ClassificationReasonCode.DueDateDetected
          : ClassificationReasonCode.DeadlineCueDetected,
      summary: `A due date is close enough to raise urgency (${nearestDueDate.value}).`,
      provenance: nearestDueDate.provenance
    });
  } else if (
    input.evaluation.rule.messageType === MessageType.Notice &&
    (nearestDueDate || input.actionCueMatches.length > 0)
  ) {
    level = MessagePriority.High;
    confidenceScore = 0.82;
    rationale =
      "Formal notices with requested follow-up should be surfaced promptly even before task state exists.";
    reasons.push({
      code: ClassificationReasonCode.NoticeCueDetected,
      summary: "Notice language raises urgency because missing the requested follow-up is risky."
    });
  } else if (input.actionCueMatches.length > 0) {
    level = MessagePriority.Normal;
    confidenceScore = 0.68;
    rationale =
      "The message asks for follow-up, but the current cues do not justify urgent escalation yet.";
    reasons.push({
      code: ClassificationReasonCode.ActionRequested,
      summary: "The message contains an explicit action request."
    });
  }

  return {
    level,
    confidenceScore,
    rationale,
    reasons
  };
}

function scoreCriticalitySignal(input: {
  actionability: MessageActionability;
  evaluation: MessageTypeEvaluation;
  dueDates: ExtractedDueDateSignal[];
}): MessageWorkflowSignals["criticality"] {
  const nearestDueDate = input.dueDates[0];
  const reasons: ClassificationReason[] = [];
  let level = WorkflowCriticalityLevel.Normal;
  let confidenceScore = 0.56;
  let rationale =
    "The current cues do not suggest unusually severe consequences if this message is missed.";

  if (input.evaluation.rule.messageType === MessageType.Notice) {
    level = WorkflowCriticalityLevel.Critical;
    confidenceScore = 0.9;
    rationale =
      "Formal notice workflows are high risk because missing them can create significant legal or compliance consequences.";
    reasons.push({
      code: ClassificationReasonCode.NoticeCueDetected,
      summary: "Formal notice language makes the message high criticality.",
      provenance: input.evaluation.primaryMatch
        ? toReasonProvenance(input.evaluation.primaryMatch)
        : undefined
    });
    if (nearestDueDate) {
      reasons.push({
        code: ClassificationReasonCode.DeadlineCueDetected,
        summary: "The notice also includes a response window.",
        provenance: nearestDueDate.provenance
      });
    }
  } else if (input.evaluation.rule.messageType === MessageType.Invoice) {
    level = WorkflowCriticalityLevel.Elevated;
    confidenceScore = 0.82;
    rationale =
      "Invoice messages are elevated criticality because missing payment work can create finance or vendor consequences.";
    reasons.push({
      code: ClassificationReasonCode.InvoiceCueDetected,
      summary: "Invoice payment language makes the message more critical than routine mail.",
      provenance: input.evaluation.primaryMatch
        ? toReasonProvenance(input.evaluation.primaryMatch)
        : undefined
    });
    if (nearestDueDate) {
      reasons.push({
        code: ClassificationReasonCode.DueDateDetected,
        summary: "The invoice also includes a due date.",
        provenance: nearestDueDate.provenance
      });
    }
  } else if (
    input.actionability === MessageActionability.Actionable &&
    [MessageType.Contract, MessageType.Letter].includes(input.evaluation.rule.messageType)
  ) {
    level = WorkflowCriticalityLevel.Elevated;
    confidenceScore = 0.72;
    rationale =
      "The message requests substantive follow-up on a formal document, which carries elevated workflow risk.";
    reasons.push({
      code: ClassificationReasonCode.ActionRequested,
      summary: "Formal document follow-up raises criticality above routine correspondence."
    });
  } else {
    reasons.push({
      code: ClassificationReasonCode.AmbiguousContent,
      summary: "No high-risk notice, invoice, or formal escalation cue raises criticality."
    });
  }

  return {
    level,
    confidenceScore,
    rationale,
    reasons
  };
}

function extractTaskCandidateSignals(input: {
  job: MailboxClassificationJob;
  actionability: MessageActionability;
  evaluation: MessageTypeEvaluation;
  actionCueMatches: ClassificationCueMatch[];
  dueDates: ExtractedDueDateSignal[];
  entities: ExtractedEntitySignal[];
}): ExtractedTaskCandidateSignal[] {
  if (input.actionability !== MessageActionability.Actionable) {
    return [];
  }

  const dueAt = input.dueDates[0]?.value;
  const invoiceEntity = input.entities.find((entity) => entity.kind === WorkflowEntityKind.Invoice);
  const eventEntity = input.entities.find((entity) => entity.kind === WorkflowEntityKind.Event);
  const primaryActionCue =
    input.actionCueMatches.find(
      (match) => match.evidence.sourceKind !== WorkflowSignalSourceKind.MessageMetadata
    ) ?? input.actionCueMatches[0];
  const provenance = uniqueProvenance([
    ...(primaryActionCue ? toReasonProvenance(primaryActionCue) : []),
    ...(input.dueDates[0]?.provenance ?? [])
  ]);

  const createCandidate = (title: string, summary: string, rationale: string, confidenceScore = 0.78) => {
    return [
      {
        id: `task-candidate-1`,
        title,
        summary,
        dueAt,
        confidenceScore,
        rationale,
        provenance: provenance.length > 0 ? provenance : createBaselineProvenance(input.job)
      }
    ];
  };

  switch (input.evaluation.rule.messageType) {
    case MessageType.Invoice:
      return createCandidate(
        invoiceEntity ? `Pay invoice ${invoiceEntity.value}` : "Pay invoice",
        "Suggested from invoice payment language in the message.",
        primaryActionCue
          ? `The message is actionable because it asks the recipient to ${primaryActionCue.phrase}.`
          : "The message is actionable because it requests invoice payment.",
        0.84
      );
    case MessageType.Event:
      return createCandidate(
        eventEntity ? `RSVP to ${eventEntity.value}` : "RSVP to event",
        "Suggested from RSVP and attendance language in the message.",
        primaryActionCue
          ? `The message is actionable because it asks the recipient to ${primaryActionCue.phrase}.`
          : "The message is actionable because it requests an event response.",
        0.8
      );
    case MessageType.Contract:
      return createCandidate(
        "Review and sign contract",
        "Suggested from contract review and signature language.",
        "The message requests contract review or signature.",
        0.8
      );
    case MessageType.Notice:
      return createCandidate(
        "Respond to notice",
        "Suggested from formal notice language and response cues.",
        "The message contains formal notice language with a requested response window.",
        0.8
      );
    case MessageType.Letter:
      return createCandidate(
        "Respond to letter",
        "Suggested from letter review and reply language.",
        "The message requests follow-up on a letter.",
        0.76
      );
    default:
      return [];
  }
}

function findCueMatches(evidence: ClassificationTextEvidence[], phrases: string[]) {
  const matches: ClassificationCueMatch[] = [];
  const seen = new Set<string>();

  for (const source of evidence) {
    for (const phrase of phrases) {
      const normalizedPhrase = normalizeClassificationText(phrase);
      if (!normalizedPhrase || !source.normalizedText.includes(normalizedPhrase)) {
        continue;
      }

      const key = `${phrase}:${source.sourceKind}:${source.field}:${source.attachmentId ?? ""}:${source.artifactId ?? ""}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      matches.push({
        phrase,
        evidence: source
      });
    }
  }

  return matches;
}

function pickPrimaryMatch(matches: ClassificationCueMatch[]) {
  return (
    matches.find((match) => match.evidence.isAttachment) ??
    matches[0]
  );
}

function toReasonProvenance(match: ClassificationCueMatch): WorkflowSignalProvenance[] {
  return [
    {
      sourceKind: match.evidence.sourceKind,
      attachmentId: match.evidence.attachmentId,
      artifactId: match.evidence.artifactId,
      field: match.evidence.field
    }
  ];
}

function provenanceFromEvidence(evidence: ClassificationTextEvidence): WorkflowSignalProvenance[] {
  return [
    {
      sourceKind: evidence.sourceKind,
      attachmentId: evidence.attachmentId,
      artifactId: evidence.artifactId,
      field: evidence.field
    }
  ];
}

function uniqueProvenance(provenance: WorkflowSignalProvenance[]) {
  const seen = new Set<string>();

  return provenance.filter((item) => {
    const key = `${item.sourceKind}:${item.field ?? ""}:${item.attachmentId ?? ""}:${item.artifactId ?? ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeClassificationText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeEntityValue(kind: WorkflowEntityKind, value: string) {
  if (kind === WorkflowEntityKind.Invoice) {
    return value.toLowerCase().replace(/\s+/g, "-");
  }

  return normalizeClassificationText(value);
}

function normalizeToUtcDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days)
  );
}

function diffUtcDays(from: Date, to: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((normalizeToUtcDate(to).getTime() - normalizeToUtcDate(from).getTime()) / millisecondsPerDay);
}

function resolveNextWeekday(referenceDate: Date, weekday: number) {
  const currentWeekday = referenceDate.getUTCDay();
  let offset = (weekday - currentWeekday + 7) % 7;
  if (offset === 0) {
    offset = 7;
  }

  return addUtcDays(referenceDate, offset);
}

function parseNumericToken(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  return NUMBER_WORDS.get(value);
}

function resolveMonthDayDate(
  referenceDate: Date,
  monthName: string,
  day: number,
  explicitYear?: string
) {
  const monthIndex = MONTH_NAMES.indexOf(monthName as (typeof MONTH_NAMES)[number]);
  if (monthIndex < 0 || day < 1 || day > 31) {
    return undefined;
  }

  const year = explicitYear ? Number(explicitYear) : referenceDate.getUTCFullYear();
  const parsedDate = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  if (!explicitYear && parsedDate < referenceDate) {
    return new Date(Date.UTC(year + 1, monthIndex, day));
  }

  return parsedDate;
}

function capitalizeWord(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(" ");
}

async function buildClassificationJob(input: {
  message: MessageRecord;
  attachments: MessageAttachmentRecord[];
  artifacts: ExtractionArtifactRecord[];
  readArtifactText: (storageKey: string) => Promise<string>;
}): Promise<MailboxClassificationJob> {
  const artifactsByAttachmentId = new Map<string, ExtractionArtifactRecord[]>();

  for (const artifact of input.artifacts) {
    const current = artifactsByAttachmentId.get(artifact.attachmentId) ?? [];
    current.push(artifact);
    artifactsByAttachmentId.set(artifact.attachmentId, current);
  }

  const attachments: MailboxClassificationAttachment[] = [];
  for (const attachment of input.attachments) {
    const attachmentArtifacts = artifactsByAttachmentId.get(attachment.id) ?? [];
    const artifacts: MailboxClassificationArtifact[] = [];

    for (const artifact of attachmentArtifacts) {
      artifacts.push({
        artifactId: artifact.id,
        artifactKind: toContractArtifactKind(artifact.artifactKind),
        storageKey: artifact.storageKey,
        contentHash: artifact.contentHash ?? undefined,
        confidenceScore: artifact.confidenceScore ?? undefined,
        textLength: artifact.textLength ?? undefined,
        text: await input.readArtifactText(artifact.storageKey)
      });
    }

    attachments.push({
      attachmentId: attachment.id,
      graphAttachmentId: attachment.graphAttachmentId,
      name: attachment.name,
      contentType: attachment.contentType ?? undefined,
      isInline: attachment.isInline,
      attachmentKind: toContractAttachmentKind(attachment.attachmentKind),
      isExtractionCandidate: attachment.isExtractionCandidate,
      extractionDecisionReason: attachment.extractionDecisionReason ?? undefined,
      extractionStatus: toContractExtractionStatus(attachment.extractionStatus),
      artifacts
    });
  }

  return {
    mailboxId: input.message.mailboxId,
    messageId: input.message.id,
    graphMessageId: input.message.graphMessageId,
    ingestionVersionKey: input.message.ingestionVersionKey ?? "",
    subject: input.message.subject,
    fromAddress: input.message.fromAddress ?? undefined,
    receivedAt: input.message.receivedAt?.toISOString(),
    bodyPreview: input.message.bodyPreview ?? undefined,
    bodyText: input.message.bodyText ?? undefined,
    uniqueBodyText: input.message.uniqueBodyText ?? undefined,
    attachments
  };
}

function mapStoredClassificationRecord(
  record: ExistingClassificationRecord
): MessageClassificationResult {
  return {
    mailboxId: record.mailboxId,
    messageId: record.messageId,
    ingestionVersionKey: record.ingestionVersionKey,
    classifiedAt: record.classifiedAt.toISOString(),
    classifierVersion: record.classifierVersion,
    actionability: fromDatabaseActionability(record.actionability),
    messageType: fromDatabaseMessageType(record.messageType),
    confidenceScore: record.confidenceScore,
    explanation: record.explanationJson,
    signals: {
      dueDates: record.dueDatesJson,
      entities: record.entitiesJson,
      taskCandidates: record.taskCandidatesJson,
      urgency: {
        level: fromDatabasePriority(record.urgencyLevel),
        confidenceScore: record.urgencyConfidenceScore,
        rationale: record.urgencyRationale,
        reasons: record.urgencyReasonsJson
      },
      criticality: {
        level: fromDatabaseCriticality(record.criticalityLevel),
        confidenceScore: record.criticalityConfidenceScore,
        rationale: record.criticalityRationale,
        reasons: record.criticalityReasonsJson
      }
    }
  };
}

export function buildMessageClassificationReadModel(
  classification: MessageClassificationResult
): MessageClassificationReadModel {
  return {
    mailboxId: classification.mailboxId,
    messageId: classification.messageId,
    ingestionVersionKey: classification.ingestionVersionKey,
    classifiedAt: classification.classifiedAt,
    classifierVersion: classification.classifierVersion,
    actionability: classification.actionability,
    messageType: classification.messageType,
    confidence: {
      overall: {
        score: classification.confidenceScore,
        band: toConfidenceBand(classification.confidenceScore),
        lowConfidence: classification.explanation.lowConfidence
      },
      signals: {
        dueDates: {
          count: classification.signals.dueDates.length,
          maxScore: maxConfidenceScore(classification.signals.dueDates)
        },
        entities: {
          count: classification.signals.entities.length,
          maxScore: maxConfidenceScore(classification.signals.entities)
        },
        taskCandidates: {
          count: classification.signals.taskCandidates.length,
          maxScore: maxConfidenceScore(classification.signals.taskCandidates)
        },
        urgency: {
          score: classification.signals.urgency.confidenceScore,
          band: toConfidenceBand(classification.signals.urgency.confidenceScore),
          level: classification.signals.urgency.level
        },
        criticality: {
          score: classification.signals.criticality.confidenceScore,
          band: toConfidenceBand(classification.signals.criticality.confidenceScore),
          level: classification.signals.criticality.level
        }
      }
    },
    explanation: {
      summary: classification.explanation.summary,
      lowConfidence: classification.explanation.lowConfidence,
      reasons: classification.explanation.reasons.map(toReadModelReason),
      urgency: {
        level: classification.signals.urgency.level,
        rationale: classification.signals.urgency.rationale,
        reasons: classification.signals.urgency.reasons.map(toReadModelReason)
      },
      criticality: {
        level: classification.signals.criticality.level,
        rationale: classification.signals.criticality.rationale,
        reasons: classification.signals.criticality.reasons.map(toReadModelReason)
      }
    },
    signals: {
      summary: {
        dueDateCount: classification.signals.dueDates.length,
        entityCount: classification.signals.entities.length,
        taskCandidateCount: classification.signals.taskCandidates.length,
        nextDueDate: classification.signals.dueDates
          .slice()
          .sort((left, right) => left.value.localeCompare(right.value))[0]
          ? {
              id: classification.signals.dueDates
                .slice()
                .sort((left, right) => left.value.localeCompare(right.value))[0]!.id,
              label: classification.signals.dueDates
                .slice()
                .sort((left, right) => left.value.localeCompare(right.value))[0]!.label,
              value: classification.signals.dueDates
                .slice()
                .sort((left, right) => left.value.localeCompare(right.value))[0]!.value,
              confidenceScore: classification.signals.dueDates
                .slice()
                .sort((left, right) => left.value.localeCompare(right.value))[0]!.confidenceScore
            }
          : undefined,
        topEntities: classification.signals.entities
          .slice()
          .sort((left, right) => right.confidenceScore - left.confidenceScore)
          .slice(0, 3)
          .map((entity) => ({
            id: entity.id,
            kind: entity.kind,
            value: entity.value,
            normalizedValue: entity.normalizedValue,
            confidenceScore: entity.confidenceScore
          })),
        topTaskCandidates: classification.signals.taskCandidates
          .slice()
          .sort((left, right) => right.confidenceScore - left.confidenceScore)
          .slice(0, 3)
          .map((taskCandidate) => ({
            id: taskCandidate.id,
            title: taskCandidate.title,
            dueAt: taskCandidate.dueAt,
            confidenceScore: taskCandidate.confidenceScore
          }))
      },
      dueDates: classification.signals.dueDates,
      entities: classification.signals.entities,
      taskCandidates: classification.signals.taskCandidates
    }
  };
}

async function readStoredArtifactText(storageKey: string) {
  try {
    return await readFile(path.resolve(process.cwd(), storageKey), "utf8");
  } catch (error) {
    throw new AppError(
      "CLASSIFICATION_ARTIFACT_READ_FAILED",
      "Stored extraction artifact text could not be read for classification.",
      {
        statusCode: 500,
        cause: error
      }
    );
  }
}

function createBaselineProvenance(input: MailboxClassificationJob): WorkflowSignalProvenance[] {
  if (input.bodyText) {
    return [
      {
        sourceKind: WorkflowSignalSourceKind.BodyText,
        field: "bodyText"
      }
    ];
  }

  const firstArtifact = input.attachments.flatMap((attachment) =>
    attachment.artifacts.map((artifact) => ({
      attachmentId: attachment.attachmentId,
      artifact
    }))
  )[0];

  if (firstArtifact) {
    return [
      {
        sourceKind:
          firstArtifact.artifact.artifactKind === "attachment_ocr"
            ? WorkflowSignalSourceKind.AttachmentOcr
            : WorkflowSignalSourceKind.AttachmentText,
        attachmentId: firstArtifact.attachmentId,
        artifactId: firstArtifact.artifact.artifactId,
        field: "text"
      }
    ];
  }

  return [
    {
      sourceKind: WorkflowSignalSourceKind.MessageMetadata,
      field: "subject"
    }
  ];
}

function buildClassificationIdempotencyKey(ingestionVersionKey: string, classifierVersion: string) {
  return `${ingestionVersionKey}:${classifierVersion}`;
}

function toContractAttachmentKind(kind: MessageAttachmentRecord["attachmentKind"]) {
  switch (kind) {
    case "FILE":
      return "file";
    case "ITEM":
      return "item";
    case "REFERENCE":
      return "reference";
    default:
      return assertNever(kind);
  }
}

function toContractExtractionStatus(status: MessageAttachmentRecord["extractionStatus"]) {
  switch (status) {
    case "NOT_ATTEMPTED":
      return ExtractionStatus.NotAttempted;
    case "PENDING":
      return ExtractionStatus.Pending;
    case "COMPLETED":
      return ExtractionStatus.Completed;
    case "COMPLETED_WITH_OCR":
      return ExtractionStatus.CompletedWithOcr;
    case "UNSUPPORTED":
      return ExtractionStatus.Unsupported;
    case "FAILED":
      return ExtractionStatus.Failed;
    default:
      return assertNever(status);
  }
}

function toContractArtifactKind(kind: ExtractionArtifactRecord["artifactKind"]) {
  switch (kind) {
    case "ATTACHMENT_TEXT":
      return "attachment_text";
    case "ATTACHMENT_OCR":
      return "attachment_ocr";
    default:
      return assertNever(kind);
  }
}

function toDatabaseActionability(value: MessageActionability) {
  switch (value) {
    case MessageActionability.Actionable:
      return "ACTIONABLE" as const;
    case MessageActionability.Informational:
      return "INFORMATIONAL" as const;
    default:
      return assertNever(value);
  }
}

function fromDatabaseActionability(value: ExistingClassificationRecord["actionability"]) {
  switch (value) {
    case "ACTIONABLE":
      return MessageActionability.Actionable;
    case "INFORMATIONAL":
      return MessageActionability.Informational;
    default:
      return assertNever(value);
  }
}

function toDatabaseMessageType(value: MessageType) {
  switch (value) {
    case MessageType.Contract:
      return "CONTRACT" as const;
    case MessageType.Notice:
      return "NOTICE" as const;
    case MessageType.Letter:
      return "LETTER" as const;
    case MessageType.Policy:
      return "POLICY" as const;
    case MessageType.Committee:
      return "COMMITTEE" as const;
    case MessageType.Event:
      return "EVENT" as const;
    case MessageType.Invoice:
      return "INVOICE" as const;
    case MessageType.Internal:
      return "INTERNAL" as const;
    case MessageType.Fyi:
      return "FYI" as const;
    default:
      return assertNever(value);
  }
}

function fromDatabaseMessageType(value: ExistingClassificationRecord["messageType"]) {
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

function toDatabasePriority(value: MessagePriority) {
  switch (value) {
    case MessagePriority.Low:
      return "LOW" as const;
    case MessagePriority.Normal:
      return "NORMAL" as const;
    case MessagePriority.High:
      return "HIGH" as const;
    case MessagePriority.Critical:
      return "CRITICAL" as const;
    default:
      return assertNever(value);
  }
}

function fromDatabasePriority(value: ExistingClassificationRecord["urgencyLevel"]) {
  switch (value) {
    case "LOW":
      return MessagePriority.Low;
    case "NORMAL":
      return MessagePriority.Normal;
    case "HIGH":
      return MessagePriority.High;
    case "CRITICAL":
      return MessagePriority.Critical;
    default:
      return assertNever(value);
  }
}

function toDatabaseCriticality(value: WorkflowCriticalityLevel) {
  switch (value) {
    case WorkflowCriticalityLevel.Normal:
      return "NORMAL" as const;
    case WorkflowCriticalityLevel.Elevated:
      return "ELEVATED" as const;
    case WorkflowCriticalityLevel.Critical:
      return "CRITICAL" as const;
    default:
      return assertNever(value);
  }
}

function fromDatabaseCriticality(value: ExistingClassificationRecord["criticalityLevel"]) {
  switch (value) {
    case "NORMAL":
      return WorkflowCriticalityLevel.Normal;
    case "ELEVATED":
      return WorkflowCriticalityLevel.Elevated;
    case "CRITICAL":
      return WorkflowCriticalityLevel.Critical;
    default:
      return assertNever(value);
  }
}

function toDatabaseClassificationReason(
  reason: MessageClassificationResult["explanation"]["reasons"][number]
) {
  return {
    ...reason,
    code: toDatabaseReasonCode(reason.code),
    provenance: reason.provenance?.map(toDatabaseProvenance)
  };
}

function toReadModelReason(
  reason: MessageClassificationResult["explanation"]["reasons"][number]
): MessageClassificationReadModel["explanation"]["reasons"][number] {
  return {
    code: reason.code,
    summary: reason.summary,
    provenance: summarizeProvenance(reason.provenance ?? [])
  };
}

function summarizeProvenance(provenance: WorkflowSignalProvenance[]) {
  const sourceKinds = new Set<WorkflowSignalSourceKind>();
  const attachmentIds = new Set<string>();
  const artifactIds = new Set<string>();
  const fields = new Set<string>();

  for (const item of provenance) {
    sourceKinds.add(item.sourceKind);
    if (item.attachmentId) {
      attachmentIds.add(item.attachmentId);
    }
    if (item.artifactId) {
      artifactIds.add(item.artifactId);
    }
    if (item.field) {
      fields.add(item.field);
    }
  }

  return {
    sourceKinds: [...sourceKinds],
    attachmentIds: [...attachmentIds],
    artifactIds: [...artifactIds],
    fields: [...fields]
  };
}

function maxConfidenceScore(items: Array<{ confidenceScore: number }>) {
  if (items.length === 0) {
    return undefined;
  }

  return Math.max(...items.map((item) => item.confidenceScore));
}

function toConfidenceBand(score: number) {
  if (score >= 0.75) {
    return "high" as const;
  }

  if (score >= 0.5) {
    return "medium" as const;
  }

  return "low" as const;
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

function toDatabaseReasonCode(value: ClassificationReasonCode) {
  switch (value) {
    case ClassificationReasonCode.ActionRequested:
      return "ACTION_REQUESTED" as const;
    case ClassificationReasonCode.DueDateDetected:
      return "DUE_DATE_DETECTED" as const;
    case ClassificationReasonCode.DeadlineCueDetected:
      return "DEADLINE_CUE_DETECTED" as const;
    case ClassificationReasonCode.InvoiceCueDetected:
      return "INVOICE_CUE_DETECTED" as const;
    case ClassificationReasonCode.NoticeCueDetected:
      return "NOTICE_CUE_DETECTED" as const;
    case ClassificationReasonCode.CounterpartyDetected:
      return "COUNTERPARTY_DETECTED" as const;
    case ClassificationReasonCode.AttachmentEvidenceUsed:
      return "ATTACHMENT_EVIDENCE_USED" as const;
    case ClassificationReasonCode.LowConfidence:
      return "LOW_CONFIDENCE" as const;
    case ClassificationReasonCode.AmbiguousContent:
      return "AMBIGUOUS_CONTENT" as const;
    default:
      return assertNever(value);
  }
}

function toDatabaseProvenance(provenance: WorkflowSignalProvenance) {
  return {
    ...provenance,
    sourceKind: toDatabaseSourceKind(provenance.sourceKind)
  };
}

function toDatabaseSourceKind(value: WorkflowSignalSourceKind) {
  switch (value) {
    case WorkflowSignalSourceKind.MessageMetadata:
      return "MESSAGE_METADATA" as const;
    case WorkflowSignalSourceKind.BodyText:
      return "BODY_TEXT" as const;
    case WorkflowSignalSourceKind.UniqueBodyText:
      return "UNIQUE_BODY_TEXT" as const;
    case WorkflowSignalSourceKind.AttachmentText:
      return "ATTACHMENT_TEXT" as const;
    case WorkflowSignalSourceKind.AttachmentOcr:
      return "ATTACHMENT_OCR" as const;
    default:
      return assertNever(value);
  }
}

function toDatabaseEntityKind(
  value: MessageWorkflowSignals["entities"][number]["kind"]
) {
  switch (value) {
    case WorkflowEntityKind.Counterparty:
      return "COUNTERPARTY" as const;
    case WorkflowEntityKind.Committee:
      return "COMMITTEE" as const;
    case WorkflowEntityKind.Event:
      return "EVENT" as const;
    case WorkflowEntityKind.Invoice:
      return "INVOICE" as const;
    case WorkflowEntityKind.Person:
      return "PERSON" as const;
    case WorkflowEntityKind.Organization:
      return "ORGANIZATION" as const;
    case WorkflowEntityKind.Policy:
      return "POLICY" as const;
    case WorkflowEntityKind.Document:
      return "DOCUMENT" as const;
    default:
      return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
