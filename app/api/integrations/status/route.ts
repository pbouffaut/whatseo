/*
 * Required DB migration:
 *
 * CREATE TABLE IF NOT EXISTS integrations (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   provider TEXT NOT NULL CHECK (provider IN ('github', 'jira')),
 *   access_token TEXT NOT NULL,
 *   refresh_token TEXT,
 *   token_expires_at TIMESTAMPTZ,
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(user_id, provider)
 * );
 * CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface IntegrationRow {
  provider: string;
  metadata: { login?: string; email?: string } | null;
}

interface StatusResponse {
  github: boolean;
  jira: boolean;
  githubLogin?: string;
  jiraEmail?: string;
}

export async function GET(): Promise<NextResponse<StatusResponse>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ github: false, jira: false });
  }

  const { data: rows, error } = await supabase
    .from('integrations')
    .select('provider, metadata')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to fetch integrations:', error);
    return NextResponse.json({ github: false, jira: false });
  }

  const integrations = (rows ?? []) as IntegrationRow[];

  const githubRow = integrations.find((r) => r.provider === 'github');
  const jiraRow = integrations.find((r) => r.provider === 'jira');

  const response: StatusResponse = {
    github: !!githubRow,
    jira: !!jiraRow,
  };

  if (githubRow?.metadata?.login) {
    response.githubLogin = githubRow.metadata.login;
  }
  if (jiraRow?.metadata?.email) {
    response.jiraEmail = jiraRow.metadata.email;
  }

  return NextResponse.json(response);
}
