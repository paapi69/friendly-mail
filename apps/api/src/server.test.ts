import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  MailboxConnectionStatus,
  MailboxKind,
  TenantUserRole
} from "@friendly-mail/contracts";
import {
  createServer,
  type ApiMailboxActionService,
  type ApiMailboxClassificationService,
  type ApiMailboxClassificationVerificationService,
  type ApiMailboxTaskWorkflowService,
  type ApiMailboxAttachmentMetadataService,
  type ApiMailboxMessageProcessingService,
  type ApiMailboxProcessingVerificationService,
  type ApiMailboxPdfExtractionService,
  type ApiAuthService,
  type ApiMailboxFolderSyncService,
  type ApiMailboxIngestionService,
  type ApiMailboxMessageSyncService,
  type ApiMailboxReadinessService,
  type ApiMailboxSubscriptionService,
  type ApiMailboxOnboardingService
} from "./server";

type SessionPayload = {
  session: {
    id: string;
    expiresAt: string;
    surface: MailSurface;
    principal: {
      userId: string;
      tenantId: string;
      email: string;
      displayName: string;
      role: TenantUserRole;
      authProvider: AuthProvider;
    };
    authBoundary: {
      productIdentity: "friendly_mail_internal";
      mailboxIdentity: "microsoft_graph";
      graphConnectionState: "not_connected";
    };
  };
};

const exampleSession: SessionPayload = {
  session: {
    id: "session_123",
    expiresAt: "2026-04-01T00:00:00.000Z",
    surface: MailSurface.Dashboard,
    principal: {
      userId: "user_123",
      tenantId: "tenant_123",
      email: "owner@friendlymail.dev",
      displayName: "Owner",
      role: TenantUserRole.Admin,
      authProvider: AuthProvider.LocalPassword
    },
    authBoundary: {
      productIdentity: "friendly_mail_internal",
      mailboxIdentity: "microsoft_graph",
      graphConnectionState: "not_connected"
    }
  }
};

