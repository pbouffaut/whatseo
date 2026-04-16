import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { SubscriptionRow, CreditRow, AuditRow, ScoreHistoryRow, MonitoringRow, ProfileRow } from '@/lib/admin/types';
export type { SubscriptionRow, CreditRow, AuditRow, ScoreHistoryRow, MonitoringRow, ProfileRow } from '@/lib/admin/types';

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  const supabase = getServiceClient();

  // Fetch user from auth
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authUser = userData.user;

  // Parallel data fetches
  const [
    onboardingRes,
    subscriptionsRes,
    creditsRes,
    auditsRes,
    scoreHistoryRes,
    monitoringRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from('onboarding_data')
      .select('user_id,website_url,ga4_property_id,google_refresh_token')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('subscriptions')
      .select('id,user_id,plan,status,amount_cents,interval_months,created_at,expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_credits')
      .select('id,user_id,status,credit_type,amount_cents,audit_id,created_at,used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('Audit')
      .select('id,url,status,score,audit_type,createdAt,error,pages_crawled')
      .eq('user_id', userId)
      .order('createdAt', { ascending: false }),
    supabase
      .from('score_history')
      .select(
        'id,user_id,audit_id,overall,technical,on_page,schema_score,performance,ai_readiness,pages_crawled,recorded_at'
      )
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('monitoring_schedules')
      .select('user_id,enabled,interval_months,next_run_at,last_run_at,last_audit_id')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const onboardingData = onboardingRes.data;

  return NextResponse.json({
    user: {
      id: authUser.id,
      email: authUser.email ?? '',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
    },
    profile: (profileRes.data ?? null) as ProfileRow | null,
    onboarding: onboardingData
      ? {
          website_url: onboardingData.website_url ?? null,
          ga4_property_id: onboardingData.ga4_property_id ?? null,
          has_google_token: !!onboardingData.google_refresh_token,
        }
      : null,
    subscriptions: (subscriptionsRes.data ?? []) as SubscriptionRow[],
    credits: (creditsRes.data ?? []) as CreditRow[],
    audits: (auditsRes.data ?? []) as AuditRow[],
    scoreHistory: (scoreHistoryRes.data ?? []) as ScoreHistoryRow[],
    monitoring: (monitoringRes.data ?? null) as MonitoringRow | null,
  });
}
