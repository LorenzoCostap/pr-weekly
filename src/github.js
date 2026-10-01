import { Octokit } from "@octokit/rest";

/**
 * Pra cada PR aberta pelo autor no repo, verifica se o número de alguma issue
 * do relatório aparece no título ou no nome da branch (ex: "1413 - corrige
 * login" ou branch "1413-corrige-login") — esse é o vínculo manual que vocês usam.
 *
 * Retorna um Map<issueNumber, infoDaPR>.
 */
export async function findPRsForIssues(token, { owner, repo, author, issueNumbers }) {
  const octokit = new Octokit({ auth: token });
  const matched = new Map();

  if (issueNumbers.length === 0) return matched;

  const { data } = await octokit.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:pr author:${author}`,
    per_page: 100,
  });

  for (const item of data.items) {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: item.number,
    });

    const haystack = `${pr.title} ${pr.head.ref}`;
    const issueNumber = issueNumbers.find((n) => matchesIssueNumber(haystack, n));
    if (!issueNumber) continue;

    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: item.number,
    });

    const changeRequests = reviews
      .filter((r) => r.state === "CHANGES_REQUESTED")
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

    matched.set(issueNumber, {
      number: pr.number,
      url: pr.html_url,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      hadChangesRequested: changeRequests.length > 0,
      // tempo pós-alteração continua medido a partir da 1ª rodada — é o
      // tempo total gasto nas idas e voltas, até o merge final.
      firstChangesRequestedAt: changeRequests[0]
        ? new Date(changeRequests[0].submitted_at)
        : null,
      // mas o motivo guarda TODAS as rodadas, em ordem — uma PR difícil
      // pode ter 3-4 pedidos de alteração diferentes.
      changeRequests: changeRequests.map((r) => ({
        at: new Date(r.submitted_at),
        reason: r.body?.trim() || null,
        reviewer: r.user?.login ?? null,
      })),
    });
  }

  return matched;
}

// Usa borda de "não-dígito" pra não confundir "1413" com parte de "14130" ou "21413"
function matchesIssueNumber(text, issueNumber) {
  const re = new RegExp(`(^|[^0-9])${issueNumber}($|[^0-9])`);
  return re.test(text);
}