describe("api auth routes", () => {
  afterEach(async () => {
    await Promise.all(
      [...serversForCleanup].map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
      )
    );
    serversForCleanup.clear();
  });

  it("rejects session reads when no session token is present", async () => {
    const server = createTestServer({
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn()
    });
    const response = await request(server, {
      method: "GET",
      path: "/auth/session"
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      error: expect.objectContaining({
        code: "AUTHENTICATION_REQUIRED"
      })
    });
  });

  it("creates a local session and sets a cookie on successful login", async () => {
    const authService: ApiAuthService = {
      login: vi.fn().mockResolvedValue({
        token: "opaque-session-token",
        session: exampleSession.session
      }),
      getSession: vi.fn(),
      logout: vi.fn()
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "POST",
      path: "/auth/login",
      body: {
        email: "owner@friendlymail.dev",
        password: "not-used-in-test",
        surface: MailSurface.Dashboard
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "friendly_mail_session=opaque-session-token"
    );
    expect(JSON.parse(response.body)).toEqual(exampleSession);
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@friendlymail.dev",
        surface: MailSurface.Dashboard
      })
    );
  });

  it("returns the current session for authenticated requests", async () => {
    const authService: ApiAuthService = {
      login: vi.fn(),
      getSession: vi.fn().mockResolvedValue(exampleSession.session),
      logout: vi.fn()
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "GET",
      path: "/auth/session",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(exampleSession);
    expect(authService.getSession).toHaveBeenCalledWith("cookie-session-token");
  });

  it("clears the session cookie during logout", async () => {
    const authService: ApiAuthService = {
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined)
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "POST",
      path: "/auth/logout",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
    expect(authService.logout).toHaveBeenCalledWith("cookie-session-token");
  });

  it("starts delegated mailbox onboarding and sets state cookies", async () => {
    const onboardingService: ApiMailboxOnboardingService = {
      beginConnect: vi.fn().mockResolvedValue({
        authorizationUrl: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
        state: "signed-state",
        codeVerifier: "pkce-verifier"
      }),
      completeConnect: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      onboardingService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/connect/start",
      body: {
        surface: MailSurface.OutlookAddIn
      },
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      authorizationUrl: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize"
    });
    expect(response.headers["set-cookie"]).toHaveLength(2);
    expect(response.headers["set-cookie"]?.[0]).toContain("friendly_mail_session_graph_state=");
    expect(response.headers["set-cookie"]?.[1]).toContain("friendly_mail_session_graph_pkce=");
    expect(onboardingService.beginConnect).toHaveBeenCalledWith({
      session: exampleSession.session,
      surface: MailSurface.OutlookAddIn
    });
  });

  it("completes delegated mailbox onboarding from the Microsoft callback", async () => {
    const onboardingService: ApiMailboxOnboardingService = {
      beginConnect: vi.fn(),
      completeConnect: vi.fn().mockResolvedValue({
        mailbox: {
          id: "mailbox_123",
          tenantId: "tenant_123",
          displayName: "Owner",
          emailAddress: "owner@friendlymail.dev",
          graphMailboxId: "graph_user_123",
          kind: MailboxKind.User
        },
        connection: {
          id: "connection_123",
          mailboxId: "mailbox_123",
          tenantId: "tenant_123",
          userId: "user_123",
          graphTenantId: "graph_tenant_123",
          graphUserId: "graph_user_123",
          status: MailboxConnectionStatus.Active,
          grantedScopes: ["Mail.Read", "User.Read"],
          connectedAt: "2026-04-01T10:45:00.000Z",
          lastValidatedAt: "2026-04-01T10:45:00.000Z"
        }
      }),
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      onboardingService
    );

    const response = await request(server, {
      method: "GET",
      path: "/auth/microsoft/callback?code=auth-code-123&state=signed-state",
      headers: {
        Cookie:
          "friendly_mail_session=cookie-session-token; friendly_mail_session_graph_state=signed-state; friendly_mail_session_graph_pkce=pkce-verifier"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailbox: {
        id: "mailbox_123",
        tenantId: "tenant_123",
        displayName: "Owner",
        emailAddress: "owner@friendlymail.dev",
        graphMailboxId: "graph_user_123",
        kind: "user"
      },
      connection: expect.objectContaining({
        id: "connection_123",
        status: "active"
      })
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("friendly_mail_session_graph_state=");
    expect(response.headers["set-cookie"]?.[1]).toContain("friendly_mail_session_graph_pkce=");
    expect(onboardingService.completeConnect).toHaveBeenCalledWith({
      session: exampleSession.session,
      code: "auth-code-123",
      state: "signed-state",
      expectedState: "signed-state",
      codeVerifier: "pkce-verifier"
    });
  });

  it("syncs mailbox folders for an authenticated mailbox owner", async () => {
    const folderSyncService: ApiMailboxFolderSyncService = {
      syncMailboxFolders: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        discoveredFolders: 3,
        rootFolders: 2,
        syncedAt: "2026-04-01T11:00:00.000Z"
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      folderSyncService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/folders/sync",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      discoveredFolders: 3,
      rootFolders: 2,
      syncedAt: "2026-04-01T11:00:00.000Z"
    });
    expect(folderSyncService.syncMailboxFolders).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("checks shared-mailbox readiness for an authenticated mailbox owner", async () => {
    const mailboxReadinessService: ApiMailboxReadinessService = {
      checkSharedMailboxReadiness: vi.fn().mockResolvedValue({
        sourceMailboxId: "mailbox_123",
        sharedMailboxAddress: "legal@friendlymail.dev",
        checkedAt: "2026-04-03T11:30:00.000Z",
        status: "limited",
        fallbackMode: "recommendation_only",
        grantedScopes: ["Mail.Read.Shared", "User.Read"],
        requiredScopes: ["Mail.Read.Shared", "Mail.ReadWrite.Shared"],
        capabilities: {
          delegatedSharedFolderRead: true,
          webhookBackedSync: false,
          backgroundDeltaRepair: false,
          sendWorkflowActions: false
        },
        checks: []
      }),
      getMailboxOperationalVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      mailboxReadinessService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/shared-mailbox-readiness",
      body: {
        sharedMailboxAddress: "legal@friendlymail.dev"
      },
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        status: "limited",
        fallbackMode: "recommendation_only"
      })
    );
    expect(mailboxReadinessService.checkSharedMailboxReadiness).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev"
    });
  });

  it("syncs message metadata for a tracked folder", async () => {
    const messageSyncService: ApiMailboxMessageSyncService = {
      syncFolderMessages: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        syncedMessages: 2,
        removedMessages: 1,
        deltaLink:
          "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
        syncedAt: "2026-04-02T05:15:00.000Z"
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      messageSyncService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/folders/folder_123/messages/sync",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      folderId: "folder_123",
      syncedMessages: 2,
      removedMessages: 1,
      deltaLink:
        "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
      syncedAt: "2026-04-02T05:15:00.000Z"
    });
    expect(messageSyncService.syncFolderMessages).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      folderId: "folder_123"
    });
  });

  it("ingests a tracked mailbox message into normalized content", async () => {
    const mailboxIngestionService: ApiMailboxIngestionService = {
      ingestMessage: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        hasAttachments: true,
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        ingestedAt: "2026-04-04T11:00:00.000Z",
        envelope: {
          mailboxId: "mailbox_123",
          messageId: "message_123",
          graphMessageId: "graph_message_123",
          graphChangeKey: "change_key_456",
          subject: "Quarterly notice",
          bodyContentType: "text",
          bodyText: "Please review the attached packet.",
          hasAttachments: true
        }
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxIngestionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/ingest",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123"
      })
    );
    expect(mailboxIngestionService.ingestMessage).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("syncs message attachment metadata for an ingested mailbox message", async () => {
    const mailboxAttachmentMetadataService: ApiMailboxAttachmentMetadataService = {
      syncMessageAttachments: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        attachmentCount: 2,
        candidateCount: 1,
        unsupportedCount: 1,
        syncedAt: "2026-04-04T11:05:00.000Z",
        attachments: [
          {
            graphAttachmentId: "graph_attachment_pdf",
            name: "notice.pdf",
            contentType: "application/pdf",
            sizeInBytes: 204800,
            isInline: false,
            attachmentKind: "file",
            isExtractionCandidate: true,
            extractionDecisionReason: "pdf_supported",
            extractionStatus: "pending"
          }
        ]
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxAttachmentMetadataService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/attachments/sync",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        attachmentCount: 2
      })
    );
    expect(mailboxAttachmentMetadataService.syncMessageAttachments).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("extracts PDF text for supported message attachments", async () => {
    const mailboxPdfExtractionService: ApiMailboxPdfExtractionService = {
      extractPdfAttachments: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        extractedCount: 1,
        failedCount: 0,
        skippedCount: 0,
        extractedAt: "2026-04-04T11:15:00.000Z",
        attachments: [
          {
            attachmentId: "attachment_123",
            graphAttachmentId: "graph_attachment_pdf",
            name: "invoice.pdf",
            extractionStatus: "completed",
            storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
            textLength: 55,
            extractionAttempts: 1
          }
        ]
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxPdfExtractionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/attachments/extract-pdf",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        extractedCount: 1
      })
    );
    expect(mailboxPdfExtractionService.extractPdfAttachments).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("orchestrates repeat-safe message processing through ingestion and extraction", async () => {
    const mailboxMessageProcessingService: ApiMailboxMessageProcessingService = {
      processMessage: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        idempotencyKey: "mailbox_123:graph_message_123:change_key_456",
        processingStatus: "processed",
        ingestion: {
          action: "reprocessed",
          hasAttachments: true,
          ingestedAt: "2026-04-04T11:00:00.000Z"
        },
        attachmentSync: {
          action: "synced",
          attachmentCount: 2,
          candidateCount: 1,
          unsupportedCount: 1,
          syncedAt: "2026-04-04T11:05:00.000Z"
        },
        extraction: {
          action: "processed",
          extractedCount: 1,
          failedCount: 0,
          skippedCount: 0,
          extractedAt: "2026-04-04T11:15:00.000Z"
        }
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxMessageProcessingService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/process",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        processingStatus: "processed"
      })
    );
    expect(mailboxMessageProcessingService.processMessage).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("orchestrates repeat-safe message classification for an authenticated mailbox owner", async () => {
    const mailboxClassificationService: ApiMailboxClassificationService = {
      getMessageClassificationReadModel: vi.fn(),
      classifyMessage: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        idempotencyKey: "mailbox_123:graph_message_123:change_key_456:baseline-classifier:v1",
        classifierVersion: "baseline-classifier:v1",
        processingStatus: "processed",
        classificationStatus: "classified",
        classifiedAt: "2026-04-05T09:30:00.000Z",
        result: {
          mailboxId: "mailbox_123",
          messageId: "message_123",
          ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
          classifiedAt: "2026-04-05T09:30:00.000Z",
          classifierVersion: "baseline-classifier:v1",
          actionability: "informational",
          messageType: "fyi",
          confidenceScore: 0.2,
          explanation: {
            summary: "Placeholder orchestration baseline result.",
            lowConfidence: true,
            reasons: []
          },
          signals: {
            dueDates: [],
            entities: [],
            taskCandidates: [],
            urgency: {
              level: "normal",
              confidenceScore: 0.2,
              rationale: "Placeholder orchestration baseline result.",
              reasons: []
            },
            criticality: {
              level: "normal",
              confidenceScore: 0.2,
              rationale: "Placeholder orchestration baseline result.",
              reasons: []
            }
          }
        }
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxClassificationService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/classify",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        classificationStatus: "classified"
      })
    );
    expect(mailboxClassificationService.classifyMessage).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("returns the stored classification read model for an authenticated mailbox owner", async () => {
    const mailboxClassificationService: ApiMailboxClassificationService = {
      classifyMessage: vi.fn(),
      getMessageClassificationReadModel: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        classifiedAt: "2026-04-05T09:30:00.000Z",
        classifierVersion: "rules-classifier:v1",
        actionability: "actionable",
        messageType: "invoice",
        confidence: {
          overall: {
            score: 0.92,
            band: "high",
            lowConfidence: false
          },
          signals: {
            dueDates: {
              count: 1,
              maxScore: 0.91
            },
            entities: {
              count: 1,
              maxScore: 0.89
            },
            taskCandidates: {
              count: 1,
              maxScore: 0.84
            },
            urgency: {
              score: 0.84,
              band: "high",
              level: "high"
            },
            criticality: {
              score: 0.82,
              band: "high",
              level: "elevated"
            }
          }
        },
        explanation: {
          summary: "The message is actionable because it requests invoice payment by a stated due date.",
          lowConfidence: false,
          reasons: [],
          urgency: {
            level: "high",
            rationale: "The message includes a near-term due date.",
            reasons: []
          },
          criticality: {
            level: "elevated",
            rationale: "Invoices have finance consequences if missed.",
            reasons: []
          }
        },
        signals: {
          summary: {
            dueDateCount: 1,
            entityCount: 1,
            taskCandidateCount: 1,
            nextDueDate: {
              id: "due_date_123",
              label: "Requested due date",
              value: "2026-04-10T00:00:00.000Z",
              confidenceScore: 0.91
            },
            topEntities: [],
            topTaskCandidates: []
          },
          dueDates: [],
          entities: [],
          taskCandidates: []
        }
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxClassificationService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/messages/message_123/classification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        confidence: expect.objectContaining({
          overall: expect.objectContaining({
            band: "high"
          })
        })
      })
    );
    expect(mailboxClassificationService.getMessageClassificationReadModel).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("materializes tasks from current classification output for an authenticated mailbox owner", async () => {
    const mailboxTaskWorkflowService: ApiMailboxTaskWorkflowService = {
      materializeTasks: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        classifierVersion: "rules-classifier:v1",
        actionability: "actionable",
        materializationStatus: "materialized",
        createdTaskCount: 1,
        reusedTaskCount: 0,
        materializedAt: "2026-04-05T11:00:00.000Z",
        workflowState: {
          id: "workflow_state_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "actionable",
          status: "active_actionable",
          filingState: "active_actionable",
          priority: "high",
          criticality: "elevated",
          isEligibleToFile: false,
          requirements: ["all_required_tasks_resolved"],
          blockedBy: ["open_task"],
          blockingTaskIds: ["task_123"],
          unresolvedTaskCount: 1,
          openTaskCount: 1,
          snoozedTaskCount: 0,
          delegatedTaskCount: 0,
          informationalReadRequired: false,
          messageIsRead: false,
          lastEvaluatedAt: "2026-04-05T11:00:00.000Z"
        },
        filingEligibility: {
          mailboxId: "mailbox_123",
          messageId: "message_123",
          workflowStateId: "workflow_state_123",
          state: "active_actionable",
          isEligible: false,
          requirements: ["all_required_tasks_resolved"],
          blockedBy: ["open_task"],
          summary: "The message stays active because at least one workflow task is still unresolved.",
          evaluatedAt: "2026-04-05T11:00:00.000Z"
        },
        tasks: []
      }),
      transitionTask: vi.fn(),
      getMessageWorkflowReadModel: vi.fn(),
      getMailboxTaskWorkflowVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxTaskWorkflowService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/tasks/materialize",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        materializationStatus: "materialized"
      })
    );
    expect(mailboxTaskWorkflowService.materializeTasks).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("returns the message workflow read model for an authenticated mailbox owner", async () => {
    const mailboxTaskWorkflowService: ApiMailboxTaskWorkflowService = {
      materializeTasks: vi.fn(),
      transitionTask: vi.fn(),
      getMessageWorkflowReadModel: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowState: {
          id: "workflow_state_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "actionable",
          status: "active_actionable",
          filingState: "active_actionable",
          priority: "high",
          criticality: "elevated",
          isEligibleToFile: false,
          requirements: ["all_required_tasks_resolved"],
          blockedBy: ["open_task"],
          blockingTaskIds: ["task_123"],
          unresolvedTaskCount: 1,
          openTaskCount: 1,
          snoozedTaskCount: 0,
          delegatedTaskCount: 0,
          informationalReadRequired: false,
          messageIsRead: false,
          lastEvaluatedAt: "2026-04-05T11:00:00.000Z"
        },
        filingEligibility: {
          mailboxId: "mailbox_123",
          messageId: "message_123",
          workflowStateId: "workflow_state_123",
          state: "active_actionable",
          isEligible: false,
          requirements: ["all_required_tasks_resolved"],
          blockedBy: ["open_task"],
          summary: "The message stays active because at least one workflow task is still unresolved.",
          evaluatedAt: "2026-04-05T11:00:00.000Z"
        },
        classification: {
          ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
          classifierVersion: "rules-classifier:v1",
          actionability: "actionable",
          messageType: "invoice",
          confidenceScore: 0.91,
          explanationSummary: "The message requests invoice payment by a stated due date."
        },
        tasks: []
      }),
      getMailboxTaskWorkflowVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxTaskWorkflowService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/messages/message_123/workflow",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123"
      })
    );
    expect(mailboxTaskWorkflowService.getMessageWorkflowReadModel).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("applies task lifecycle transitions for an authenticated mailbox owner", async () => {
    const mailboxTaskWorkflowService: ApiMailboxTaskWorkflowService = {
      materializeTasks: vi.fn(),
      transitionTask: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        task: {
          task: {
            id: "task_123",
            mailboxId: "mailbox_123",
            sourceMessageId: "message_123",
            title: "Pay invoice INV-42",
            status: "delegated",
            priority: "high",
            criticality: "elevated",
            ownerUserId: "user_123",
            assignedUserId: "user_delegate",
            delegatedByUserId: "user_123",
            createdAt: "2026-04-05T11:00:00.000Z"
          },
          sourceLinks: [],
          latestLifecycleEvent: {
            id: "task_event_123",
            mailboxId: "mailbox_123",
            taskId: "task_123",
            fromStatus: "open",
            toStatus: "delegated",
            reason: "delegated",
            actorUserId: "user_123",
            delegatedToUserId: "user_delegate",
            occurredAt: "2026-04-05T11:10:00.000Z"
          },
          sourceMessage: {
            mailboxId: "mailbox_123",
            messageId: "message_123",
            subject: "Invoice due Friday"
          }
        }
      }),
      getMessageWorkflowReadModel: vi.fn(),
      getMailboxTaskWorkflowVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxTaskWorkflowService
    );

    const response = await request(server, {
      method: "PATCH",
      path: "/mailboxes/mailbox_123/tasks/task_123",
      body: {
        status: "delegated",
        reason: "delegated",
        assignedUserId: "user_delegate",
        note: "Finance will handle payment."
      },
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        task: expect.objectContaining({
          task: expect.objectContaining({
            status: "delegated"
          })
        })
      })
    );
    expect(mailboxTaskWorkflowService.transitionTask).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      taskId: "task_123",
      status: "delegated",
      reason: "delegated",
      assignedUserId: "user_delegate",
      note: "Finance will handle payment."
    });
  });

  it("returns task-workflow verification for an authenticated mailbox owner", async () => {
    const mailboxTaskWorkflowService: ApiMailboxTaskWorkflowService = {
      materializeTasks: vi.fn(),
      transitionTask: vi.fn(),
      getMessageWorkflowReadModel: vi.fn(),
      getMailboxTaskWorkflowVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-05T11:30:00.000Z",
        overallStatus: "warning",
        coverage: {
          classifiedActionableMessages: 2,
          messagesWithTaskCandidates: 2,
          messagesWithMaterializedTasks: 1,
          pendingMaterializationMessages: 1,
          workflowStateMessages: 1,
          totalTasks: 1
        },
        integrity: {
          orphanedTaskIds: [],
          taskIdsMissingSourceLinks: [],
          messageIdsMissingWorkflowState: ["message_999"],
          messageIdsMarkedEligibleWithUnresolvedTasks: [],
          invalidLifecycleTaskIds: []
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxTaskWorkflowService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/task-workflow-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        overallStatus: "warning"
      })
    );
    expect(mailboxTaskWorkflowService.getMailboxTaskWorkflowVerification).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns the filing decision read model for an authenticated mailbox owner", async () => {
    const mailboxActionService: ApiMailboxActionService = {
      evaluateFilingDecision: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        decision: {
          id: "filing_decision_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "informational",
          status: "eligible",
          mode: "suggestion_only",
          requirements: ["message_read"],
          blockedBy: [],
          targetFolderId: "folder_archive",
          targetFolderGraphId: "graph_folder_archive",
          targetFolderName: "Archive",
          suggestedCategories: ["FriendlyMail/Informational", "FriendlyMail/Fyi"],
          summary: "The message is ready to file.",
          sourceMessageIsRead: true,
          decidedAt: "2026-04-05T11:00:00.000Z"
        },
        workflowState: {
          id: "workflow_state_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "informational",
          status: "eligible_to_file",
          filingState: "eligible_to_file",
          priority: "normal",
          criticality: "normal",
          isEligibleToFile: true,
          requirements: ["message_read"],
          blockedBy: [],
          blockingTaskIds: [],
          unresolvedTaskCount: 0,
          openTaskCount: 0,
          snoozedTaskCount: 0,
          delegatedTaskCount: 0,
          informationalReadRequired: true,
          messageIsRead: true,
          lastEvaluatedAt: "2026-04-05T11:00:00.000Z"
        },
        filingEligibility: {
          messageId: "message_123",
          isEligible: true,
          requirements: ["message_read"],
          blockedBy: [],
          summary: "The message is ready to file."
        },
        classification: {
          ingestionVersionKey: "version_123",
          classifierVersion: "rules-classifier:v1",
          actionability: "informational",
          messageType: "fyi",
          confidenceScore: 0.82,
          explanationSummary: "The message is informational."
        },
        targetFolder: {
          id: "folder_archive",
          graphFolderId: "graph_folder_archive",
          name: "Archive",
          source: "mailbox_folder"
        },
        recommendedActions: []
      }),
      executeFiling: vi.fn(),
      routeInvoiceMessage: vi.fn(),
      stampOutgoingReference: vi.fn(),
      getMailboxActionVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxActionService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/messages/message_123/filing-decision?mode=suggestion_only",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mailboxActionService.evaluateFilingDecision).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: "suggestion_only"
    });
  });

  it("executes delayed filing for an authenticated mailbox owner", async () => {
    const mailboxActionService: ApiMailboxActionService = {
      evaluateFilingDecision: vi.fn(),
      executeFiling: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        decision: {
          id: "filing_decision_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "informational",
          status: "executed",
          mode: "approved_apply",
          requirements: ["message_read"],
          blockedBy: [],
          suggestedCategories: ["FriendlyMail/Informational"],
          summary: "The message was filed.",
          sourceMessageIsRead: true,
          decidedAt: "2026-04-05T11:00:00.000Z",
          executedAt: "2026-04-05T11:01:00.000Z"
        },
        attempts: [],
        workflowState: undefined,
        filingEligibility: undefined,
        message: {
          graphMessageId: "graph_message_123",
          graphParentFolderId: "graph_folder_archive",
          filingState: "filed"
        }
      }),
      routeInvoiceMessage: vi.fn(),
      stampOutgoingReference: vi.fn(),
      getMailboxActionVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxActionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/file",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      },
      body: {
        mode: "approved_apply"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mailboxActionService.executeFiling).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: "approved_apply"
    });
  });

  it("routes invoices and stamps outgoing references for an authenticated mailbox owner", async () => {
    const mailboxActionService: ApiMailboxActionService = {
      evaluateFilingDecision: vi.fn(),
      executeFiling: vi.fn(),
      routeInvoiceMessage: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        decision: {
          id: "filing_decision_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "actionable",
          status: "blocked",
          mode: "approved_apply",
          requirements: ["all_required_tasks_resolved"],
          blockedBy: ["open_task"],
          suggestedCategories: ["FriendlyMail/Invoice"],
          summary: "The invoice remains active.",
          sourceMessageIsRead: false,
          decidedAt: "2026-04-05T11:00:00.000Z"
        },
        attempts: [],
        workflowState: undefined,
        filingEligibility: undefined
      }),
      stampOutgoingReference: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        decision: {
          id: "filing_decision_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          actionability: "informational",
          status: "eligible",
          mode: "approved_apply",
          requirements: [],
          blockedBy: [],
          suggestedCategories: [],
          summary: "Draft ready.",
          sourceMessageIsRead: false,
          decidedAt: "2026-04-05T11:00:00.000Z"
        },
        attempts: [
          {
            id: "attempt_123",
            mailboxId: "mailbox_123",
            messageId: "message_123",
            actionType: "stamp_outgoing_reference",
            mode: "approved_apply",
            status: "succeeded",
            referenceNumber: "FM-2026-0001",
            attemptedAt: "2026-04-05T11:00:00.000Z"
          }
        ],
        workflowState: undefined,
        filingEligibility: undefined
      }),
      getMailboxActionVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxActionService
    );

    const invoiceRouteResponse = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/invoice-route",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      },
      body: {
        forwardTo: "ap@friendlymail.dev",
        mode: "approved_apply"
      }
    });
    const numberingResponse = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/outgoing-numbering",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      },
      body: {
        mode: "approved_apply",
        prefix: "FM-2026"
      }
    });

    expect(invoiceRouteResponse.statusCode).toBe(200);
    expect(numberingResponse.statusCode).toBe(200);
    expect(mailboxActionService.routeInvoiceMessage).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      forwardTo: "ap@friendlymail.dev",
      comment: undefined,
      mode: "approved_apply"
    });
    expect(mailboxActionService.stampOutgoingReference).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: "approved_apply",
      prefix: "FM-2026",
      sequenceKey: undefined
    });
  });

  it("returns mailbox-action verification for an authenticated mailbox owner", async () => {
    const mailboxActionService: ApiMailboxActionService = {
      evaluateFilingDecision: vi.fn(),
      executeFiling: vi.fn(),
      routeInvoiceMessage: vi.fn(),
      stampOutgoingReference: vi.fn(),
      getMailboxActionVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-05T12:00:00.000Z",
        overallStatus: "warning",
        coverage: {
          trackedMessages: 3,
          decisions: 2,
          eligibleDecisions: 1,
          executedDecisions: 1,
          attempts: 4,
          succeededAttempts: 3,
          failedAttempts: 1
        },
        integrity: {
          messageIdsMissingDecision: ["message_999"],
          decisionIdsMissingAttempts: [],
          decisionIdsWithFailedLatestAttempt: ["filing_decision_123"],
          messageIdsFiledWithoutSucceededMove: []
        },
        capabilityGaps: {
          routingBlockedMessageIds: ["message_123"],
          numberingBlockedMessageIds: []
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxActionService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/mailbox-action-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mailboxActionService.getMailboxActionVerification).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns mailbox operational verification for an authenticated mailbox owner", async () => {
    const mailboxReadinessService: ApiMailboxReadinessService = {
      checkSharedMailboxReadiness: vi.fn(),
      getMailboxOperationalVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-03T11:30:00.000Z",
        overallStatus: "warning",
        subscription: {
          graphSubscriptionId: "subscription_123",
          status: "active",
          health: "warning",
          expiresAt: "2026-04-04T00:00:00.000Z",
          minutesUntilExpiry: 750
        },
        deltaSync: {
          trackedFolders: 1,
          healthyFolders: 1,
          staleFolders: 0,
          failedFolders: 0,
          missingCursorFolders: 0,
          maxCursorLagMinutes: 12,
          folders: []
        },
        immutableIds: {
          status: "enforced",
          messageReads: true,
          messageLists: true,
          deltaQueries: true,
          subscriptionCreation: true
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      mailboxReadinessService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/operational-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        overallStatus: "warning"
      })
    );
    expect(mailboxReadinessService.getMailboxOperationalVerification).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns mailbox classification verification for an authenticated mailbox owner", async () => {
    const mailboxClassificationVerificationService: ApiMailboxClassificationVerificationService = {
      getMailboxClassificationVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-05T12:00:00.000Z",
        overallStatus: "warning",
        coverage: {
          trackedMessages: 5,
          eligibleMessages: 4,
          classifiedMessages: 3,
          pendingClassificationMessages: 1,
          actionableMessages: 2,
          informationalMessages: 1,
          messageTypeCounts: []
        },
        confidence: {
          averageScore: 0.7,
          lowConfidenceMessages: 1,
          mediumConfidenceMessages: 0,
          highConfidenceMessages: 2,
          ambiguousMessages: 1
        },
        signals: {
          messagesWithDueDates: 1,
          messagesWithEntities: 1,
          messagesWithTaskCandidates: 2,
          messagesWithCriticality: 3,
          highRiskMessages: 2,
          highRiskMessagesWithDueDates: 1
        },
        degradedCases: {
          lowConfidenceMessageIds: ["message_fyi"],
          ambiguousMessageIds: ["message_fyi"],
          highRiskMissingDueDateMessageIds: ["message_notice"]
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxClassificationVerificationService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/classification-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        overallStatus: "warning"
      })
    );
    expect(
      mailboxClassificationVerificationService.getMailboxClassificationVerification
    ).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns mailbox processing verification for an authenticated mailbox owner", async () => {
    const mailboxProcessingVerificationService: ApiMailboxProcessingVerificationService = {
      getMailboxProcessingVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-04T11:30:00.000Z",
        overallStatus: "warning",
        ingestion: {
          trackedMessages: 3,
          ingestedMessages: 2,
          pendingMessages: 1,
          messagesWithAttachments: 2
        },
        extraction: {
          trackedAttachments: 4,
          candidateAttachments: 2,
          completedAttachments: 1,
          completedWithOcrAttachments: 0,
          pendingAttachments: 1,
          failedAttachments: 0,
          unsupportedAttachments: 2,
          retriedAttachments: 0,
          retryBacklogAttachments: 1,
          maxExtractionAttempts: 1,
          failureRate: 0,
          unsupportedReasons: [
            {
              reason: "file_type_unsupported",
              count: 2
            }
          ],
          failureReasons: []
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxProcessingVerificationService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/processing-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        overallStatus: "warning"
      })
    );
    expect(
      mailboxProcessingVerificationService.getMailboxProcessingVerification
    ).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("ensures a mailbox subscription for an authenticated mailbox owner", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        operation: "created",
        subscription: {
          mailboxId: "mailbox_123",
          graphSubscriptionId: "subscription_123",
          resource: "/users/graph_user_123/messages",
          changeTypes: ["created", "deleted", "updated"],
          status: "active",
          notificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/notifications",
          lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/lifecycle",
          expiresAt: "2026-04-10T11:30:00.000Z"
        }
      }),
      handleWebhookNotifications: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/subscriptions/ensure",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      operation: "created",
      subscription: expect.objectContaining({
        graphSubscriptionId: "subscription_123",
        status: "active"
      })
    });
    expect(mailboxSubscriptionService.ensureMailboxSubscription).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns the decoded validation token for Graph webhook validation", async () => {
    const server = createTestServer({
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn()
    });

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/notifications?validationToken=hello%20world"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain");
    expect(response.body).toBe("hello world");
  });

  it("accepts Graph change notifications and hands them to the webhook service", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn().mockResolvedValue({
        acceptedNotifications: 1,
        ignoredNotifications: 0,
        queuedNotifications: 1
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn(),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/notifications",
      body: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            changeType: "updated"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.body).toBe("");
    expect(mailboxSubscriptionService.handleWebhookNotifications).toHaveBeenCalledWith({
      kind: "change",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            changeType: "updated"
          }
        ]
      }
    });
  });

  it("accepts Graph lifecycle notifications and hands them to the webhook service", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn().mockResolvedValue({
        acceptedNotifications: 1,
        ignoredNotifications: 0,
        queuedNotifications: 1
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn(),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/lifecycle",
      body: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            lifecycleEvent: "reauthorizationRequired"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(202);
    expect(mailboxSubscriptionService.handleWebhookNotifications).toHaveBeenCalledWith({
      kind: "lifecycle",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            lifecycleEvent: "reauthorizationRequired"
          }
        ]
      }
    });
  });
});

