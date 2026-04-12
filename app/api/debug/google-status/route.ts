import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' });

  const { data } = await supabase
    .from('onboarding_data')
    .select('gsc_connected, google_access_token, google_refresh_token, google_token_expires_at, ga4_property_id')
    .eq('user_id', user.id)
    .single();

  if (!data) return NextResponse.json({ error: 'No onboarding data' });

  return NextResponse.json({
    gsc_connected: data.gsc_connected,
    has_access_token: !!data.google_access_token,
    access_token_length: data.google_access_token?.length || 0,
    has_refresh_token: !!data.google_refresh_token,
    token_expires_at: data.google_token_expires_at,
    ga4_property_id: data.ga4_property_id,
  });
}
