import http from "node:http";
import {
  parseCookieHeader,
  readSessionTokenFromHeaders,
  serializeClearedSessionCookie,
  serializeSessionCookie
} from "@friendly-mail/auth";
import {
  MailSurface,
  MailboxActionMode,
  type TaskTransitionRequest,
  TaskStatus,
  TaskStatusReason,
  WorkflowStatus
} from "@friendly-mail/contracts";
import {
  AppError,
  createCorrelationId,
  type Logger,
  toErrorResponse
} from "@friendly-mail/observability";
import type { AuthService, LoginInput } from "./auth-service";
import type {
  MailboxOnboardingService
} from "./mailbox-onboarding-service";
import type { MailboxReadinessService } from "./mailbox-readiness-service";
import type { MailboxFolderSyncService } from "./mailbox-folder-sync-service";
import type { MailboxMessageSyncService } from "./mailbox-message-sync-service";
import type { MailboxIngestionService } from "./mailbox-ingestion-service";
import type { MailboxAttachmentMetadataService } from "./mailbox-attachment-metadata-service";
import type { MailboxClassificationService } from "./mailbox-classification-service";
import type { MailboxClassificationVerificationService } from "./mailbox-classification-verification-service";
import type { MailboxMessageProcessingService } from "./mailbox-message-processing-service";
import type { MailboxProcessingVerificationService } from "./mailbox-processing-verification-service";
import type { MailboxPdfExtractionService } from "./mailbox-pdf-extraction-service";
import type { MailboxTaskWorkflowService } from "./mailbox-task-workflow-service";
import type { MailboxActionService } from "./mailbox-action-service";
import type { MailboxSubscriptionService } from "./mailbox-subscription-service";

type ApiEnv = {
  NODE_ENV: "development" | "test" | "production";
  API_PORT: number;
  SESSION_COOKIE_NAME: string;
  SESSION_MAX_AGE_HOURS: number;
};

export type ApiAuthService = Pick<AuthService, "login" | "getSession" | "logout">;
export type ApiMailboxOnboardingService = Pick<
  MailboxOnboardingService,
  "beginConnect" | "completeConnect"
>;
export type ApiMailboxReadinessService = Pick<
  MailboxReadinessService,
  "checkSharedMailboxReadiness" | "getMailboxOperationalVerification"
>;
export type ApiMailboxFolderSyncService = Pick<
  MailboxFolderSyncService,
  "syncMailboxFolders"
>;
export type ApiMailboxMessageSyncService = Pick<
  MailboxMessageSyncService,
  "syncFolderMessages"
>;
export type ApiMailboxIngestionService = Pick<
  MailboxIngestionService,
  "ingestMessage"
>;
export type ApiMailboxAttachmentMetadataService = Pick<
  MailboxAttachmentMetadataService,
  "syncMessageAttachments"
>;
export type ApiMailboxPdfExtractionService = Pick<
  MailboxPdfExtractionService,
  "extractPdfAttachments"
>;
export type ApiMailboxMessageProcessingService = Pick<
  MailboxMessageProcessingService,
  "processMessage"
>;
export type ApiMailboxClassificationService = Pick<
  MailboxClassificationService,
  | "classifyMessage"
  | "getMessageClassificationReadModel"
  | "getMessageClassificationReadModelByGraphMessageId"
>;
export type ApiMailboxTaskWorkflowService = Pick<
  MailboxTaskWorkflowService,
  | "materializeTasks"
  | "transitionTask"
  | "getMessageWorkflowReadModel"
  | "getMessageWorkflowReadModelByGraphMessageId"
  | "getMailboxTaskWorkflowVerification"
>;
export type ApiMailboxActionService = Pick<
  MailboxActionService,
  | "evaluateFilingDecision"
  | "executeFiling"
  | "routeInvoiceMessage"
  | "stampOutgoingReference"
  | "getMailboxActionVerification"
>;
export type ApiMailboxProcessingVerificationService = Pick<
  MailboxProcessingVerificationService,
  "getMailboxProcessingVerification"
>;
export type ApiMailboxClassificationVerificationService = Pick<
  MailboxClassificationVerificationService,
  "getMailboxClassificationVerification"
>;
export type ApiMailboxSubscriptionService = Pick<
  MailboxSubscriptionService,
  "ensureMailboxSubscription" | "handleWebhookNotifications"
>;

