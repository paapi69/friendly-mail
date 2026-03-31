import {
  MailSurface,
  MessagePriority,
  TaskRecord,
  TaskStatus
} from "@friendly-mail/contracts";

const sampleTask: TaskRecord = {
  id: "task_dashboard_demo",
  mailboxId: "mailbox_demo",
  title: "Review today’s critical notices",
  status: TaskStatus.Open,
  priority: MessagePriority.Critical,
  createdAt: "2026-03-31T00:00:00.000Z"
};

export function App() {
  return (
    <main style={{ fontFamily: "sans-serif", margin: "2rem" }}>
      <p>Friendly Mail MVP</p>
      <h1>Companion Dashboard</h1>
      <p>Primary workflow state, admin controls, and reporting will live here.</p>
      <p>Surface: {MailSurface.Dashboard}</p>
      <p>Shared contract task: {sampleTask.title}</p>
      <p>Status: {sampleTask.status}</p>
    </main>
  );
}
