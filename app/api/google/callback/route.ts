import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user ID
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatseo.vercel.app';

  if (error) {
    return NextResponse.redirect(`${appUrl}/onboarding?google_error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/onboarding?google_error=missing_code`);
  }

  // Verify the user is authenticated and matches the state
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${appUrl}/onboarding?google_error=auth_mismatch`);
  }

  // Exchange authorization code for tokens — direct Google API call
  const redirectUri = `${appUrl}/api/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errBody = await tokenResponse.text();
    console.error('Google token exchange failed:', tokenResponse.status, errBody);
    console.error('Redirect URI used:', redirectUri);
    // Parse the error for user display
    let errorDetail = `status_${tokenResponse.status}`;
    try {
      const parsed = JSON.parse(errBody);
      errorDetail = parsed.error_description || parsed.error || errorDetail;
    } catch { /* use status code */ }
    return NextResponse.redirect(`${appUrl}/onboarding?google_error=${encodeURIComponent(errorDetail)}`);
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  const expiresIn = tokens.expires_in || 3600;

  if (!accessToken) {
    return NextResponse.redirect(`${appUrl}/onboarding?google_error=no_access_token`);
  }

  // Save tokens to onboarding_data
  const { data: existing } = await supabase
    .from('onboarding_data')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase.from('onboarding_data').update({
      gsc_connected: true,
      google_access_token: accessToken,
      google_refresh_token: refreshToken || null,
      google_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
  } else {
    await supabase.from('onboarding_data').insert({
      user_id: user.id,
      website_url: '_pending_',
      gsc_connected: true,
      google_access_token: accessToken,
      google_refresh_token: refreshToken || null,
      google_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }

  return NextResponse.redirect(`${appUrl}/onboarding?google_connected=true`);
}
