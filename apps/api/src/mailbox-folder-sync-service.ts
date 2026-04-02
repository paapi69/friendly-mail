import { createGraphConnector, type FetchLike, type GraphMailFolder } from "@friendly-mail/graph";
import {
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertMailboxFolder,
  upsertFolderSyncState
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxFolderSyncEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type SyncMailboxFoldersInput = {
  session: SessionView;
  mailboxId: string;
};

type SyncMailboxFoldersResult = {
  mailboxId: string;
  discoveredFolders: number;
  rootFolders: number;
  syncedAt: string;
};

export type MailboxFolderSyncService = {
  syncMailboxFolders(input: SyncMailboxFoldersInput): Promise<SyncMailboxFoldersResult>;
};

export type CreatePrismaMailboxFolderSyncServiceInput = {
  prisma: PrismaClient;
  env: MailboxFolderSyncEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

export function createPrismaMailboxFolderSyncService(
  input: CreatePrismaMailboxFolderSyncServiceInput
): MailboxFolderSyncService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async syncMailboxFolders(syncInput) {
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
          "Mailbox connection is not active for folder synchronization.",
          {
            statusCode: 409
          }
        );
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
          mailboxId: mailbox.id
        })
      });

      const rootFolders = await collectAllFolders(async (pageUrl) => {
        return graph.listMailFolders({
          pageUrl,
          includeHiddenFolders: true,
          top: 50
        });
      });

      const allFolders: GraphMailFolder[] = [];

      for (const rootFolder of rootFolders) {
        allFolders.push(rootFolder);

        const childFolders = await collectFolderDescendants(graph, rootFolder.id);
        allFolders.push(...childFolders);
      }

      const discoveredFolders = dedupeFolders(allFolders);
      const syncedAt = now();

      for (const folder of discoveredFolders) {
        const persistedFolder = (await upsertMailboxFolder(
          {
            folder: input.prisma.folder
          },
          {
            mailboxId: mailbox.id,
            graphFolderId: folder.id,
            displayName: folder.displayName,
            parentGraphFolderId: folder.parentFolderId,
            isSyncEnabled: true
          }
        )) as { id: string };

        await upsertFolderSyncState(
          {
            folderSyncState: input.prisma.folderSyncState
          },
          {
            mailboxId: mailbox.id,
            folderId: persistedFolder.id,
            syncStatus: "IDLE",
            lastSyncedAt: syncedAt
          }
        );
      }

      input.logger.info("Discovered mailbox folder tree", {
        mailboxId: mailbox.id,
        tenantId: mailbox.tenantId,
        userId: syncInput.session.principal.userId,
        discoveredFolders: discoveredFolders.length,
        rootFolders: rootFolders.length
      });

      return {
        mailboxId: mailbox.id,
        discoveredFolders: discoveredFolders.length,
        rootFolders: rootFolders.length,
        syncedAt: syncedAt.toISOString()
      };
    }
  };
}

async function collectFolderDescendants(
  graph: ReturnType<typeof createGraphConnector>,
  folderId: string
) {
  const children = await collectAllFolders(async (pageUrl) => {
    return graph.listChildMailFolders({
      folderId,
      pageUrl,
      includeHiddenFolders: true,
      top: 50
    });
  });
  const descendants: GraphMailFolder[] = [...children];

  for (const child of children) {
    descendants.push(...(await collectFolderDescendants(graph, child.id)));
  }

  return descendants;
}

async function collectAllFolders(
  pageReader: (pageUrl?: string) => Promise<{
    items: GraphMailFolder[];
    nextLink?: string;
  }>
) {
  const folders: GraphMailFolder[] = [];
  let pageUrl: string | undefined;

  do {
    const page = await pageReader(pageUrl);
    folders.push(...page.items);
    pageUrl = page.nextLink;
  } while (pageUrl);

  return folders;
}

function dedupeFolders(folders: GraphMailFolder[]) {
  const unique = new Map<string, GraphMailFolder>();

  for (const folder of folders) {
    unique.set(folder.id, folder);
  }

  return [...unique.values()];
}
