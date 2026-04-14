/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/integrations/encrypt';

interface GithubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GithubUser {
  id: number;
  login: string;
  email: string | null;
}

interface StatePayload {
  auditId: string;
  userId: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');

  // Decode state to get auditId and userId
  let auditId = '';
  let userId = '';

  try {
    if (!stateParam) throw new Error('Missing state parameter');
    const decoded = Buffer.from(stateParam, 'base64').toString('utf8');
    const state = JSON.parse(decoded) as StatePayload;
    auditId = state.auditId;
    userId = state.userId;
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=github_auth_failed', request.url)
    );
  }

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/results/${auditId}`;

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?error=github_auth_failed`);
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      throw new Error('GitHub OAuth environment variables are not configured');
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/github/callback`,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed with status ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as GithubTokenResponse;

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description ?? tokenData.error ?? 'No access token returned');
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!userRes.ok) {
      throw new Error(`GitHub user fetch failed with status ${userRes.status}`);
    }

    const githubUser = (await userRes.json()) as GithubUser;

    // Upsert integration using service role (bypasses RLS)
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: upsertError } = await db.from('integrations').upsert(
      {
        user_id: userId,
        provider: 'github',
        access_token: encrypt(accessToken),
        refresh_token: null,
        token_expires_at: null,
        metadata: {
          login: githubUser.login,
          email: githubUser.email,
          github_user_id: githubUser.id,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    );

    if (upsertError) {
      throw new Error(`DB upsert failed: ${upsertError.message}`);
    }

    return NextResponse.redirect(`${redirectBase}?connected=github`);
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}?error=github_auth_failed`);
  }
}
