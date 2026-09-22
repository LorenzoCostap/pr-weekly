import { detectTransitions } from "../src/snapshot.js";
import { selectReportIssues, buildReport, sumStatusHours } from "../src/metrics.js";
import { STATUS } from "../src/config.js";

// Simula 7 dias de snapshot pra issue #1413, sempre às 18:00 (horário de
// Brasília — fim do expediente), cruzando um fim de semana de propósito:
// Ter(1) A Fazer -> Qua(2) Em progresso -> Qui(3) Em progresso (repete, sem
// transição nova) -> Sex(4) Aguardando PR -> Sáb(5) Em progresso (voltou
// pra corrigir) -> Dom(6) Aguardando PR -> Seg(7) Feito
const days = [
  { date: "2026-09-01T21:00:00Z", status: STATUS.todo },          // terça
  { date: "2026-09-02T21:00:00Z", status: STATUS.inProgress },    // quarta
  { date: "2026-09-03T21:00:00Z", status: STATUS.inProgress },    // quinta (repete)
  { date: "2026-09-04T21:00:00Z", status: STATUS.waitingPR },     // sexta
  { date: "2026-09-05T21:00:00Z", status: STATUS.inProgress },    // sábado
  { date: "2026-09-06T21:00:00Z", status: STATUS.waitingPR },     // domingo
  { date: "2026-09-07T21:00:00Z", status: STATUS.done },          // segunda
];

let log = { lastSnapshot: {}, transitions: [] };
for (const day of days) {
  const items = [{ issueNumber: 1413, title: "Criar o BancoWebhookController", status: day.status }];
  log = detectTransitions(log, items, new Date(day.date));
}

// Em progresso: qua18h->sex18h (17h úteis: quinta + sexta inteiras) +
//               sáb18h->dom18h (0h, fim de semana) = 17h
const devHours = sumStatusHours(log.transitions, STATUS.inProgress);
console.log("dev hours (esperado 17):", devHours);
console.assert(devHours === 17, "devHours incorreto");

// Aguardando PR: sex18h->sáb18h (0h, cai no fim de semana) +
//                dom18h->seg18h (8.5h, 1 dia útil inteiro) = 8.5h
const reviewHours = sumStatusHours(log.transitions, STATUS.waitingPR);
console.log("review hours (esperado 8.5):", reviewHours);
console.assert(reviewHours === 8.5, "reviewHours incorreto");

// Janela do relatório: a issue foi pra "Feito" dentro da semana
const start = new Date("2026-09-01T00:00:00Z");
const end = new Date("2026-09-08T00:00:00Z");
const issues = selectReportIssues(log, { start, end });
console.assert(issues.length === 1, "deveria selecionar a issue 1413");

// Changes requested no sábado de manhã (fora do expediente) -> merge na segunda 18h:
// só a segunda inteira conta (8.5h), sábado inteiro é fim de semana.
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
console.assert(rows[0].postChangeHours === 8.5, "postChangeHours incorreto");
console.assert(rows[0].hadChangesRequested === true, "hadChangesRequested incorreto");

console.log("\nTodos os asserts passaram (nenhuma falha 'Assertion failed' acima).");
