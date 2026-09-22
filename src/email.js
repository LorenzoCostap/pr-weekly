import nodemailer from "nodemailer";

export async function sendReport({ user, appPassword, to }, rows) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject: `Relatório semanal de PRs — ${new Date().toLocaleDateString("pt-BR")}`,
    html: buildHtmlTable(rows),
  });
}

export function buildHtmlTable(rows) {
  const header = `
    <tr>
      <th>Task</th><th>Status</th><th>Dev (horas úteis)</th><th>Review (horas úteis)</th>
      <th>Voltou p/ alteração?</th><th>Horas úteis pós-alteração</th><th>PR</th>
    </tr>`;

  const body = rows
    .map(
      (r) => `
    <tr>
      <td>#${r.issueNumber} — ${r.title}</td>
      <td>${r.status}</td>
      <td>${r.devHours}</td>
      <td>${r.reviewHours}</td>
      <td>${r.hadChangesRequested === null ? "—" : r.hadChangesRequested ? "Sim" : "Não"}</td>
      <td>${r.postChangeHours ?? "—"}</td>
      <td>${r.prUrl ? `<a href="${r.prUrl}">link</a>` : "—"}</td>
    </tr>`
    )
    .join("");

  return `<table border="1" cellpadding="6" style="border-collapse: collapse; font-family: sans-serif;">
    ${header}${body}
  </table>`;
}
