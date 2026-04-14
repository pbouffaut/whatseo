/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured (missing GITHUB_CLIENT_ID or NEXT_PUBLIC_APP_URL)' },
      { status: 500 }
    );
  }

  const statePayload = JSON.stringify({ auditId, userId: user.id });
  const state = Buffer.from(statePayload).toString('base64');

  const redirectUri = `${appUrl}/api/integrations/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo',
    state,
    redirect_uri: redirectUri,
  });

  const githubOAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(githubOAuthUrl);
}
