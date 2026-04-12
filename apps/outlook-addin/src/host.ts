export type AddinStage =
  | "browser-preview"
  | "ready"
  | "missing-item"
  | "unsupported-client"
  | "host-unavailable";

export type AddinView = "message-read" | "message-compose" | "unknown";

export type ClientFamily =
  | "browser-preview"
  | "outlook-web"
  | "windows-outlook"
  | "unsupported";

export type PreviewScenario =
  | "ready"
  | "low-confidence"
  | "workflow-failed"
  | "connecting"
  | "syncing"
  | "disconnected"
  | "degraded"
  | "missing-item"
  | "unsupported-client"
  | "host-unavailable"
  | "compose";

export interface AddinMessageContext {
  status: "selected" | "missing" | "unsupported";
  itemId: string | null;
  subject: string | null;
  fromAddress: string | null;
  receivedAt: string | null;
}

export interface AddinContext {
  source: "browser-preview" | "office-host";
  previewScenario: PreviewScenario | null;
  stage: AddinStage;
  clientFamily: ClientFamily;
  mode: AddinView;
  isPinnedCapable: boolean;
  message: AddinMessageContext;
  summary: string;
}

export interface OutlookHostController {
  loadInitialContext(): Promise<AddinContext>;
  subscribeToItemChanges(listener: (context: AddinContext) => void): () => void;
  setPreviewScenario(scenario: PreviewScenario): AddinContext;
}

interface OfficeReadyInfo {
  host?: string;
  platform?: string;
}

interface OfficeEmailAddress {
  emailAddress?: string;
}

interface OfficeMailboxItem {
  itemId?: string;
  itemType?: string;
  subject?: string;
  from?: OfficeEmailAddress;
  dateTimeCreated?: string;
}

interface OfficeMailbox {
  item?: OfficeMailboxItem | null;
  diagnostics?: {
    platform?: string;
  };
  addHandlerAsync?: (eventType: string, handler: () => void) => void;
}

interface OfficeContextLike {
  mailbox?: OfficeMailbox;
}

interface OfficeGlobalLike {
  onReady?: () => Promise<OfficeReadyInfo>;
  context?: OfficeContextLike;
  EventType?: {
    ItemChanged?: string;
  };
}

interface WindowLike {
  Office?: OfficeGlobalLike;
  location?: {
    search?: string;
  };
  history?: {
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
  };
}

interface OfficeAddinSnapshot {
  platform?: string;
  item?: OfficeMailboxItem | null;
  mode?: AddinView;
}

function createMissingMessageContext(): AddinMessageContext {
  return {
    status: "missing",
    itemId: null,
    subject: null,
    fromAddress: null,
    receivedAt: null
  };
}

function createSelectedMessageContext(item: OfficeMailboxItem): AddinMessageContext {
  const itemType = (item.itemType ?? "message").toLowerCase();

  if (itemType !== "message") {
    return {
      status: "unsupported",
      itemId: item.itemId ?? null,
      subject: item.subject ?? null,
      fromAddress: item.from?.emailAddress ?? null,
      receivedAt: item.dateTimeCreated ?? null
    };
  }

  return {
    status: "selected",
    itemId: item.itemId ?? null,
    subject: item.subject ?? null,
    fromAddress: item.from?.emailAddress ?? null,
    receivedAt: item.dateTimeCreated ?? null
  };
}

export function resolveClientFamily(platform?: string): ClientFamily {
  const normalized = platform?.toLowerCase();

  if (!normalized) {
    return "unsupported";
  }

  if (normalized === "officeonline") {
    return "outlook-web";
  }

  if (normalized === "pc") {
    return "windows-outlook";
  }

  return "unsupported";
}

export function resolvePreviewScenario(search = ""): PreviewScenario {
  const params = new URLSearchParams(search);
  const scenario = params.get("scenario");

  switch (scenario) {
    case "missing-item":
    case "low-confidence":
    case "workflow-failed":
    case "connecting":
    case "syncing":
    case "disconnected":
    case "degraded":
    case "unsupported-client":
    case "host-unavailable":
    case "compose":
      return scenario;
    default:
      return "ready";
  }
}

