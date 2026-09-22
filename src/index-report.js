import "dotenv/config";
import { loadLog } from "./snapshot.js";
import { selectReportIssues, buildReport } from "./metrics.js";
import { findPRsForIssues } from "./github.js";
import { sendReport } from "./email.js";

const DAYS_BACK = 7;

async function main() {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000);

  const log = loadLog();
  const issues = selectReportIssues(log, { start, end });

  const prsByIssueNumber = await findPRsForIssues(process.env.GITHUB_TOKEN, {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    author: process.env.GITHUB_USERNAME,
    issueNumbers: issues.map((i) => i.issueNumber),
  });

  const rows = buildReport(issues, prsByIssueNumber);

  if (rows.length === 0) {
    console.log("Nenhuma task no período — e-mail não enviado.");
    return;
  }

  await sendReport(
    {
      user: process.env.GMAIL_USER,
      appPassword: process.env.GMAIL_APP_PASSWORD,
      to: process.env.BOSS_EMAIL,
    },
    rows
  );

  console.log(`Relatório enviado com ${rows.length} task(s).`);
}

main().catch((err) => {
  console.error("Falha ao gerar relatório:", err);
  process.exit(1);
});