export type CreateServerInput = {
  env: ApiEnv;
  authService: ApiAuthService;
  mailboxOnboardingService: ApiMailboxOnboardingService;
  mailboxReadinessService: ApiMailboxReadinessService;
  mailboxFolderSyncService: ApiMailboxFolderSyncService;
  mailboxMessageSyncService: ApiMailboxMessageSyncService;
  mailboxIngestionService: ApiMailboxIngestionService;
  mailboxAttachmentMetadataService: ApiMailboxAttachmentMetadataService;
  mailboxPdfExtractionService: ApiMailboxPdfExtractionService;
  mailboxMessageProcessingService: ApiMailboxMessageProcessingService;
  mailboxClassificationService: ApiMailboxClassificationService;
  mailboxTaskWorkflowService: ApiMailboxTaskWorkflowService;
  mailboxActionService: ApiMailboxActionService;
  mailboxProcessingVerificationService: ApiMailboxProcessingVerificationService;
  mailboxClassificationVerificationService: ApiMailboxClassificationVerificationService;
  mailboxSubscriptionService: ApiMailboxSubscriptionService;
  logger: Logger;
};

export function createServer(input: CreateServerInput) {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const correlationId = createCorrelationId();
    const requestLogger = input.logger.child({
      correlationId,
      method: request.method ?? "GET",
      path: requestUrl.pathname
    });

    try {
      if (
        request.method === "GET" &&
        (requestUrl.pathname === "/" || requestUrl.pathname === "/health")
      ) {
        writeJson(response, 200, {
          service: "friendly-mail-api",
          status: WorkflowStatus.Healthy,
          environment: input.env.NODE_ENV,
          correlationId
        });
        requestLogger.info("Request completed", {
          statusCode: 200
        });
        return;
      }

      const isGraphChangeWebhook =
        request.method === "POST" &&
        requestUrl.pathname === "/webhooks/microsoft/graph/notifications";
      const isGraphLifecycleWebhook =
        request.method === "POST" &&
        requestUrl.pathname === "/webhooks/microsoft/graph/lifecycle";

      if (isGraphChangeWebhook || isGraphLifecycleWebhook) {
        const validationToken = requestUrl.searchParams.get("validationToken");

        if (validationToken) {
          writeText(response, 200, validationToken);
          requestLogger.info("Validated Microsoft Graph webhook endpoint", {
            statusCode: 200,
            webhookKind: isGraphChangeWebhook ? "change" : "lifecycle"
          });
          return;
        }

        const body = await readJsonBody(request);
        await input.mailboxSubscriptionService.handleWebhookNotifications({
          kind: isGraphChangeWebhook ? "change" : "lifecycle",
          payload: body
        });

        response.writeHead(202);
        response.end();
        requestLogger.info("Accepted Microsoft Graph webhook payload", {
          statusCode: 202,
          webhookKind: isGraphChangeWebhook ? "change" : "lifecycle"
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/auth/login") {
        const body = await readJsonBody(request);
        const loginInput = parseLoginInput(body, request);
        const result = await input.authService.login(loginInput);
        const cookie = serializeSessionCookie({
          token: result.token,
          name: input.env.SESSION_COOKIE_NAME,
          maxAgeSeconds: input.env.SESSION_MAX_AGE_HOURS * 60 * 60,
          secure: input.env.NODE_ENV === "production"
        });

        writeJson(
          response,
          200,
          {
            session: result.session
          },
          {
            "set-cookie": cookie
          }
        );
        requestLogger.info("Local session created", {
          statusCode: 200,
          sessionId: result.session.id
        });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/auth/session") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );

        writeJson(response, 200, {
          session
        });
        requestLogger.info("Session fetched", {
          statusCode: 200,
          sessionId: session.id
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/auth/logout") {
        const token = readSessionTokenFromHeaders(request.headers, input.env.SESSION_COOKIE_NAME);

        if (token) {
          await input.authService.logout(token);
        }

        response.writeHead(204, {
          "set-cookie": serializeClearedSessionCookie({
            name: input.env.SESSION_COOKIE_NAME,
            secure: input.env.NODE_ENV === "production"
          })
        });
        response.end();
        requestLogger.info("Session cleared", {
          statusCode: 204
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/mailboxes/connect/start") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const body = await readJsonBody(request);
        const surface = parseSurface(body, session.surface);
        const result = await input.mailboxOnboardingService.beginConnect({
          session,
          surface
        });

        writeJson(
          response,
          200,
          {
            authorizationUrl: result.authorizationUrl
          },
          {
            "set-cookie": [
              serializeSessionCookie({
                token: result.state,
                name: getGraphStateCookieName(input.env.SESSION_COOKIE_NAME),
                maxAgeSeconds: 10 * 60,
                secure: input.env.NODE_ENV === "production"
              }),
              serializeSessionCookie({
                token: result.codeVerifier,
                name: getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME),
                maxAgeSeconds: 10 * 60,
                secure: input.env.NODE_ENV === "production"
              })
            ]
          }
        );
        requestLogger.info("Prepared mailbox connect redirect", {
          statusCode: 200,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/auth/microsoft/callback") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        const cookies = parseCookieHeader(request.headers.cookie);
        const expectedState = cookies[getGraphStateCookieName(input.env.SESSION_COOKIE_NAME)];
        const codeVerifier = cookies[getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME)];

        if (!code || !state || !expectedState || !codeVerifier) {
          throw new AppError(
            "GRAPH_CONNECT_CALLBACK_INVALID",
            "Microsoft mailbox callback is missing required parameters.",
            {
              statusCode: 400
            }
          );
        }

        const result = await input.mailboxOnboardingService.completeConnect({
          session,
          code,
          state,
          expectedState,
          codeVerifier
        });

        writeJson(
          response,
          200,
          result,
          {
            "set-cookie": [
              serializeClearedSessionCookie({
                name: getGraphStateCookieName(input.env.SESSION_COOKIE_NAME),
                secure: input.env.NODE_ENV === "production"
              }),
              serializeClearedSessionCookie({
                name: getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME),
                secure: input.env.NODE_ENV === "production"
              })
            ]
          }
        );
        requestLogger.info("Connected mailbox through Microsoft callback", {
          statusCode: 200,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      const sharedMailboxReadinessMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/shared-mailbox-readiness$/)
          : null;

      if (sharedMailboxReadinessMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(sharedMailboxReadinessMatch[1]);
        const body = await readJsonBody(request);
        const sharedMailboxAddress = parseSharedMailboxAddress(body);
        const result = await input.mailboxReadinessService.checkSharedMailboxReadiness({
          session,
          mailboxId,
          sharedMailboxAddress
        });

        writeJson(response, 200, result);
        requestLogger.info("Checked shared mailbox readiness", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          sharedMailboxAddress: result.sharedMailboxAddress,
          readinessStatus: result.status
        });
        return;
      }

      const mailboxFolderSyncMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/folders\/sync$/)
          : null;

      if (mailboxFolderSyncMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxFolderSyncMatch[1]);
        const result = await input.mailboxFolderSyncService.syncMailboxFolders({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Synced mailbox folders", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          discoveredFolders: result.discoveredFolders
        });
        return;
      }

      const mailboxMessageSyncMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/folders\/([^/]+)\/messages\/sync$/)
          : null;

      if (mailboxMessageSyncMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageSyncMatch[1]);
        const folderId = decodeURIComponent(mailboxMessageSyncMatch[2]);
        const result = await input.mailboxMessageSyncService.syncFolderMessages({
          session,
          mailboxId,
          folderId
        });

        writeJson(response, 200, result);
        requestLogger.info("Synced mailbox message metadata", {
          statusCode: 200,
          mailboxId,
          folderId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages
        });
        return;
      }

      const mailboxMessageIngestionMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/ingest$/)
          : null;

      if (mailboxMessageIngestionMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageIngestionMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageIngestionMatch[2]);
        const result = await input.mailboxIngestionService.ingestMessage({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Ingested mailbox message", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          graphMessageId: result.graphMessageId,
          ingestionVersionKey: result.ingestionVersionKey
        });
        return;
      }

      const mailboxAttachmentSyncMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(
              /^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/attachments\/sync$/
            )
          : null;

      if (mailboxAttachmentSyncMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxAttachmentSyncMatch[1]);
        const messageId = decodeURIComponent(mailboxAttachmentSyncMatch[2]);
        const result = await input.mailboxAttachmentMetadataService.syncMessageAttachments({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Synchronized mailbox attachment metadata", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          graphMessageId: result.graphMessageId,
          attachmentCount: result.attachmentCount,
          candidateCount: result.candidateCount
        });
        return;
      }

      const mailboxPdfExtractionMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(
              /^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/attachments\/extract-pdf$/
            )
          : null;

      if (mailboxPdfExtractionMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxPdfExtractionMatch[1]);
        const messageId = decodeURIComponent(mailboxPdfExtractionMatch[2]);
        const result = await input.mailboxPdfExtractionService.extractPdfAttachments({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Extracted PDF attachment text", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          graphMessageId: result.graphMessageId,
          extractedCount: result.extractedCount,
          failedCount: result.failedCount
        });
        return;
      }

      const mailboxMessageProcessingMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/process$/)
          : null;

      if (mailboxMessageProcessingMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageProcessingMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageProcessingMatch[2]);
        const result = await input.mailboxMessageProcessingService.processMessage({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Processed mailbox message through ingestion and extraction orchestration", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          graphMessageId: result.graphMessageId,
          ingestionVersionKey: result.ingestionVersionKey,
          processingStatus: result.processingStatus
        });
        return;
      }

      const mailboxMessageClassificationReadModelMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/classification$/)
          : null;

      if (mailboxMessageClassificationReadModelMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageClassificationReadModelMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageClassificationReadModelMatch[2]);
        const result = await input.mailboxClassificationService.getMessageClassificationReadModel({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Loaded mailbox classification read model", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          classifierVersion: result.classifierVersion
        });
        return;
      }

      const mailboxGraphMessageClassificationReadModelMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(
              /^\/mailboxes\/([^/]+)\/graph-messages\/([^/]+)\/classification$/
            )
          : null;

      if (mailboxGraphMessageClassificationReadModelMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxGraphMessageClassificationReadModelMatch[1]);
        const graphMessageId = decodeURIComponent(
          mailboxGraphMessageClassificationReadModelMatch[2]
        );
        const result =
          await input.mailboxClassificationService.getMessageClassificationReadModelByGraphMessageId(
            {
              session,
              mailboxId,
              graphMessageId
            }
          );

        writeJson(response, 200, result);
        requestLogger.info("Loaded mailbox classification read model by Graph message ID", {
          statusCode: 200,
          mailboxId,
          graphMessageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      const mailboxMessageClassificationMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/classify$/)
          : null;

      if (mailboxMessageClassificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageClassificationMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageClassificationMatch[2]);
        const result = await input.mailboxClassificationService.classifyMessage({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Classified mailbox message through orchestration service", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          graphMessageId: result.graphMessageId,
          ingestionVersionKey: result.ingestionVersionKey,
          classifierVersion: result.classifierVersion,
          classificationStatus: result.classificationStatus
        });
        return;
      }

      const mailboxTaskMaterializationMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(
              /^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/tasks\/materialize$/
            )
          : null;

      if (mailboxTaskMaterializationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxTaskMaterializationMatch[1]);
        const messageId = decodeURIComponent(mailboxTaskMaterializationMatch[2]);
        const result = await input.mailboxTaskWorkflowService.materializeTasks({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Materialized mailbox tasks from classification output", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          materializationStatus: result.materializationStatus,
          createdTaskCount: result.createdTaskCount
        });
        return;
      }

      const mailboxMessageWorkflowReadModelMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/workflow$/)
          : null;

      if (mailboxMessageWorkflowReadModelMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageWorkflowReadModelMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageWorkflowReadModelMatch[2]);
        const result = await input.mailboxTaskWorkflowService.getMessageWorkflowReadModel({
          session,
          mailboxId,
          messageId
        });

        writeJson(response, 200, result);
        requestLogger.info("Loaded mailbox workflow read model", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      const mailboxGraphMessageWorkflowReadModelMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/graph-messages\/([^/]+)\/workflow$/)
          : null;

      if (mailboxGraphMessageWorkflowReadModelMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxGraphMessageWorkflowReadModelMatch[1]);
        const graphMessageId = decodeURIComponent(mailboxGraphMessageWorkflowReadModelMatch[2]);
        const result =
          await input.mailboxTaskWorkflowService.getMessageWorkflowReadModelByGraphMessageId({
            session,
            mailboxId,
            graphMessageId
          });

        writeJson(response, 200, result);
        requestLogger.info("Loaded mailbox workflow read model by Graph message ID", {
          statusCode: 200,
          mailboxId,
          graphMessageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      const mailboxMessageFilingDecisionMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/filing-decision$/)
          : null;

      if (mailboxMessageFilingDecisionMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageFilingDecisionMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageFilingDecisionMatch[2]);
        const mode = parseMailboxActionMode(requestUrl.searchParams.get("mode"));
        const result = await input.mailboxActionService.evaluateFilingDecision({
          session,
          mailboxId,
          messageId,
          mode
        });

        writeJson(response, 200, result);
        requestLogger.info("Loaded filing decision read model", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          filingDecisionStatus: result.decision.status
        });
        return;
      }

      const mailboxMessageExecuteFilingMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/file$/)
          : null;

      if (mailboxMessageExecuteFilingMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageExecuteFilingMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageExecuteFilingMatch[2]);
        const body = await readJsonBody(request);
        const mode = parseMailboxActionModeFromBody(body);
        const result = await input.mailboxActionService.executeFiling({
          session,
          mailboxId,
          messageId,
          mode
        });

        writeJson(response, 200, result);
        requestLogger.info("Executed delayed filing mailbox action", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          filingDecisionStatus: result.decision.status,
          attemptCount: result.attempts.length
        });
        return;
      }

      const mailboxMessageInvoiceRouteMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/invoice-route$/)
          : null;

      if (mailboxMessageInvoiceRouteMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageInvoiceRouteMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageInvoiceRouteMatch[2]);
        const body = await readJsonBody(request);
        const routeInput = parseInvoiceRoute(body);
        const result = await input.mailboxActionService.routeInvoiceMessage({
          session,
          mailboxId,
          messageId,
          ...routeInput
        });

        writeJson(response, 200, result);
        requestLogger.info("Executed invoice routing mailbox action", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          attemptCount: result.attempts.length
        });
        return;
      }

      const mailboxMessageOutgoingNumberingMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/messages\/([^/]+)\/outgoing-numbering$/)
          : null;

      if (mailboxMessageOutgoingNumberingMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageOutgoingNumberingMatch[1]);
        const messageId = decodeURIComponent(mailboxMessageOutgoingNumberingMatch[2]);
        const body = await readJsonBody(request);
        const numberingInput = parseOutgoingNumbering(body);
        const result = await input.mailboxActionService.stampOutgoingReference({
          session,
          mailboxId,
          messageId,
          ...numberingInput
        });

        writeJson(response, 200, result);
        requestLogger.info("Executed outgoing numbering mailbox action", {
          statusCode: 200,
          mailboxId,
          messageId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          attemptCount: result.attempts.length
        });
        return;
      }

      const mailboxTaskTransitionMatch =
        request.method === "PATCH"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/tasks\/([^/]+)$/)
          : null;

      if (mailboxTaskTransitionMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxTaskTransitionMatch[1]);
        const taskId = decodeURIComponent(mailboxTaskTransitionMatch[2]);
        const body = await readJsonBody(request);
        const transition = parseTaskTransition(body);
        const result = await input.mailboxTaskWorkflowService.transitionTask({
          session,
          mailboxId,
          taskId,
          ...transition
        });

        writeJson(response, 200, result);
        requestLogger.info("Applied mailbox task lifecycle transition", {
          statusCode: 200,
          mailboxId,
          taskId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          status: result.task.task.status
        });
        return;
      }

      const mailboxOperationalVerificationMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/operational-verification$/)
          : null;

      if (mailboxOperationalVerificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxOperationalVerificationMatch[1]);
        const result = await input.mailboxReadinessService.getMailboxOperationalVerification({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Fetched mailbox operational verification", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          overallStatus: result.overallStatus
        });
        return;
      }

      const mailboxProcessingVerificationMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/processing-verification$/)
          : null;

      if (mailboxProcessingVerificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxProcessingVerificationMatch[1]);
        const result =
          await input.mailboxProcessingVerificationService.getMailboxProcessingVerification({
            session,
            mailboxId
          });

        writeJson(response, 200, result);
        requestLogger.info("Fetched mailbox processing verification", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          overallStatus: result.overallStatus
        });
        return;
      }

      const mailboxClassificationVerificationMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/classification-verification$/)
          : null;

      if (mailboxClassificationVerificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxClassificationVerificationMatch[1]);
        const result =
          await input.mailboxClassificationVerificationService.getMailboxClassificationVerification(
            {
              session,
              mailboxId
            }
          );

        writeJson(response, 200, result);
        requestLogger.info("Fetched mailbox classification verification", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          overallStatus: result.overallStatus
        });
        return;
      }

      const mailboxTaskWorkflowVerificationMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/task-workflow-verification$/)
          : null;

      if (mailboxTaskWorkflowVerificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxTaskWorkflowVerificationMatch[1]);
        const result = await input.mailboxTaskWorkflowService.getMailboxTaskWorkflowVerification({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Fetched mailbox task-workflow verification", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          overallStatus: result.overallStatus
        });
        return;
      }

      const mailboxActionVerificationMatch =
        request.method === "GET"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/mailbox-action-verification$/)
          : null;

      if (mailboxActionVerificationMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxActionVerificationMatch[1]);
        const result = await input.mailboxActionService.getMailboxActionVerification({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Fetched mailbox action verification", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          overallStatus: result.overallStatus
        });
        return;
      }

      const mailboxSubscriptionEnsureMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/subscriptions\/ensure$/)
          : null;

      if (mailboxSubscriptionEnsureMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxSubscriptionEnsureMatch[1]);
        const result = await input.mailboxSubscriptionService.ensureMailboxSubscription({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Ensured mailbox subscription", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          operation: result.operation,
          graphSubscriptionId: result.subscription.graphSubscriptionId
        });
        return;
      }

      throw new AppError("ROUTE_NOT_FOUND", "Route not found", {
        statusCode: 404
      });
    } catch (error) {
      const errorResponse = toErrorResponse(error, correlationId);

      if (response.headersSent || response.writableEnded) {
        requestLogger.error("Request failed after the response was already sent", {
          statusCode: errorResponse.statusCode
        });
        return;
      }

      response.writeHead(errorResponse.statusCode, {
        "content-type": "application/json"
      });
      response.end(JSON.stringify(errorResponse.body));
      requestLogger.error("Request failed", {
        statusCode: errorResponse.statusCode,
        error
      });
    }
  });
}

