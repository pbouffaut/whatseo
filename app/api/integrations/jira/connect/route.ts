/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StatePayload {
  auditId: string;
  userId: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get('auditId') ?? '';

  const clientId = process.env.JIRA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'Jira OAuth is not configured (missing JIRA_CLIENT_ID or NEXT_PUBLIC_APP_URL)' },
      { status: 500 }
    );
  }

  const statePayload: StatePayload = { auditId, userId: user.id };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

  const redirectUri = `${appUrl}/api/integrations/jira/callback`;

  const scopes = 'read:jira-work write:jira-work offline_access read:me';

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  const atlassianOAuthUrl = `https://auth.atlassian.com/authorize?${params.toString()}`;

  return NextResponse.redirect(atlassianOAuthUrl);
}
