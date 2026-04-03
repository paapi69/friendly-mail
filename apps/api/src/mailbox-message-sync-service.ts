import { createGraphConnector, type FetchLike } from "@friendly-mail/graph";
import { type SessionView } from "@friendly-mail/contracts";
import {
  markMailboxMessageRemoved,
  type PrismaClient,
  upsertFolderSyncState,
  upsertMailboxMessage
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxMessageSyncEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type SyncFolderMessagesInput = {
  session: SessionView;
  mailboxId: string;
  folderId: string;
};

type SyncFolderMessagesResult = {
  mailboxId: string;
  folderId: string;
  syncedMessages: number;
  removedMessages: number;
  deltaLink?: string;
  syncedAt: string;
};

export type MailboxMessageSyncService = {
  syncFolderMessages(input: SyncFolderMessagesInput): Promise<SyncFolderMessagesResult>;
};

export type CreatePrismaMailboxMessageSyncServiceInput = {
  prisma: PrismaClient;
  env: MailboxMessageSyncEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

export function createPrismaMailboxMessageSyncService(
  input: CreatePrismaMailboxMessageSyncServiceInput
): MailboxMessageSyncService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async syncFolderMessages(syncInput) {
      const syncedAt = now();
      const mailbox = await input.prisma.mailbox.findFirst({
        where: {
          id: syncInput.mailboxId,
          tenantId: syncInput.session.principal.tenantId
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

      if (!mailbox.connection || mailbox.connection.userId !== syncInput.session.principal.userId) {
        throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
          statusCode: 403
        });
      }

      if (mailbox.connection.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
        throw new AppError(
          "MAILBOX_CONNECTION_INACTIVE",
          "Mailbox connection is not active for message synchronization.",
          {
            statusCode: 409
          }
        );
      }

      const folder = await input.prisma.folder.findFirst({
        where: {
          id: syncInput.folderId,
          mailboxId: mailbox.id
        }
      });

      if (!folder) {
        throw new AppError("MAILBOX_FOLDER_NOT_FOUND", "Tracked folder not found.", {
          statusCode: 404
        });
      }

      if (!folder.isSyncEnabled) {
        throw new AppError(
          "MAILBOX_FOLDER_SYNC_DISABLED",
          "Tracked folder is not enabled for message synchronization.",
          {
            statusCode: 409
          }
        );
      }

      const existingSyncState = await input.prisma.folderSyncState.findUnique({
        where: {
          folderId: folder.id
        }
      });
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
          folderId: folder.id
        })
      });

      await upsertFolderSyncState(
        {
          folderSyncState: input.prisma.folderSyncState
        },
        {
          mailboxId: mailbox.id,
          folderId: folder.id,
          deltaLink: existingSyncState?.deltaLink ?? undefined,
          syncStatus: "ACTIVE",
          lastErrorCode: undefined,
          lastErrorAt: undefined
        }
      );

      let syncedMessages = 0;
      let removedMessages = 0;
      let nextPageUrl = existingSyncState?.deltaLink ?? undefined;
      let finalDeltaLink = existingSyncState?.deltaLink ?? undefined;

      try {
        do {
          const page = await graph.deltaFolderMessages({
            folderId: folder.graphFolderId,
            pageUrl: nextPageUrl,
            top: nextPageUrl ? undefined : 50
          });

          for (const message of page.items) {
            if (message.removedReason) {
              removedMessages += 1;
              await markMailboxMessageRemoved(
                {
                  message: input.prisma.message
                },
                {
                  mailboxId: mailbox.id,
                  graphMessageId: message.id,
                  graphRemovedAt: syncedAt,
                  graphRemovalReason: message.removedReason
                }
              );
              continue;
            }

            syncedMessages += 1;
            await upsertMailboxMessage(
              {
                message: input.prisma.message
              },
              {
                mailboxId: mailbox.id,
                folderId: folder.id,
                graphMessageId: message.id,
                graphParentFolderId: message.parentFolderId ?? folder.graphFolderId,
                graphChangeKey: message.changeKey,
                internetMessageId: message.internetMessageId,
                conversationId: message.conversationId,
                subject: message.subject,
                fromAddress: message.fromAddress ?? message.senderAddress,
                receivedAt: parseOptionalDate(message.receivedDateTime),
                lastGraphModifiedAt: parseOptionalDate(message.lastModifiedDateTime),
                isRead: message.isRead
              }
            );
          }

          nextPageUrl = page.nextLink;
          finalDeltaLink = page.deltaLink ?? finalDeltaLink;
        } while (nextPageUrl);

        if (!finalDeltaLink) {
          throw new AppError(
            "GRAPH_DELTA_LINK_MISSING",
            "Microsoft Graph message delta sync did not return a delta link.",
            {
              statusCode: 502
            }
          );
        }

        await upsertFolderSyncState(
          {
            folderSyncState: input.prisma.folderSyncState
          },
          {
            mailboxId: mailbox.id,
            folderId: folder.id,
            deltaLink: finalDeltaLink,
            syncStatus: "IDLE",
            lastSyncedAt: syncedAt,
            lastCursorUpdatedAt: syncedAt,
            lastErrorCode: undefined,
            lastErrorAt: undefined
          }
        );
      } catch (error) {
        await upsertFolderSyncState(
          {
            folderSyncState: input.prisma.folderSyncState
          },
          {
            mailboxId: mailbox.id,
            folderId: folder.id,
            deltaLink: existingSyncState?.deltaLink ?? undefined,
            syncStatus: "FAILED",
            lastErrorCode: error instanceof AppError ? error.code : "MESSAGE_SYNC_FAILED",
            lastErrorAt: syncedAt
          }
        );

        throw error;
      }

      input.logger.info("Synced mailbox message metadata", {
        mailboxId: mailbox.id,
        folderId: folder.id,
        tenantId: mailbox.tenantId,
        userId: syncInput.session.principal.userId,
        syncedMessages,
        removedMessages
      });

      return {
        mailboxId: mailbox.id,
        folderId: folder.id,
        syncedMessages,
        removedMessages,
        deltaLink: finalDeltaLink,
        syncedAt: syncedAt.toISOString()
      };
    }
  };
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