async function requireSession(
  authService: ApiAuthService,
  request: http.IncomingMessage,
  cookieName: string
) {
  const token = readSessionTokenFromHeaders(request.headers, cookieName);

  if (!token) {
    throw new AppError("AUTHENTICATION_REQUIRED", "Authentication required", {
      statusCode: 401
    });
  }

  const session = await authService.getSession(token);

  if (!session) {
    throw new AppError("AUTHENTICATION_REQUIRED", "Authentication required", {
      statusCode: 401
    });
  }

  return session;
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", "Request body must be valid JSON", {
      statusCode: 400
    });
  }
}

function parseLoginInput(body: unknown, request: http.IncomingMessage): LoginInput {
  if (!isObject(body)) {
    throw new AppError("INVALID_AUTH_REQUEST", "Login payload is invalid", {
      statusCode: 400
    });
  }

  if (!isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
    throw new AppError("INVALID_AUTH_REQUEST", "Email and password are required", {
      statusCode: 400
    });
  }

  const surface = body.surface === MailSurface.OutlookAddIn
    ? MailSurface.OutlookAddIn
    : body.surface === MailSurface.Dashboard
      ? MailSurface.Dashboard
      : undefined;

  if (!surface) {
    throw new AppError("INVALID_AUTH_REQUEST", "Surface must be provided", {
      statusCode: 400
    });
  }

  return {
    email: body.email,
    password: body.password,
    surface,
    tenantId: isNonEmptyString(body.tenantId) ? body.tenantId : undefined,
    userAgent: typeof request.headers["user-agent"] === "string"
      ? request.headers["user-agent"]
      : undefined,
    ipAddress: request.socket.remoteAddress ?? undefined
  };
}

