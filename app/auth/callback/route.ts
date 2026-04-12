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

      // If we got Google tokens (from GSC/GA4 OAuth), persist them immediately
      // This is the ONLY reliable place to capture provider_token — it's ephemeral
      if (providerToken && user && redirect.includes('/onboarding')) {
        try {
          // Check if onboarding_data exists
          const { data: existing } = await supabase
            .from('onboarding_data')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (existing) {
            // Update existing onboarding data with tokens
            await supabase.from('onboarding_data').update({
              gsc_connected: true,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken || undefined,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id);
          } else {
            // Create onboarding_data with tokens (website_url placeholder — user fills in onboarding form)
            await supabase.from('onboarding_data').insert({
              user_id: user.id,
              website_url: 'https://example.com', // Placeholder — will be updated on form submit
              gsc_connected: true,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken || null,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            });
          }
        } catch (err) {
          console.error('Failed to save Google tokens:', err);
          // Continue with redirect — don't block the auth flow
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