function createTestServer(
  authService: ApiAuthService,
  mailboxOnboardingService?: ApiMailboxOnboardingService,
  mailboxReadinessService?: ApiMailboxReadinessService,
  mailboxFolderSyncService?: ApiMailboxFolderSyncService,
  mailboxMessageSyncService?: ApiMailboxMessageSyncService,
  mailboxSubscriptionService?: ApiMailboxSubscriptionService,
  mailboxIngestionService?: ApiMailboxIngestionService,
  mailboxAttachmentMetadataService?: ApiMailboxAttachmentMetadataService,
  mailboxPdfExtractionService?: ApiMailboxPdfExtractionService,
  mailboxMessageProcessingService?: ApiMailboxMessageProcessingService,
  mailboxProcessingVerificationService?: ApiMailboxProcessingVerificationService,
  mailboxClassificationService?: ApiMailboxClassificationService,
  mailboxClassificationVerificationService?: ApiMailboxClassificationVerificationService,
  mailboxTaskWorkflowService?: ApiMailboxTaskWorkflowService,
  mailboxActionService?: ApiMailboxActionService
) {
  const server = createServer({
    env: {
      NODE_ENV: "test",
      API_PORT: 0,
      SESSION_COOKIE_NAME: "friendly_mail_session",
      SESSION_MAX_AGE_HOURS: 12
    },
    authService,
    mailboxOnboardingService: mailboxOnboardingService ?? {
      beginConnect: vi.fn(),
      completeConnect: vi.fn()
    },
    mailboxReadinessService: mailboxReadinessService ?? {
      checkSharedMailboxReadiness: vi.fn(),
      getMailboxOperationalVerification: vi.fn()
    },
    mailboxFolderSyncService: mailboxFolderSyncService ?? {
      syncMailboxFolders: vi.fn()
    },
    mailboxMessageSyncService: mailboxMessageSyncService ?? {
      syncFolderMessages: vi.fn()
    },
    mailboxSubscriptionService: mailboxSubscriptionService ?? {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn()
    },
    mailboxIngestionService: mailboxIngestionService ?? {
      ingestMessage: vi.fn()
    },
    mailboxAttachmentMetadataService: mailboxAttachmentMetadataService ?? {
      syncMessageAttachments: vi.fn()
    },
    mailboxPdfExtractionService: mailboxPdfExtractionService ?? {
      extractPdfAttachments: vi.fn()
    },
    mailboxMessageProcessingService: mailboxMessageProcessingService ?? {
      processMessage: vi.fn()
    },
    mailboxProcessingVerificationService: mailboxProcessingVerificationService ?? {
      getMailboxProcessingVerification: vi.fn()
    },
    mailboxClassificationService: mailboxClassificationService ?? {
      getMessageClassificationReadModel: vi.fn(),
      classifyMessage: vi.fn()
    },
    mailboxClassificationVerificationService: mailboxClassificationVerificationService ?? {
      getMailboxClassificationVerification: vi.fn()
    },
    mailboxTaskWorkflowService: mailboxTaskWorkflowService ?? {
      materializeTasks: vi.fn(),
      transitionTask: vi.fn(),
      getMessageWorkflowReadModel: vi.fn(),
      getMailboxTaskWorkflowVerification: vi.fn()
    },
    mailboxActionService: mailboxActionService ?? {
      evaluateFilingDecision: vi.fn(),
      executeFiling: vi.fn(),
      routeInvoiceMessage: vi.fn(),
      stampOutgoingReference: vi.fn(),
      getMailboxActionVerification: vi.fn()
    },
    logger: {
      child() {
        return this;
      },
      debug() {
        return undefined;
      },
      info() {
        return undefined;
      },
      warn() {
        return undefined;
      },
      error() {
        return undefined;
      }
    }
  });

  return registerServer(server);
}

function registerServer(server: http.Server) {
  serversForCleanup.add(server);
  return server;
}

const serversForCleanup = new Set<http.Server>();

async function request(
  server: http.Server,
  input: {
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected the test server to listen on a TCP port");
  }

  const body = input.body ? JSON.stringify(input.body) : undefined;
  const requestHeaders: Record<string, string> = {
    ...input.headers
  };

  if (body) {
    requestHeaders["content-type"] = "application/json";
    requestHeaders["content-length"] = String(Buffer.byteLength(body));
  }

  return new Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: string;
  }>((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method: input.method,
        path: input.path,
        headers: requestHeaders
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 500,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}
