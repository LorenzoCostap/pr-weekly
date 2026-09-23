import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo.png");
const LOGO_CID = "companylogo";

const STATUS_COLORS = {
  Feito: { bg: "#e6f4ea", text: "#1e7e34" },
  "Aguardando PR": { bg: "#fff4e5", text: "#b25e00" },
};

export async function sendReport({ user, appPassword, to }, rows, period) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject: `Relatório semanal de PRs — ${new Date().toLocaleDateString("pt-BR")}`,
    html: buildEmailHtml(rows, period),
    // Anexo embutido (cid), não link externo — assim a imagem aparece direto,
    // sem depender do cliente de e-mail liberar "mostrar imagens externas".
    attachments: [{ filename: "logo.png", path: LOGO_PATH, cid: LOGO_CID }],
  });
}

function badge(text, bg, color) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${bg};color:${color};white-space:nowrap;">${text}</span>`;
}

function statusBadge(status) {
  const c = STATUS_COLORS[status] ?? { bg: "#eee", text: "#444" };
  return badge(status, c.bg, c.text);
}

function changeBadge(hadChangesRequested) {
  if (hadChangesRequested === null) return "—";
  return hadChangesRequested
    ? badge("Sim", "#fdecea", "#c62828")
    : badge("Não", "#e6f4ea", "#1e7e34");
}

function formatPeriod(period) {
  if (!period) return "";
  const fmt = (d) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `${fmt(period.start)} – ${fmt(period.end)}`;
}

export function buildHtmlTable(rows) {
  const columns = [
    "Task",
    "Status",
    "Dev (h)",
    "Review (h)",
    "Voltou p/ alteração?",
    "Horas pós-alteração",
    "PR",
  ];

  const header = `
    <tr>
      ${columns
        .map(
          (h) =>
            `<th style="padding:10px 12px;background:#1a1a1a;color:#ffffff;text-align:left;font-size:12px;font-family:Arial,Helvetica,sans-serif;">${h}</th>`
        )
        .join("")}
    </tr>`;

  const body = rows
    .map((r, i) => {
      const rowBg = i % 2 === 0 ? "#ffffff" : "#f7f7f8";
      const cell = (content) =>
        `<td style="padding:10px 12px;font-size:13px;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #ececec;">${content}</td>`;

      const taskCell = r.prUrl
        ? `<a href="${r.prUrl}" style="color:#1a1a1a;text-decoration:none;font-weight:600;">#${r.issueNumber}</a> — ${r.title}`
        : `<strong>#${r.issueNumber}</strong> — ${r.title}`;

      return `
    <tr style="background:${rowBg};">
      ${cell(taskCell)}
      ${cell(statusBadge(r.status))}
      ${cell(r.devHours)}
      ${cell(r.reviewHours)}
      ${cell(changeBadge(r.hadChangesRequested))}
      ${cell(r.postChangeHours ?? "—")}
      ${cell(r.prUrl ? `<a href="${r.prUrl}" style="color:#1a73e8;text-decoration:none;">abrir</a>` : "—")}
    </tr>`;
    })
    .join("");

  return `<table style="border-collapse:collapse;width:100%;">${header}${body}</table>`;
}

export function buildEmailHtml(rows, period) {
  const doneCount = rows.filter((r) => r.status === "Feito").length;
  const waitingCount = rows.filter((r) => r.status === "Aguardando PR").length;
  const logoTag = `<img src="cid:${LOGO_CID}" width="28" height="28" style="border-radius:50%;vertical-align:middle;margin-right:10px;" alt="logo">`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:0 auto;">
    <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 4px;">${logoTag}Relatório semanal de PRs</h2>
    <p style="font-size:13px;color:#666666;margin:0 0 18px;">
      Período: ${formatPeriod(period)} &nbsp;•&nbsp; ${doneCount} concluída(s), ${waitingCount} aguardando revisão
    </p>
    ${buildHtmlTable(rows)}
  </div>`;
}