function parseTaskTransition(body: unknown): TaskTransitionRequest {
  if (!isObject(body) || !isNonEmptyString(body.status)) {
    throw new AppError("INVALID_TASK_TRANSITION", "Task transition payload is invalid.", {
      statusCode: 400
    });
  }

  const status = parseTaskStatus(body.status);
  const reason =
    isNonEmptyString(body.reason) ? parseTaskStatusReason(body.reason) : undefined;

  return {
    status,
    reason,
    note: isNonEmptyString(body.note) ? body.note : undefined,
    snoozedUntil: isNonEmptyString(body.snoozedUntil) ? body.snoozedUntil : undefined,
    assignedUserId: isNonEmptyString(body.assignedUserId) ? body.assignedUserId : undefined
  };
}

function parseMailboxActionMode(value: string | null) {
  if (!value) {
    return undefined;
  }

  return parseMailboxActionModeValue(value);
}

function parseMailboxActionModeFromBody(body: unknown) {
  if (!isObject(body) || !isNonEmptyString(body.mode)) {
    return undefined;
  }

  return parseMailboxActionModeValue(body.mode);
}

function parseMailboxActionModeValue(value: string) {
  switch (value) {
    case MailboxActionMode.SuggestionOnly:
      return MailboxActionMode.SuggestionOnly;
    case MailboxActionMode.AutoApply:
      return MailboxActionMode.AutoApply;
    case MailboxActionMode.ApprovedApply:
      return MailboxActionMode.ApprovedApply;
    default:
      throw new AppError("INVALID_MAILBOX_ACTION", "Mailbox action mode is invalid.", {
        statusCode: 400
      });
  }
}

