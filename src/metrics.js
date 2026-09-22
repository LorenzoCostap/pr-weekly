import { STATUS } from "./config.js";

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

    const movedToDoneInWindow = transitions.some(
      (t) => t.toStatus === STATUS.done && new Date(t.at) >= start && new Date(t.at) <= end
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
 * Soma quantos dias (corridos) a issue passou em `statusName`, somando todos
 * os períodos (pode ter entrado e saído mais de uma vez). Precisão de ~1 dia,
 * pois é a granularidade do snapshot diário.
 */
export function sumStatusDuration(transitions, statusName) {
  let totalMs = 0;
  let prevStatus = null;
  let prevTime = null;

  for (const t of transitions) {
    const at = new Date(t.at);
    if (prevStatus === statusName && prevTime) {
      totalMs += at - prevTime;
    }
    prevStatus = t.toStatus;
    prevTime = at;
  }

  return +(totalMs / 86_400_000).toFixed(1);
}

export function buildReport(issues, prsByIssueNumber) {
  return issues.map((issue) => {
    const devDays = sumStatusDuration(issue.transitions, STATUS.inProgress);
    const reviewDays = sumStatusDuration(issue.transitions, STATUS.waitingPR);
    const pr = prsByIssueNumber.get(issue.issueNumber);

    let postChangeDays = null;
    if (pr?.hadChangesRequested && pr.mergedAt) {
      postChangeDays = +((pr.mergedAt - pr.firstChangesRequestedAt) / 86_400_000).toFixed(1);
    }

    return {
      issueNumber: issue.issueNumber,
      title: issue.title,
      status: issue.status,
      devDays,
      reviewDays,
      hadChangesRequested: pr?.hadChangesRequested ?? null,
      postChangeDays,
      prUrl: pr?.url ?? null,
    };
  });
}
