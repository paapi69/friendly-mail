import { MailSurface } from "@friendly-mail/contracts";

export function App() {
  return (
    <main style={{ fontFamily: "sans-serif", margin: "1.5rem" }}>
      <p>Friendly Mail MVP</p>
      <h1>Outlook Add-in Shell</h1>
      <p>This shell will host message triage, task actions, and filing eligibility.</p>
      <p>Surface: {MailSurface.OutlookAddIn}</p>
    </main>
  );
}
