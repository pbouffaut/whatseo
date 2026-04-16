import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { UserRow } from '@/lib/admin/types';
export type { UserRow } from '@/lib/admin/types';

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


export async function GET(request: NextRequest) {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getServiceClient();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));

  // Fetch users — either by search filter or paginated
  let userList: Array<{
    id: string;
    email?: string;
    created_at: string;
  }> = [];
  let total = 0;

  if (search) {
    // For search we fetch a larger batch and filter client-side by email
    const { data: searchResult } = await supabase.auth.admin.listUsers({
      perPage: 500,
      page: 1,
    });
    const allUsers = (searchResult?.users ?? []) as typeof userList;
    const lowerSearch = search.toLowerCase();
    userList = allUsers.filter((u) =>
      (u.email ?? '').toLowerCase().includes(lowerSearch)
    );
    total = userList.length;
    // Apply manual pagination for search results
    userList = userList.slice((page - 1) * limit, page * limit);
  } else {
    const { data: listResult } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });
    userList = (listResult?.users ?? []) as typeof userList;
    total = (listResult as { total?: number } | null)?.total ?? userList.length;
  }

  if (userList.length === 0) {
    return NextResponse.json({ users: [], total: 0 });
  }

  const userIds = userList.map((u) => u.id);

  // Bulk queries — one per table
  const [subsRes, creditsRes, auditsCountRes, lastAuditsRes, onboardingRes] =
    await Promise.all([
      supabase
        .from('subscriptions')
        .select('user_id,plan,status')
        .in('user_id', userIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('audit_credits')
        .select('user_id,status')
        .in('user_id', userIds)
        .eq('status', 'available'),
      supabase
        .from('Audit')
        .select('user_id', { count: 'exact', head: false })
        .in('user_id', userIds),
      supabase
        .from('Audit')
        .select('user_id,id,url,score,status,createdAt')
        .in('user_id', userIds)
        .order('createdAt', { ascending: false }),
      supabase
        .from('onboarding_data')
        .select('user_id,website_url')
        .in('user_id', userIds),
    ]);

  // Build lookup maps
  const subsByUser = new Map<
    string,
    { plan: string; status: string } | null
  >();
  for (const sub of subsRes.data ?? []) {
    if (!subsByUser.has(sub.user_id)) {
      subsByUser.set(sub.user_id, { plan: sub.plan, status: sub.status });
    }
  }

  const creditsByUser = new Map<string, number>();
  for (const credit of creditsRes.data ?? []) {
    creditsByUser.set(
      credit.user_id,
      (creditsByUser.get(credit.user_id) ?? 0) + 1
    );
  }

  const auditCountByUser = new Map<string, number>();
  for (const row of auditsCountRes.data ?? []) {
    auditCountByUser.set(
      row.user_id,
      (auditCountByUser.get(row.user_id) ?? 0) + 1
    );
  }

  const lastAuditByUser = new Map<
    string,
    { createdAt: string; score: number | null }
  >();
  for (const audit of lastAuditsRes.data ?? []) {
    if (!lastAuditByUser.has(audit.user_id)) {
      lastAuditByUser.set(audit.user_id, {
        createdAt: audit.createdAt,
        score: audit.score,
      });
    }
  }

  const onboardingByUser = new Map<string, string | null>();
  for (const row of onboardingRes.data ?? []) {
    onboardingByUser.set(row.user_id, row.website_url ?? null);
  }

  const users: UserRow[] = userList.map((u) => {
    const sub = subsByUser.get(u.id) ?? null;
    const lastAudit = lastAuditByUser.get(u.id) ?? null;
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      plan: sub?.plan ?? null,
      subscription_status: sub?.status ?? null,
      credits_available: creditsByUser.get(u.id) ?? 0,
      audits_total: auditCountByUser.get(u.id) ?? 0,
      last_audit_date: lastAudit?.createdAt ?? null,
      last_score: lastAudit?.score ?? null,
      website_url: onboardingByUser.get(u.id) ?? null,
    };
  });

  return NextResponse.json({ users, total });
}
