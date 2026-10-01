import { STATUS } from "./config.js";
import { businessMillisBetween } from "./business-hours.js";

/**
 * Escolhe as issues relevantes pro relatório: as que foram pra "Feito" dentro
 * da janela (concluídas essa semana), ou as que estão "Aguardando PR" agora
 * (ainda em revisão, independente de quando entraram nesse status).
 */
export function selectReportIssues(log, { start, end }) {
  const result = [];

  for (const [issueNumberStr, snapshot] of Object.entries(log.lastSnapshot)) {
    const issueNumber = Number(issueNumberStr);
    const transitions = log.transitions
      .filter((t) => t.issueNumber === issueNumber)
      .sort((a, b) => new Date(a.at) - new Date(b.at));

    // t.fromStatus só existe em transições de verdade (status A -> status B).
    // A primeira observação de uma task não tem fromStatus — é só o ponto de
    // partida da contagem, não significa que ela "virou Feito agora".
    const movedToDoneInWindow = transitions.some(
      (t) => t.fromStatus && t.toStatus === STATUS.done && new Date(t.at) >= start && new Date(t.at) <= end
    );
    const isWaitingNow = snapshot.status === STATUS.waitingPR;

    if (!movedToDoneInWindow && !isWaitingNow) continue;

    result.push({
      issueNumber,
      title: snapshot.title,
      status: snapshot.status,
      transitions,
    });
  }

  return result;
}

/**
 * Soma quantas horas ÚTEIS (dentro do expediente, seg a sex) a issue passou
 * em `statusName`, somando todos os períodos. Tempo fora do expediente ou
 * em fim de semana não entra na conta.
 */
export function sumStatusHours(transitions, statusName) {
  let totalMs = 0;
  let prevStatus = null;
  let prevTime = null;

  for (const t of transitions) {
    const at = new Date(t.at);
    if (prevStatus === statusName && prevTime) {
      totalMs += businessMillisBetween(prevTime, at);
    }
    prevStatus = t.toStatus;
    prevTime = at;
  }

  return +(totalMs / 3_600_000).toFixed(1);
}

export function buildReport(issues, prsByIssueNumber) {
  return issues.map((issue) => {
    const devHours = sumStatusHours(issue.transitions, STATUS.inProgress);
    const reviewHours = sumStatusHours(issue.transitions, STATUS.waitingPR);
    const pr = prsByIssueNumber.get(issue.issueNumber);

    let postChangeHours = null;
    if (pr?.hadChangesRequested && pr.mergedAt) {
      const ms = businessMillisBetween(pr.firstChangesRequestedAt, pr.mergedAt);
      postChangeHours = +(ms / 3_600_000).toFixed(1);
    }

    return {
      issueNumber: issue.issueNumber,
      title: issue.title,
      status: issue.status,
      devHours,
      reviewHours,
      hadChangesRequested: pr?.hadChangesRequested ?? null,
      postChangeHours,
      changeReasons: pr?.changeRequests ?? [],
      prUrl: pr?.url ?? null,
    };
  });
}
