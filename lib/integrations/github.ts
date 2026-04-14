import type { AuditTicket } from '@/lib/analyzer/types';

const GITHUB_API = 'https://api.github.com';

// Priority → label names
const PRIORITY_LABELS: Record<AuditTicket['priority'], string[]> = {
  P0: ['seo', 'critical'],
  P1: ['seo', 'high'],
  P2: ['seo', 'medium'],
  P3: ['seo', 'low'],
};

export interface GithubRepo {
  id: number;
  full_name: string;
  private: boolean;
}

export interface CreatedGithubIssue {
  id: number;
  number: number;
  title: string;
  url: string;
}

export interface PushGithubResult {
  created: CreatedGithubIssue[];
  errors: string[];
}

/**
 * Returns the top 50 repos for the authenticated user, sorted by last push date.
 */
export async function getGithubRepos(accessToken: string): Promise<GithubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?per_page=50&sort=pushed&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub repos fetch failed (${res.status}): ${body}`);
  }

  const repos = (await res.json()) as Array<{ id: number; full_name: string; private: boolean }>;
  return repos.map(({ id, full_name, private: isPrivate }) => ({
    id,
    full_name,
    private: isPrivate,
  }));
}

/**
 * Ensures the label exists on the repo. Ignores 422 (label already exists).
 */
async function ensureLabel(
  accessToken: string,
  repoFullName: string,
  name: string,
  color: string,
  description: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, color, description }),
  });

  // 201 = created, 422 = already exists — both are acceptable
  if (!res.ok && res.status !== 422) {
    const body = await res.text();
    console.warn(`Failed to create label "${name}" on ${repoFullName} (${res.status}): ${body}`);
  }
}

/**
 * Builds the markdown body for a GitHub issue from an AuditTicket.
 */
function buildIssueBody(ticket: AuditTicket): string {
  const criteriaList = ticket.acceptanceCriteria
    .map((c) => `- [ ] ${c}`)
    .join('\n');

  const dependenciesList =
    ticket.dependencies.length > 0
      ? ticket.dependencies.map((d) => `- ${d}`).join('\n')
      : '_None_';

  return `## Description

${ticket.description}

## Acceptance Criteria

${criteriaList}

## Testing Instructions

\`\`\`
${ticket.testingInstructions}
\`\`\`

## Dependencies

${dependenciesList}

## Story Points

**${ticket.storyPoints}**

---
_Category: ${ticket.category} | Priority: ${ticket.priority}_
`;
}

/**
 * Pushes an array of AuditTickets as GitHub Issues to the specified repository.
 */
export async function pushTicketsToGithub(
  accessToken: string,
  repoFullName: string,
  tickets: AuditTicket[]
): Promise<PushGithubResult> {
  // Ensure the base "seo" label exists
  await ensureLabel(accessToken, repoFullName, 'seo', 'c9a85c', 'SEO audit ticket');

  const created: CreatedGithubIssue[] = [];
  const errors: string[] = [];

  for (const ticket of tickets) {
    const labels = PRIORITY_LABELS[ticket.priority] ?? ['seo'];

    // Ensure priority-specific labels exist (best-effort, ignore failures)
    const priorityLabel = labels.find((l) => l !== 'seo');
    if (priorityLabel) {
      await ensureLabel(accessToken, repoFullName, priorityLabel, 'e4e669', `Priority: ${priorityLabel}`);
    }

    const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[SEO] ${ticket.title}`,
        body: buildIssueBody(ticket),
        labels,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      errors.push(`Failed to create issue "${ticket.title}" (${res.status}): ${body}`);
      continue;
    }

    const issue = (await res.json()) as { id: number; number: number; title: string; html_url: string };
    created.push({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
    });
  }

  return { created, errors };
}
