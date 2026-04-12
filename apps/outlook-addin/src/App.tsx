import {
  FilingEligibility,
  FilingState,
  MailSurface,
  MessageActionability,
  MessagePriority,
  MessageRecord,
  MessageType
} from "@friendly-mail/contracts";

const sampleMessage: MessageRecord = {
  id: "message_addin_demo",
  mailboxId: "mailbox_demo",
  graphMessageId: "graph_message_demo",
  subject: "Board notice needs review",
  actionability: MessageActionability.Actionable,
  messageType: MessageType.Notice,
  priority: MessagePriority.Critical,
  filingState: FilingState.ActiveActionable,
  fromAddress: "board@example.com",
  receivedAt: "2026-03-31T00:00:00.000Z",
  isRead: false
};

const sampleFiling: FilingEligibility = {
  mailboxId: sampleMessage.mailboxId,
  messageId: sampleMessage.id,
  state: sampleMessage.filingState,
  isEligible: false,
  requirements: ["all_required_tasks_resolved"],
  blockedBy: ["open_task"],
  summary: "The message cannot be filed until its open work is resolved.",
  evaluatedAt: "2026-04-05T12:00:00.000Z"
};

export function App() {
  return (
    <main style={{ fontFamily: "sans-serif", margin: "1.5rem" }}>
      <p>Friendly Mail MVP</p>
      <h1>Outlook Add-in Shell</h1>
      <p>This shell will host message triage, task actions, and filing eligibility.</p>
      <p>Surface: {MailSurface.OutlookAddIn}</p>
      <p>Shared contract message: {sampleMessage.messageType}</p>
      <p>Filing blocked by: {sampleFiling.blockedBy.join(", ")}</p>
    </main>
  );
}
