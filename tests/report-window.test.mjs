import { getReportWindow } from "../src/report-window.js";

// 2026-09-22 é uma terça-feira.
const tuesday = getReportWindow(new Date("2026-09-22T10:00:00Z"));
const thursday = getReportWindow(new Date("2026-09-24T15:00:00Z"));
const nextMonday = getReportWindow(new Date("2026-09-28T09:00:00Z"));
const nextTuesday = getReportWindow(new Date("2026-09-29T10:00:00Z"));

console.log("terça:", tuesday);
console.log("quinta:", thursday);
console.log("segunda seguinte:", nextMonday);
console.log("terça seguinte:", nextTuesday);

console.assert(
  tuesday.start.getTime() === thursday.start.getTime() && tuesday.end.getTime() === thursday.end.getTime(),
  "disparar na quinta deveria dar a mesma janela que disparar na terça"
);
console.assert(
  tuesday.start.getTime() === nextMonday.start.getTime() && tuesday.end.getTime() === nextMonday.end.getTime(),
  "disparar na segunda seguinte ainda deveria dar a mesma janela"
);
console.assert(
  nextTuesday.start.getTime() !== tuesday.start.getTime(),
  "na terça seguinte a janela deveria ter avançado"
);

console.log("\nTodos os asserts passaram (nenhuma falha 'Assertion failed' acima).");
