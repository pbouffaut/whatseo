import type { AuditTicket } from '@/lib/analyzer/types';

const ATLASSIAN_API = 'https://api.atlassian.com';
const ATLASSIAN_AUTH = 'https://auth.atlassian.com';

// Priority → Jira priority name
const PRIORITY_MAP: Record<AuditTicket['priority'], string> = {
  P0: 'Highest',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

export interface JiraResource {
  id: string;
  name: string;
  url: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface CreatedJiraIssue {
  key: string;
  url: string;
  summary: string;
}

export interface PushJiraResult {
  created: CreatedJiraIssue[];
  errors: string[];
}

/**
 * Fetches accessible Atlassian cloud instances for the authenticated user.
 */
export async function getJiraResources(accessToken: string): Promise<JiraResource[]> {
  const res = await fetch(`${ATLASSIAN_API}/oauth/token/accessible-resources`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira resources fetch failed (${res.status}): ${body}`);
  }

  const resources = (await res.json()) as Array<{ id: string; name: string; url: string }>;
  return resources.map(({ id, name, url }) => ({ id, name, url }));
}

/**
 * Fetches all projects for a given Atlassian cloud instance.
 */
export async function getJiraProjects(
  accessToken: string,
  cloudId: string
): Promise<JiraProject[]> {
  const res = await fetch(
    `${ATLASSIAN_API}/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira projects fetch failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { values: Array<{ id: string; key: string; name: string }> };
  return data.values.map(({ id, key, name }) => ({ id, key, name }));
}

/**
 * Refreshes Jira OAuth tokens using a refresh token.
 */
export async function refreshJiraToken(refreshToken: string): Promise<JiraTokenResponse> {
  const res = await fetch(`${ATLASSIAN_AUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as JiraTokenResponse;
  return data;
}

/**
 * Builds an Atlassian Document Format (ADF) document for a Jira issue description.
 */
function buildAdfDescription(ticket: AuditTicket): Record<string, unknown> {
  const bulletListItems = ticket.acceptanceCriteria.map((criterion) => ({
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: criterion }],
      },
    ],
  }));

  return {
    version: 1,
    type: 'doc',
    content: [
      // Description section
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Description' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: ticket.description }],
      },
      // Acceptance Criteria section
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }],
      },
      {
        type: 'bulletList',
        content: bulletListItems,
      },
      // Testing Instructions section
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Testing Instructions' }],
      },
      {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: ticket.testingInstructions }],
      },
      // Dependencies section
      ...(ticket.dependencies.length > 0
        ? [
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Dependencies' }],
            },
            {
              type: 'bulletList',
              content: ticket.dependencies.map((dep) => ({
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: dep }],
                  },
                ],
              })),
            },
          ]
        : []),
      // Story Points section
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Story Points' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: String(ticket.storyPoints),
            marks: [{ type: 'strong' }],
          },
        ],
      },
    ],
  };
}

/**
 * Pushes an array of AuditTickets as Jira Tasks to the specified project.
 */
export async function pushTicketsToJira(
  accessToken: string,
  cloudId: string,
  projectKey: string,
  tickets: AuditTicket[]
): Promise<PushJiraResult> {
  const created: CreatedJiraIssue[] = [];
  const errors: string[] = [];

  const baseUrl = `${ATLASSIAN_API}/ex/jira/${cloudId}/rest/api/3`;

  // Fetch cloud URL for building issue browse links
  let cloudUrl = 'https://your-domain.atlassian.net';
  try {
    const resources = await getJiraResources(accessToken);
    const cloud = resources.find((r) => r.id === cloudId);
    if (cloud) cloudUrl = cloud.url;
  } catch {
    // Non-fatal: we'll still push tickets even if we can't resolve the URL
  }

  for (const ticket of tickets) {
    const labels = ['seo', ticket.category.toLowerCase()];
    const priority = PRIORITY_MAP[ticket.priority] ?? 'Medium';

    const payload = {
      fields: {
        project: { key: projectKey },
        summary: `[SEO] ${ticket.title}`,
        description: buildAdfDescription(ticket),
        issuetype: { name: 'Task' },
        priority: { name: priority },
        labels,
      },
    };

    const res = await fetch(`${baseUrl}/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      errors.push(`Failed to create Jira issue "${ticket.title}" (${res.status}): ${body}`);
      continue;
    }

    const issue = (await res.json()) as { key: string; id: string };
    // Derive the browse URL from the cloud instance
    created.push({
      key: issue.key,
      url: `${cloudUrl}/browse/${issue.key}`,
      summary: `[SEO] ${ticket.title}`,
    });
  }

  return { created, errors };
}
