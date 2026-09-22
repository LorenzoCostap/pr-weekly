import { graphql } from "@octokit/graphql";

const QUERY = `
  query ($org: String!, $number: Int!, $cursor: String) {
    organization(login: $org) {
      projectV2(number: $number) {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            content {
              ... on Issue {
                number
                title
                assignees(first: 10) { nodes { login } }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Retorna os itens do Project atribuídos a `assigneeLogin`, com o status atual.
 * Não existe histórico aqui — é só uma foto do momento (por isso o snapshot.js existe).
 */
export async function getCurrentItems(token, { org, projectNumber, assigneeLogin }) {
  const client = graphql.defaults({ headers: { authorization: `token ${token}` } });

  const items = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await client(QUERY, { org, number: projectNumber, cursor });
    const projectV2 = result.organization?.projectV2;

    if (!projectV2) {
      throw new Error(
        `Não encontrei o Project número ${projectNumber} na organização "${org}". ` +
          `Confirme o PROJECT_NUMBER e o PROJECT_ORG, e confirme que o GH_PAT tem a ` +
          `permissão de organização "Projects: Read-only" e não está pendente de aprovação ` +
          `(GitHub → Settings → Developer settings → Fine-grained tokens → status deve ser "Active").`
      );
    }

    const page = projectV2.items;

    for (const node of page.nodes) {
      const issue = node.content;
      if (!issue?.number) continue; // ignora draft issues / PRs soltos no board

      const isAssignedToMe = issue.assignees.nodes.some((a) => a.login === assigneeLogin);
      if (!isAssignedToMe) continue;

      items.push({
        issueNumber: issue.number,
        title: issue.title,
        status: node.status?.name ?? null,
      });
    }

    hasNextPage = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
  }

  return items;
}