export function buildBrowserPreviewContext(
  scenario: PreviewScenario
): AddinContext {
  switch (scenario) {
    case "connecting":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_connecting_item",
          subject: "Board notice needs review before filing",
          fromAddress: "board@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the mailbox-connection state before readiness checks are available."
      };
    case "low-confidence":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_low_confidence_item",
          subject: "Policy note may need review",
          fromAddress: "compliance@example.com",
          receivedAt: "2026-04-05T08:10:00.000Z"
        },
        summary: "Previewing a low-confidence workflow summary that still needs human review."
      };
    case "workflow-failed":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_workflow_failed_item",
          subject: "Board notice needs review before filing",
          fromAddress: "board@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the workflow fallback when live message detail cannot be loaded."
      };
    case "syncing":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_syncing_item",
          subject: "Finance invoice follow-up",
          fromAddress: "finance@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the mailbox-syncing state while backend readiness catches up."
      };
    case "disconnected":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_disconnected_item",
          subject: "Board notice needs review before filing",
          fromAddress: "board@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the disconnected mailbox state before Friendly Mail has a linked mailbox."
      };
    case "degraded":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_degraded_item",
          subject: "Policy update",
          fromAddress: "policy@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the degraded readiness state when mailbox health cannot be trusted as current."
      };
    case "missing-item":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "missing-item",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: createMissingMessageContext(),
        summary: "Previewing the fallback state for when Outlook has no usable message selected."
      };
    case "unsupported-client":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "unsupported-client",
        clientFamily: "browser-preview",
        mode: "unknown",
        isPinnedCapable: false,
        message: createMissingMessageContext(),
        summary: "Previewing the unsupported-host fallback before we ship broader Outlook coverage."
      };
    case "host-unavailable":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "host-unavailable",
        clientFamily: "browser-preview",
        mode: "unknown",
        isPinnedCapable: false,
        message: createMissingMessageContext(),
        summary: "Previewing the recovery state for when Office.js or mailbox context is unavailable."
      };
    case "compose":
      return {
        source: "browser-preview",
        previewScenario: scenario,
        stage: "ready",
        clientFamily: "browser-preview",
        mode: "message-compose",
        isPinnedCapable: false,
        message: {
          status: "selected",
          itemId: "preview_compose_item",
          subject: "Draft response to board notice",
          fromAddress: "sahil@example.com",
          receivedAt: null
        },
        summary: "Previewing the compose-mode shell that E7-T7 will build on later."
      };
    default:
      return {
        source: "browser-preview",
        previewScenario: "ready",
        stage: "browser-preview",
        clientFamily: "browser-preview",
        mode: "message-read",
        isPinnedCapable: true,
        message: {
          status: "selected",
          itemId: "preview_read_item",
          subject: "Board notice needs review before filing",
          fromAddress: "board@example.com",
          receivedAt: "2026-04-05T07:30:00.000Z"
        },
        summary: "Previewing the live dev lane for the Outlook task-pane shell before Office host activation."
      };
  }
}

export function buildOfficeAddinContext(
  snapshot: OfficeAddinSnapshot
): AddinContext {
  const clientFamily = resolveClientFamily(snapshot.platform);

  if (clientFamily === "unsupported") {
    return {
      source: "office-host",
      previewScenario: null,
      stage: "unsupported-client",
      clientFamily,
      mode: snapshot.mode ?? "unknown",
      isPinnedCapable: false,
      message: createMissingMessageContext(),
      summary: "The current Outlook host is outside the MVP support baseline."
    };
  }

  const message = snapshot.item
    ? createSelectedMessageContext(snapshot.item)
    : createMissingMessageContext();

  if (message.status !== "selected") {
    return {
      source: "office-host",
      previewScenario: null,
      stage: "missing-item",
      clientFamily,
      mode: snapshot.mode ?? "message-read",
      isPinnedCapable: true,
      message,
      summary: "Friendly Mail is waiting for a supported message selection before loading workflow context."
    };
  }

  return {
    source: "office-host",
    previewScenario: null,
    stage: "ready",
    clientFamily,
    mode: snapshot.mode ?? "message-read",
    isPinnedCapable: true,
    message,
    summary: "The Outlook host is ready for the mailbox readiness and workflow-summary slices."
  };
}

export function createOutlookHostController(
  win: WindowLike = globalThis as WindowLike
): OutlookHostController {
  const updatePreviewScenario = (scenario: PreviewScenario): AddinContext => {
    const params = new URLSearchParams(win.location?.search ?? "");
    params.set("scenario", scenario);

    const nextUrl = params.toString().length > 0 ? `?${params.toString()}` : "";
    win.history?.replaceState(null, "", nextUrl);

    return buildBrowserPreviewContext(scenario);
  };

  const loadOfficeContext = async (): Promise<AddinContext> => {
    const office = win.Office;

    if (!office?.onReady) {
      return buildBrowserPreviewContext(resolvePreviewScenario(win.location?.search));
    }

    const readyInfo = await office.onReady();

    if (readyInfo.host?.toLowerCase() !== "outlook") {
      return {
        source: "office-host",
        previewScenario: null,
        stage: "host-unavailable",
        clientFamily: "unsupported",
        mode: "unknown",
        isPinnedCapable: false,
        message: createMissingMessageContext(),
        summary: "Friendly Mail could not activate inside an Outlook host context."
      };
    }

    const mailbox = office.context?.mailbox;

    return buildOfficeAddinContext({
      platform: mailbox?.diagnostics?.platform ?? readyInfo.platform,
      item: mailbox?.item ?? null
    });
  };

  return {
    async loadInitialContext() {
      return loadOfficeContext();
    },
    subscribeToItemChanges(listener) {
      const office = win.Office;
      const mailbox = office?.context?.mailbox;
      const eventType = office?.EventType?.ItemChanged;

      if (!mailbox?.addHandlerAsync || !eventType) {
        return () => undefined;
      }

      const handler = async () => {
        listener(await loadOfficeContext());
      };

      mailbox.addHandlerAsync(eventType, handler);

      return () => undefined;
    },
    setPreviewScenario(scenario) {
      return updatePreviewScenario(scenario);
    }
  };
}
