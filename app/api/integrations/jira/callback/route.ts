/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/integrations/encrypt';

interface StatePayload {
  auditId: string;
  userId: string;
}

interface AtlassianTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

interface AtlassianUser {
  account_id: string;
  email: string;
  name: string;
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
      new URL('/dashboard?error=jira_auth_failed', request.url)
    );
  }

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/results/${auditId}`;

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?error=jira_auth_failed`);
  }

  try {
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      throw new Error('Jira OAuth environment variables are not configured');
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/jira/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Jira token exchange failed (${tokenRes.status}): ${body}`);
    }

    const tokenData = (await tokenRes.json()) as AtlassianTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('No access token returned from Atlassian');
    }

    // Fetch user email from Atlassian identity API
    const meRes = await fetch('https://api.atlassian.com/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!meRes.ok) {
      throw new Error(`Atlassian user fetch failed with status ${meRes.status}`);
    }

    const atlassianUser = (await meRes.json()) as AtlassianUser;

    // Calculate token expiry timestamp
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Upsert integration using service role (bypasses RLS)
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: upsertError } = await db.from('integrations').upsert(
      {
        user_id: userId,
        provider: 'jira',
        access_token: encrypt(tokenData.access_token),
        refresh_token: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        token_expires_at: tokenExpiresAt,
        metadata: {
          email: atlassianUser.email,
          name: atlassianUser.name,
          account_id: atlassianUser.account_id,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    );

    if (upsertError) {
      throw new Error(`DB upsert failed: ${upsertError.message}`);
    }

    return NextResponse.redirect(`${redirectBase}?connected=jira`);
  } catch (err) {
    console.error('Jira OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}?error=jira_auth_failed`);
  }
}
