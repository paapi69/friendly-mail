import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { type FetchLike, createGraphConnector } from "@friendly-mail/graph";
import {
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertAttachmentExtractionArtifact,
  upsertMessageAttachment
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxPdfExtractionEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
  OCR_PROVIDER?: "disabled" | "tesseract";
  OCR_LANGUAGE?: string;
  OCR_CONFIDENCE_THRESHOLD?: number;
};

type ExtractPdfAttachmentsInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type CompletedPdfAttachmentExtraction = {
  attachmentId: string;
  graphAttachmentId: string;
  name: string;
  extractionStatus: "completed";
  storageKey: string;
  textLength: number;
  extractionAttempts: number;
};

type CompletedWithOcrPdfAttachmentExtraction = {
  attachmentId: string;
  graphAttachmentId: string;
  name: string;
  extractionStatus: "completed_with_ocr";
  ocrStorageKey: string;
  textLength: number;
  extractionAttempts: number;
  confidenceScore?: number;
  qualitySignal: OcrQualitySignal;
};

type FailedPdfAttachmentExtraction = {
  attachmentId: string;
  graphAttachmentId: string;
  name: string;
  extractionStatus: "failed";
  errorCode: string;
  extractionAttempts: number;
};

type SkippedPdfAttachmentExtraction = {
  attachmentId: string;
  graphAttachmentId: string;
  name: string;
  extractionStatus: "skipped";
  reason: "already_extracted_for_message_version";
  extractionAttempts: number;
};

type ExtractedPdfAttachment =
  | CompletedPdfAttachmentExtraction
  | CompletedWithOcrPdfAttachmentExtraction
  | FailedPdfAttachmentExtraction
  | SkippedPdfAttachmentExtraction;

type ExtractPdfAttachmentsResult = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  ingestionVersionKey: string;
  extractedCount: number;
  failedCount: number;
  skippedCount: number;
  extractedAt: string;
  attachments: ExtractedPdfAttachment[];
};

type ExtractedPdfText = {
  text: string;
  pageCount: number;
};

type OcrPdfText = {
  text: string;
  pageCount: number;
  confidenceScore?: number;
};

type OcrQualitySignal = "acceptable" | "low_confidence" | "unknown_confidence";

type StoredTextArtifact = {
  storageKey: string;
  contentHash?: string;
};

type MessageAttachmentRecord = {
  id: string;
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  graphAttachmentId: string;
  name: string;
  contentType: string | null;
  sizeInBytes: number;
  isInline: boolean;
  attachmentKind: "FILE";
  lastGraphModifiedAt: Date | null;
  isExtractionCandidate: boolean;
  extractionDecisionReason: string | null;
  extractionStatus: string;
  extractionAttempts: number;
  lastExtractionAt: Date | null;
  lastExtractionErrorCode: string | null;
};

type ExtractionArtifactRecord = {
  attachmentId: string;
  artifactKind: "ATTACHMENT_TEXT" | "ATTACHMENT_OCR";
  sourceVersionKey: string;
};

type ExtractTextFromPdf = (pdfBytes: Uint8Array) => Promise<ExtractedPdfText>;
type WriteTextArtifact = (input: {
  mailboxId: string;
  attachmentId: string;
  text: string;
  artifactFileName?: string;
}) => Promise<StoredTextArtifact>;
type RunOcrOnPdf = (pdfBytes: Uint8Array, options: { language: string }) => Promise<OcrPdfText>;

export type MailboxPdfExtractionService = {
  extractPdfAttachments(
    input: ExtractPdfAttachmentsInput
  ): Promise<ExtractPdfAttachmentsResult>;
};

export type CreatePrismaMailboxPdfExtractionServiceInput = {
  prisma: PrismaClient;
  env: MailboxPdfExtractionEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
  extractTextFromPdf?: ExtractTextFromPdf;
  writeTextArtifact?: WriteTextArtifact;
  runOcrOnPdf?: RunOcrOnPdf;
};

