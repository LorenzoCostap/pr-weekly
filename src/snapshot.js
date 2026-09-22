import fs from "node:fs";

const LOG_PATH = "data/status-log.json";

export function loadLog() {
  if (!fs.existsSync(LOG_PATH)) {
    return { lastSnapshot: {}, transitions: [] };
  }
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
}

export function saveLog(log) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n");
}

/**
 * Compara os itens de hoje com o snapshot salvo e registra toda mudança de
 * status encontrada. Como o Projects não guarda histórico, essa é a única
 * forma de saber "quando" uma task mudou — com a precisão de 1 dia (o
 * intervalo entre execuções deste workflow).
 */
export function detectTransitions(log, currentItems, runAt) {
  const at = runAt.toISOString();

  for (const item of currentItems) {
    const previous = log.lastSnapshot[item.issueNumber];

    if (!previous) {
      // primeira vez que vemos essa task — vira o ponto de partida da contagem
      log.transitions.push({ issueNumber: item.issueNumber, toStatus: item.status, at });
    } else if (previous.status !== item.status) {
      log.transitions.push({
        issueNumber: item.issueNumber,
        fromStatus: previous.status,
        toStatus: item.status,
        at,
      });
    }

    log.lastSnapshot[item.issueNumber] = { status: item.status, title: item.title };
  }

  return log;
}
