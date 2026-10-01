import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo.png");
const LOGO_CID = "companylogo";
const MAX_REASON_LENGTH = 300;

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
    attachments: [{ filename: "logo.png", path: LOGO_PATH, cid: LOGO_CID }],
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(str, max = MAX_REASON_LENGTH) {
  if (str.length <= max) return str;
  return `${str.slice(0, max).trimEnd()}…`;
}

function badge(text, bg, color) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${bg};color:${color};white-space:nowrap;">${text}</span>`;
}

function statusBadge(status) {
  const c = STATUS_COLORS[status] ?? { bg: "#eee", text: "#444" };
  return badge(status, c.bg, c.text);
}

function formatPeriod(period) {
  if (!period) return "";
  const fmt = (d) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `${fmt(period.start)} – ${fmt(period.end)}`;
}

function buildReasonsBlock(changeReasons) {
  if (!changeReasons || changeReasons.length === 0) {
    return `<div style="margin-top:10px;padding:10px 14px;background:#fff8f0;border-left:3px solid #e8821e;border-radius:4px;font-size:13px;color:#5a3d1a;">
      Teve pedido de alteração, mas sem comentário registrado na review.
    </div>`;
  }

  return changeReasons
    .map((cr, i) => {
      const text = cr.reason
        ? `"${escapeHtml(truncate(cr.reason))}"`
        : `<em>sem comentário registrado nessa rodada</em>`;
      const who = cr.reviewer ? ` — ${escapeHtml(cr.reviewer)}` : "";
      return `<div style="margin-top:${i === 0 ? "10" : "6"}px;padding:10px 14px;background:#fff8f0;border-left:3px solid #e8821e;border-radius:4px;font-size:13px;color:#5a3d1a;">
        <strong>Rodada ${i + 1}${who}:</strong> ${text}
      </div>`;
    })
    .join("");
}

function buildCard(row, { highlightReason } = {}) {
  const title = row.prUrl
    ? `<a href="${row.prUrl}" style="color:#1a1a1a;text-decoration:none;font-weight:700;">#${row.issueNumber} — ${row.title}</a>`
    : `<strong>#${row.issueNumber} — ${row.title}</strong>`;

  const reasonBlock = highlightReason ? buildReasonsBlock(row.changeReasons) : "";

  return `
  <div style="border:1px solid #e5e5e5;border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#ffffff;">
    <div style="font-size:14px;margin-bottom:6px;">${title}</div>
    ${statusBadge(row.status)}
    ${reasonBlock}
  </div>`;
}

function buildSection(title, rows, options) {
  if (rows.length === 0) return "";
  return `
  <h3 style="font-size:14px;color:#1a1a1a;margin:20px 0 10px;">${title} (${rows.length})</h3>
  ${rows.map((r) => buildCard(r, options)).join("")}`;
}

export function buildEmailHtml(rows, period) {
  // Prioridade do que seu chefe quer ver primeiro: o que voltou pra alteração
  // (com o motivo), não importa o status atual — vem antes de tudo.
  const changed = rows.filter((r) => r.hadChangesRequested === true);
  const changedNumbers = new Set(changed.map((r) => r.issueNumber));
  const waiting = rows.filter((r) => r.status === "Aguardando PR" && !changedNumbers.has(r.issueNumber));
  const doneClean = rows.filter((r) => r.status === "Feito" && !changedNumbers.has(r.issueNumber));

  const logoTag = `<img src="cid:${LOGO_CID}" width="28" height="28" style="border-radius:50%;vertical-align:middle;margin-right:10px;" alt="logo">`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:0 auto;">
    <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 4px;">${logoTag}Relatório semanal de PRs</h2>
    <p style="font-size:13px;color:#666666;margin:0 0 4px;">Período: ${formatPeriod(period)}</p>
    <p style="font-size:13px;color:#666666;margin:0 0 10px;">
      ${changed.length} voltaram pra alteração &nbsp;•&nbsp; ${doneClean.length} concluída(s) direto &nbsp;•&nbsp; ${waiting.length} aguardando revisão
    </p>
    ${buildSection("⚠️ Voltaram pra alteração", changed, { highlightReason: true })}
    ${buildSection("⏳ Aguardando revisão", waiting, {})}
    ${buildSection("✅ Concluídas direto", doneClean, {})}
  </div>`;
}
