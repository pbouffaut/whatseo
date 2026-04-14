/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/integrations/encrypt';
import { getJiraResources, getJiraProjects } from '@/lib/integrations/jira';
import type { JiraResource, JiraProject } from '@/lib/integrations/jira';

interface ResourceWithProjects extends JiraResource {
  projects: JiraProject[];
}

interface ResourcesResponse {
  resources: ResourceWithProjects[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(): Promise<NextResponse<ResourcesResponse | ErrorResponse>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: integration, error: dbError } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'jira')
    .single();

  if (dbError || !integration) {
    return NextResponse.json({ error: 'Jira not connected' }, { status: 404 });
  }

  try {
    const accessToken = decrypt(integration.access_token as string);

    const resources = await getJiraResources(accessToken);

    // Fetch projects for each cloud instance in parallel
    const resourcesWithProjects = await Promise.all(
      resources.map(async (resource) => {
        try {
          const projects = await getJiraProjects(accessToken, resource.id);
          return { ...resource, projects };
        } catch (err) {
          console.warn(`Failed to fetch projects for Jira cloud ${resource.id}:`, err);
          return { ...resource, projects: [] };
        }
      })
    );

    return NextResponse.json({ resources: resourcesWithProjects });
  } catch (err) {
    console.error('Failed to fetch Jira resources:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Jira resources' },
      { status: 500 }
    );
  }
}