export function createPrismaMailboxPdfExtractionService(
  input: CreatePrismaMailboxPdfExtractionServiceInput
): MailboxPdfExtractionService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());
  const extractTextFromPdf = input.extractTextFromPdf ?? extractMachineReadablePdfText;
  const writeTextArtifact = input.writeTextArtifact ?? persistTextArtifact;
  const runOcrOnPdf = input.runOcrOnPdf ?? createDefaultRunOcrOnPdf(input.env);
  const ocrLanguage = input.env.OCR_LANGUAGE ?? "eng";
  const ocrConfidenceThreshold = input.env.OCR_CONFIDENCE_THRESHOLD ?? 0.75;

  return {
    async extractPdfAttachments(extractInput) {
      const extractedAt = now();
      const mailbox = await input.prisma.mailbox.findFirst({
        where: {
          id: extractInput.mailboxId,
          tenantId: extractInput.session.principal.tenantId
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

      if (
        !mailbox.connection ||
        mailbox.connection.userId !== extractInput.session.principal.userId
      ) {
        throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
          statusCode: 403
        });
      }

      if (mailbox.connection.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
        throw new AppError(
          "MAILBOX_CONNECTION_INACTIVE",
          "Mailbox connection is not active for PDF extraction.",
          {
            statusCode: 409
          }
        );
      }

      const message = await input.prisma.message.findFirst({
        where: {
          id: extractInput.messageId,
          mailboxId: mailbox.id
        }
      });

      if (!message) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      if (!message.ingestionVersionKey) {
        throw new AppError(
          "MAILBOX_MESSAGE_NOT_INGESTED",
          "Mailbox message must be ingested before PDF extraction can run.",
          {
            statusCode: 409
          }
        );
      }

      const candidateAttachments = (await input.prisma.messageAttachment.findMany({
        where: {
          mailboxId: mailbox.id,
          messageId: message.id,
          attachmentKind: "FILE",
          isExtractionCandidate: true
        }
      })) as MessageAttachmentRecord[];
      const currentVersionArtifacts =
        typeof input.prisma.extractionArtifact.findMany === "function"
          ? (await input.prisma.extractionArtifact.findMany({
              where: {
                attachmentId: {
                  in: candidateAttachments.map((attachment) => attachment.id)
                },
                sourceVersionKey: message.ingestionVersionKey
              }
            })) as ExtractionArtifactRecord[]
          : [];
      const currentArtifactsByAttachmentId = new Map<string, Set<ExtractionArtifactRecord["artifactKind"]>>();

      for (const artifact of currentVersionArtifacts) {
        const artifactKinds = currentArtifactsByAttachmentId.get(artifact.attachmentId) ?? new Set();
        artifactKinds.add(artifact.artifactKind);
        currentArtifactsByAttachmentId.set(artifact.attachmentId, artifactKinds);
      }

      if (candidateAttachments.length === 0) {
        return {
          mailboxId: mailbox.id,
          messageId: message.id,
          graphMessageId: message.graphMessageId,
          ingestionVersionKey: message.ingestionVersionKey,
          extractedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          extractedAt: extractedAt.toISOString(),
          attachments: []
        };
      }

      const accessToken = decryptMicrosoftToken(
        mailbox.connection.accessTokenCiphertext,
        input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
      );
      const graph = createGraphConnector({
        tokenProvider: async () => accessToken,
        fetch: fetchImpl,
        logger: input.logger.child({
          integration: "microsoft-graph",
          mailboxId: mailbox.id,
          messageId: message.id
        })
      });

      const attachments: ExtractedPdfAttachment[] = [];
      let extractedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const attachment of candidateAttachments) {
        if (shouldSkipAttachmentExtraction(attachment, currentArtifactsByAttachmentId.get(attachment.id))) {
          attachments.push({
            attachmentId: attachment.id,
            graphAttachmentId: attachment.graphAttachmentId,
            name: attachment.name,
            extractionStatus: "skipped",
            reason: "already_extracted_for_message_version",
            extractionAttempts: attachment.extractionAttempts
          });
          skippedCount += 1;
          continue;
        }

        const extractionAttempts = attachment.extractionAttempts + 1;

        try {
          const pdfBytes = await graph.downloadMessageAttachmentContent({
            messageId: message.graphMessageId,
            attachmentId: attachment.graphAttachmentId
          });
          const extraction = await extractTextFromPdf(pdfBytes);
          const normalizedText = normalizeExtractedText(extraction.text);

          if (normalizedText) {
            const textLength = measureExtractedTextLength(normalizedText);
            const artifact = await writeTextArtifact({
              mailboxId: mailbox.id,
              attachmentId: attachment.id,
              text: normalizedText
            });

            await upsertAttachmentExtractionArtifact(
              {
                extractionArtifact: input.prisma.extractionArtifact
              },
              {
                mailboxId: mailbox.id,
                messageId: message.id,
                attachmentId: attachment.id,
                artifactKind: "ATTACHMENT_TEXT",
                storageKey: artifact.storageKey,
                textLength,
                contentHash: artifact.contentHash ?? hashText(normalizedText),
                sourceVersionKey: message.ingestionVersionKey,
                createdAt: extractedAt
              }
            );

            await upsertMessageAttachment(
              {
                messageAttachment: input.prisma.messageAttachment
              },
              {
                mailboxId: mailbox.id,
                messageId: message.id,
                graphMessageId: message.graphMessageId,
                graphAttachmentId: attachment.graphAttachmentId,
                name: attachment.name,
                contentType: attachment.contentType ?? undefined,
                sizeInBytes: attachment.sizeInBytes,
                isInline: attachment.isInline,
                attachmentKind: attachment.attachmentKind,
                lastGraphModifiedAt: attachment.lastGraphModifiedAt ?? undefined,
                isExtractionCandidate: attachment.isExtractionCandidate,
                extractionDecisionReason: attachment.extractionDecisionReason ?? undefined,
                extractionStatus: "COMPLETED",
                extractionAttempts,
                lastExtractionAt: extractedAt
              }
            );

            attachments.push({
              attachmentId: attachment.id,
              graphAttachmentId: attachment.graphAttachmentId,
              name: attachment.name,
              extractionStatus: "completed",
              storageKey: artifact.storageKey,
              textLength,
              extractionAttempts
            });

            input.logger.info("Extracted PDF attachment text", {
              mailboxId: mailbox.id,
              messageId: message.id,
              attachmentId: attachment.id,
              graphAttachmentId: attachment.graphAttachmentId,
              pageCount: extraction.pageCount,
              textLength
            });
          } else {
            const ocrExtraction = await runOcrOnPdf(pdfBytes, {
              language: ocrLanguage
            });
            const normalizedOcrText = normalizeExtractedText(ocrExtraction.text);

            if (!normalizedOcrText) {
              throw new PdfExtractionError("OCR_TEXT_EMPTY");
            }

            const textLength = measureExtractedTextLength(normalizedOcrText);
            const qualitySignal = deriveOcrQualitySignal(
              ocrExtraction.confidenceScore,
              ocrConfidenceThreshold
            );
            const ocrArtifact = await writeTextArtifact({
              mailboxId: mailbox.id,
              attachmentId: attachment.id,
              text: normalizedOcrText,
              artifactFileName: "ocr.txt"
            });

            await upsertAttachmentExtractionArtifact(
              {
                extractionArtifact: input.prisma.extractionArtifact
              },
              {
                mailboxId: mailbox.id,
                messageId: message.id,
                attachmentId: attachment.id,
                artifactKind: "ATTACHMENT_OCR",
                storageKey: ocrArtifact.storageKey,
                textLength,
                contentHash: ocrArtifact.contentHash ?? hashText(normalizedOcrText),
                confidenceScore: ocrExtraction.confidenceScore,
                sourceVersionKey: message.ingestionVersionKey,
                createdAt: extractedAt
              }
            );

            await upsertMessageAttachment(
              {
                messageAttachment: input.prisma.messageAttachment
              },
              {
                mailboxId: mailbox.id,
                messageId: message.id,
                graphMessageId: message.graphMessageId,
                graphAttachmentId: attachment.graphAttachmentId,
                name: attachment.name,
                contentType: attachment.contentType ?? undefined,
                sizeInBytes: attachment.sizeInBytes,
                isInline: attachment.isInline,
                attachmentKind: attachment.attachmentKind,
                lastGraphModifiedAt: attachment.lastGraphModifiedAt ?? undefined,
                isExtractionCandidate: attachment.isExtractionCandidate,
                extractionDecisionReason: attachment.extractionDecisionReason ?? undefined,
                extractionStatus: "COMPLETED_WITH_OCR",
                extractionAttempts,
                lastExtractionAt: extractedAt
              }
            );

            attachments.push({
              attachmentId: attachment.id,
              graphAttachmentId: attachment.graphAttachmentId,
              name: attachment.name,
              extractionStatus: "completed_with_ocr",
              ocrStorageKey: ocrArtifact.storageKey,
              textLength,
              extractionAttempts,
              confidenceScore: ocrExtraction.confidenceScore,
              qualitySignal
            });

            input.logger.info("Extracted PDF attachment text via OCR fallback", {
              mailboxId: mailbox.id,
              messageId: message.id,
              attachmentId: attachment.id,
              graphAttachmentId: attachment.graphAttachmentId,
              pageCount: ocrExtraction.pageCount,
              textLength,
              confidenceScore: ocrExtraction.confidenceScore,
              qualitySignal
            });
          }

          extractedCount += 1;
        } catch (error) {
          const errorCode = getPdfExtractionErrorCode(error);

          await upsertMessageAttachment(
            {
              messageAttachment: input.prisma.messageAttachment
            },
            {
              mailboxId: mailbox.id,
              messageId: message.id,
              graphMessageId: message.graphMessageId,
              graphAttachmentId: attachment.graphAttachmentId,
              name: attachment.name,
              contentType: attachment.contentType ?? undefined,
              sizeInBytes: attachment.sizeInBytes,
              isInline: attachment.isInline,
              attachmentKind: attachment.attachmentKind,
              lastGraphModifiedAt: attachment.lastGraphModifiedAt ?? undefined,
              isExtractionCandidate: attachment.isExtractionCandidate,
              extractionDecisionReason: attachment.extractionDecisionReason ?? undefined,
              extractionStatus: "FAILED",
              extractionAttempts,
              lastExtractionAt: extractedAt,
              lastExtractionErrorCode: errorCode
            }
          );

          attachments.push({
            attachmentId: attachment.id,
            graphAttachmentId: attachment.graphAttachmentId,
            name: attachment.name,
            extractionStatus: "failed",
            errorCode,
            extractionAttempts
          });
          failedCount += 1;

          input.logger.warn("Failed PDF attachment extraction", {
            mailboxId: mailbox.id,
            messageId: message.id,
            attachmentId: attachment.id,
            graphAttachmentId: attachment.graphAttachmentId,
            errorCode,
            error
          });
        }
      }

      return {
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        ingestionVersionKey: message.ingestionVersionKey,
        extractedCount,
        failedCount,
        skippedCount,
        extractedAt: extractedAt.toISOString(),
        attachments
      };
    }
  };
}

