import { MailSurface } from "@friendly-mail/contracts";

export function App() {
  return (
    <main style={{ fontFamily: "sans-serif", margin: "2rem" }}>
      <p>Friendly Mail MVP</p>
      <h1>Companion Dashboard</h1>
      <p>Primary workflow state, admin controls, and reporting will live here.</p>
      <p>Surface: {MailSurface.Dashboard}</p>
    </main>
  );
}