function parseInvoiceRoute(body: unknown) {
  if (!isObject(body) || !isNonEmptyString(body.forwardTo)) {
    throw new AppError(
      "INVALID_MAILBOX_ACTION",
      "Invoice routing requires a forwardTo email address.",
      {
        statusCode: 400
      }
    );
  }

  return {
    forwardTo: body.forwardTo.trim().toLowerCase(),
    comment: isNonEmptyString(body.comment) ? body.comment : undefined,
    mode: parseMailboxActionModeFromBody(body)
  };
}

function parseOutgoingNumbering(body: unknown) {
  if (!isObject(body)) {
    return {};
  }

  return {
    mode: parseMailboxActionModeFromBody(body),
    prefix: isNonEmptyString(body.prefix) ? body.prefix.trim() : undefined,
    sequenceKey: isNonEmptyString(body.sequenceKey) ? body.sequenceKey.trim() : undefined
  };
}

function parseTaskStatus(value: string) {
  switch (value) {
    case TaskStatus.Open:
      return TaskStatus.Open;
    case TaskStatus.Snoozed:
      return TaskStatus.Snoozed;
    case TaskStatus.Delegated:
      return TaskStatus.Delegated;
    case TaskStatus.Done:
      return TaskStatus.Done;
    case TaskStatus.Dismissed:
      return TaskStatus.Dismissed;
    default:
      throw new AppError("INVALID_TASK_TRANSITION", "Task transition status is invalid.", {
        statusCode: 400
      });
  }
}