async function extractMachineReadablePdfText(pdfBytes: Uint8Array): Promise<ExtractedPdfText> {
  const loadingTask = getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: false
  });

  try {
    const document = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .flatMap((item) => ("str" in item && typeof item.str === "string" ? [item.str] : []))
        .join(" ");
      const normalizedPageText = normalizeExtractedText(pageText);

      if (normalizedPageText) {
        pageTexts.push(normalizedPageText);
      }
    }

    return {
      text: pageTexts.join("\n\n"),
      pageCount: document.numPages
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function persistTextArtifact(input: {
  mailboxId: string;
  attachmentId: string;
  text: string;
  artifactFileName?: string;
}): Promise<StoredTextArtifact> {
  const storageKey = path.posix.join(
    "artifacts",
    input.mailboxId,
    input.attachmentId,
    input.artifactFileName ?? "text.txt"
  );
  const artifactPath = path.resolve(process.cwd(), storageKey);

  await mkdir(path.dirname(artifactPath), {
    recursive: true
  });
  await writeFile(artifactPath, input.text, "utf8");

  return {
    storageKey,
    contentHash: hashText(input.text)
  };
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function hashText(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function measureExtractedTextLength(text: string) {
  return text.replace(/\n/g, "").length;
}

function getPdfExtractionErrorCode(error: unknown) {
  if (error instanceof PdfExtractionError) {
    return error.code;
  }

  if (error instanceof AppError) {
    return error.code;
  }

  return "PDF_TEXT_EXTRACTION_FAILED";
}

function deriveOcrQualitySignal(
  confidenceScore: number | undefined,
  threshold: number
): OcrQualitySignal {
  if (typeof confidenceScore !== "number" || Number.isNaN(confidenceScore)) {
    return "unknown_confidence";
  }

  return confidenceScore >= threshold ? "acceptable" : "low_confidence";
}

function createDefaultRunOcrOnPdf(env: MailboxPdfExtractionEnv): RunOcrOnPdf {
  const provider = env.OCR_PROVIDER ?? "disabled";

  if (provider !== "tesseract") {
    return async () => {
      throw new PdfExtractionError("OCR_PROVIDER_UNAVAILABLE");
    };
  }

  return runTesseractOcrOnPdf;
}

async function runTesseractOcrOnPdf(
  pdfBytes: Uint8Array,
  options: { language: string }
): Promise<OcrPdfText> {
  const { createWorker } = await import("tesseract.js");
  const loadingTask = getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: false
  });

  try {
    const document = await loadingTask.promise;
    const worker = await createWorker(options.language);

    try {
      const pageTexts: string[] = [];
      const confidenceScores: number[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({
          scale: 2
        });
        const canvas = createCanvas(
          Math.max(1, Math.ceil(viewport.width)),
          Math.max(1, Math.ceil(viewport.height))
        );
        const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context,
          viewport
        }).promise;

        const result = await worker.recognize(canvas.toBuffer("image/png"));
        const pageText = normalizeExtractedText(result.data.text ?? "");

        if (pageText) {
          pageTexts.push(pageText);
        }

        if (typeof result.data.confidence === "number" && Number.isFinite(result.data.confidence)) {
          confidenceScores.push(clampConfidence(result.data.confidence / 100));
        }
      }

      return {
        text: pageTexts.join("\n\n"),
        pageCount: document.numPages,
        confidenceScore:
          confidenceScores.length > 0
            ? confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length
            : undefined
      };
    } catch (error) {
      throw new PdfExtractionError(
        error instanceof PdfExtractionError ? error.code : "OCR_TEXT_EXTRACTION_FAILED"
      );
    } finally {
      await worker.terminate();
    }
  } finally {
    await loadingTask.destroy();
  }
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

function shouldSkipAttachmentExtraction(
  attachment: MessageAttachmentRecord,
  artifactKinds: Set<ExtractionArtifactRecord["artifactKind"]> | undefined
) {
  if (!artifactKinds || artifactKinds.size === 0) {
    return false;
  }

  if (attachment.extractionStatus === "COMPLETED") {
    return artifactKinds.has("ATTACHMENT_TEXT");
  }

  if (attachment.extractionStatus === "COMPLETED_WITH_OCR") {
    return artifactKinds.has("ATTACHMENT_OCR");
  }

  return false;
}

class PdfExtractionError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PdfExtractionError";
  }
}
