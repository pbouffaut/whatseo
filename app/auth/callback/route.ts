import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const session = data.session;
      const providerToken = session.provider_token;
      const providerRefreshToken = session.provider_refresh_token;
      const user = session.user;

      // ALWAYS save Google tokens when we get them — regardless of redirect destination
      if (providerToken && user) {
        try {
          const { data: existing } = await supabase
            .from('onboarding_data')
            .select('id, website_url')
            .eq('user_id', user.id)
            .single();

          if (existing) {
            await supabase.from('onboarding_data').update({
              gsc_connected: true,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken || null,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id);
          } else {
            await supabase.from('onboarding_data').insert({
              user_id: user.id,
              website_url: '_pending_', // Will be updated in onboarding form
              gsc_connected: true,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken || null,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            });
          }
        } catch (err) {
          // If DB save fails, pass tokens via URL params as fallback
          console.error('Failed to save Google tokens to DB:', err);
          const redirectUrl = new URL(redirect, origin);
          redirectUrl.searchParams.set('gsc_token', providerToken);
          if (providerRefreshToken) {
            redirectUrl.searchParams.set('gsc_refresh', providerRefreshToken);
          }
          return NextResponse.redirect(redirectUrl.toString());
        }
      }

      // Check profile completion (graceful fallback if table doesn't exist yet)
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('profile_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profileErr && !profile?.profile_completed_at) {
          const setupUrl = new URL('/profile-setup', origin);
          setupUrl.searchParams.set('next', redirect);
          return NextResponse.redirect(setupUrl.toString());
        }
      } catch {
        // Table doesn't exist yet — skip profile check and proceed normally
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
