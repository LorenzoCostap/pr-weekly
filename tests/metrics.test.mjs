import { detectTransitions } from "../src/snapshot.js";
import { selectReportIssues, buildReport, sumStatusDuration } from "../src/metrics.js";
import { STATUS } from "../src/config.js";

// Simula 6 dias de snapshot pra issue #1413:
// dia1: A Fazer -> dia2: Em progresso -> dia4: Aguardando PR (2 dias em dev)
// -> dia5: Em progresso (voltou, pedido de alteração) -> dia6: Aguardando PR -> dia7: Feito
const days = [
  { date: "2026-09-01T21:00:00Z", status: STATUS.todo },
  { date: "2026-09-02T21:00:00Z", status: STATUS.inProgress },
  { date: "2026-09-03T21:00:00Z", status: STATUS.inProgress },
  { date: "2026-09-04T21:00:00Z", status: STATUS.waitingPR },
  { date: "2026-09-05T21:00:00Z", status: STATUS.inProgress },
  { date: "2026-09-06T21:00:00Z", status: STATUS.waitingPR },
  { date: "2026-09-07T21:00:00Z", status: STATUS.done },
];

let log = { lastSnapshot: {}, transitions: [] };
for (const day of days) {
  const items = [{ issueNumber: 1413, title: "Criar o BancoWebhookController", status: day.status }];
  log = detectTransitions(log, items, new Date(day.date));
}

console.log("Transições registradas:", log.transitions.length, "(esperado 6 — a 1ª observação + 5 mudanças reais, sem repetir o dia3)");
console.assert(log.transitions.length === 6, "Deveria ter 6 transições, não repetir status igual");

const devDays = sumStatusDuration(log.transitions, STATUS.inProgress);
const reviewDays = sumStatusDuration(log.transitions, STATUS.waitingPR);
console.log("dev days (esperado 3 — 1 dia + 2 dias):", devDays);
console.log("review days (esperado 2 — 1 dia + 1 dia):", reviewDays);
console.assert(devDays === 3, "dev days incorreto");
console.assert(reviewDays === 2, "review days incorreto");

// Janela do relatório: última semana (issue foi pra Feito dentro dela)
const start = new Date("2026-09-01T00:00:00Z");
const end = new Date("2026-09-08T00:00:00Z");
const issues = selectReportIssues(log, { start, end });
console.assert(issues.length === 1, "deveria selecionar a issue 1413 (foi pra Feito na janela)");

const prsByIssueNumber = new Map([
  [
    1413,
    {
      number: 42,
      url: "https://github.com/org/repo/pull/42",
      mergedAt: new Date("2026-09-07T21:00:00Z"),
      hadChangesRequested: true,
      firstChangesRequestedAt: new Date("2026-09-05T10:00:00Z"),
    },
  ],
]);

const rows = buildReport(issues, prsByIssueNumber);
console.log(rows);
console.assert(rows[0].hadChangesRequested === true, "hadChangesRequested incorreto");
console.assert(rows[0].devDays === 3, "devDays incorreto na linha final");

console.log("\nTodos os asserts passaram (nenhuma falha 'Assertion failed' acima).");
