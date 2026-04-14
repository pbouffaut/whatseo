/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/integrations/encrypt';
import { getGithubRepos, type GithubRepo } from '@/lib/integrations/github';

interface ReposResponse {
  repos: GithubRepo[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(): Promise<NextResponse<ReposResponse | ErrorResponse>> {
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
    .eq('provider', 'github')
    .single();

  if (dbError || !integration) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 404 });
  }

  try {
    const accessToken = decrypt(integration.access_token as string);
    const repos = await getGithubRepos(accessToken);
    return NextResponse.json({ repos });
  } catch (err) {
    console.error('Failed to fetch GitHub repos:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch repos' },
      { status: 500 }
    );
  }
}
