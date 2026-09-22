import { toBrasiliaLocal, TZ_OFFSET_MS } from "./business-hours.js";

/**
 * A janela é sempre "a terça mais recente e os 7 dias antes dela" — fixada
 * no calendário, não em "agora". Isso é o que permite disparar manualmente
 * em qualquer dia da semana e ainda assim pegar o período certo (terça a
 * terça), sem depender de rodar exatamente na hora do cron.
 */
export function getReportWindow(now = new Date()) {
  const local = toBrasiliaLocal(now);
  const dayOfWeek = local.getUTCDay(); // 0 = domingo ... 2 = terça
  const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;

  const endLocalMidnight = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceTuesday)
  );
  const endLocal = new Date(endLocalMidnight.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999 da terça
  const startLocal = new Date(endLocalMidnight.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias antes, 00:00

  return {
    start: new Date(startLocal.getTime() + TZ_OFFSET_MS),
    end: new Date(endLocal.getTime() + TZ_OFFSET_MS),
  };
}