function parseTaskStatusReason(value: string) {
  switch (value) {
    case TaskStatusReason.UserCompleted:
      return TaskStatusReason.UserCompleted;
    case TaskStatusReason.UserDismissed:
      return TaskStatusReason.UserDismissed;
    case TaskStatusReason.ResolvedByWorkflow:
      return TaskStatusReason.ResolvedByWorkflow;
    case TaskStatusReason.Delegated:
      return TaskStatusReason.Delegated;
    case TaskStatusReason.Snoozed:
      return TaskStatusReason.Snoozed;
    default:
      throw new AppError("INVALID_TASK_TRANSITION", "Task transition reason is invalid.", {
        statusCode: 400
      });
  }
}

function writeJson(
  response: http.ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string | string[]>
) {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    ...headers
  });
  response.end(JSON.stringify(body));
}

function writeText(response: http.ServerResponse, statusCode: number, body: string) {
  response.writeHead(statusCode, {
    "content-type": "text/plain"
  });
  response.end(body);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSurface(body: unknown, fallbackSurface: MailSurface) {
  if (!isObject(body)) {
    return fallbackSurface;
  }

  return body.surface === MailSurface.OutlookAddIn
    ? MailSurface.OutlookAddIn
    : body.surface === MailSurface.Dashboard
      ? MailSurface.Dashboard
      : fallbackSurface;
}

function parseSharedMailboxAddress(body: unknown) {
  if (!isObject(body) || !isNonEmptyString(body.sharedMailboxAddress)) {
    throw new AppError(
      "INVALID_SHARED_MAILBOX_REQUEST",
      "Shared mailbox address must be provided.",
      {
        statusCode: 400
      }
    );
  }

  return body.sharedMailboxAddress.trim().toLowerCase();
}

function getGraphStateCookieName(sessionCookieName: string) {
  return `${sessionCookieName}_graph_state`;
}

function getGraphPkceCookieName(sessionCookieName: string) {
  return `${sessionCookieName}_graph_pkce`;
}
