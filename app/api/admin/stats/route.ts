import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET() {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getServiceClient();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todayIso = startOfToday.toISOString();
  const weekIso = startOfWeek.toISOString();
  const monthIso = startOfMonth.toISOString();

  // Run all queries in parallel
  const [
    auditsTodayRes,
    auditsWeekRes,
    auditsMonthRes,
    auditsTotalRes,
    failedTodayRes,
    failedWeekRes,
    creditsRes,
    creditsMonthRes,
    revenueRes,
    revenueMonthRes,
    monitoringRes,
    usersRes,
    subsRes,
  ] = await Promise.all([
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', todayIso),
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', weekIso),
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', monthIso),
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('createdAt', todayIso),
    supabase
      .from('Audit')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('createdAt', weekIso),
    supabase
      .from('audit_credits')
      .select('status', { count: 'exact', head: false })
      .in('status', ['available', 'used']),
    supabase
      .from('audit_credits')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthIso),
    supabase
      .from('subscriptions')
      .select('amount_cents')
      .eq('status', 'active'),
    supabase
      .from('subscriptions')
      .select('amount_cents')
      .eq('status', 'active')
      .gte('created_at', monthIso),
    supabase
      .from('monitoring_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('enabled', true),
    supabase.auth.admin.listUsers({ perPage: 1 }),
    supabase
      .from('subscriptions')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  // Compute credit breakdown
  const allCredits = creditsRes.data ?? [];
  const creditsAvailable = allCredits.filter((c) => c.status === 'available').length;
  const creditsUsed = allCredits.filter((c) => c.status === 'used').length;

  // Revenue totals
  const totalRevenue = (revenueRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );
  const monthRevenue = (revenueMonthRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );

  const totalUsers =
    (usersRes.data as { total?: number } | null)?.total ?? 0;

  return NextResponse.json({
    audits: {
      today: auditsTodayRes.count ?? 0,
      week: auditsWeekRes.count ?? 0,
      month: auditsMonthRes.count ?? 0,
      total: auditsTotalRes.count ?? 0,
    },
    failed: {
      today: failedTodayRes.count ?? 0,
      week: failedWeekRes.count ?? 0,
    },
    users: {
      total: totalUsers,
      withSubscription: subsRes.count ?? 0,
    },
    credits: {
      available: creditsAvailable,
      used: creditsUsed,
      issuedThisMonth: creditsMonthRes.count ?? 0,
    },
    revenue: {
      total_cents: totalRevenue,
      thisMonth_cents: monthRevenue,
    },
    monitoring: {
      active: monitoringRes.count ?? 0,
    },
  });
}
