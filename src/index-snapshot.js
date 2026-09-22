import "dotenv/config";
import { getCurrentItems } from "./projects.js";
import { loadLog, saveLog, detectTransitions } from "./snapshot.js";

async function main() {
  const currentItems = await getCurrentItems(process.env.GITHUB_TOKEN, {
    org: process.env.PROJECT_ORG,
    projectNumber: Number(process.env.PROJECT_NUMBER),
    assigneeLogin: process.env.GITHUB_USERNAME,
  });

  const log = loadLog();
  detectTransitions(log, currentItems, new Date());
  saveLog(log);

  console.log(`Snapshot salvo com ${currentItems.length} item(ns).`);
}

main().catch((err) => {
  console.error("Falha ao gerar snapshot:", err);
  process.exit(1);
});
