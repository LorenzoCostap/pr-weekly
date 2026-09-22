// Brasília não tem mais horário de verão desde 2019 — por isso um offset
// fixo de -3h já resolve, sem precisar de biblioteca de timezone.
export const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

// Janelas de expediente, em minutos desde 00:00 (horário local).
const WORK_WINDOWS = [
  { startMin: 8 * 60, endMin: 11 * 60 + 45 }, // 08:00–11:45
  { startMin: 13 * 60 + 15, endMin: 18 * 60 }, // 13:15–18:00
];

export function toBrasiliaLocal(utcDate) {
  return new Date(utcDate.getTime() - TZ_OFFSET_MS);
}

/**
 * Quanto do intervalo [start, end] cai dentro do expediente (seg a sex,
 * dentro das janelas de WORK_WINDOWS). Sábado, domingo e horário fora do
 * expediente não contam nada.
 */
export function businessMillisBetween(start, end) {
  if (end <= start) return 0;

  let totalMs = 0;
  let cursor = toBrasiliaLocal(start);
  const localEnd = toBrasiliaLocal(end);

  while (cursor < localEnd) {
    const dayStart = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate())
    );
    const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayEnd = nextDayStart < localEnd ? nextDayStart : localEnd;

    const dayOfWeek = cursor.getUTCDay(); // 0 = domingo, 6 = sábado
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isWeekday) {
      for (const w of WORK_WINDOWS) {
        const winStart = new Date(dayStart.getTime() + w.startMin * 60 * 1000);
        const winEnd = new Date(dayStart.getTime() + w.endMin * 60 * 1000);

        const overlapStart = cursor > winStart ? cursor : winStart;
        const overlapEnd = dayEnd < winEnd ? dayEnd : winEnd;

        if (overlapEnd > overlapStart) {
          totalMs += overlapEnd - overlapStart;
        }
      }
    }

    cursor = dayEnd;
  }

  return totalMs;
}
