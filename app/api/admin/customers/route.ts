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
    last_sign_in_at?: string | null;
  }> = [];
  let total = 0;

  if (search) {
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

  // Bulk queries
  const [subsRes, creditsRes, auditsRes, onboardingRes, profilesRes] =
    await Promise.all([
      // All subscriptions (not just active)
      supabase
        .from('subscriptions')
        .select('user_id,plan,status,amount_cents,created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // All credits (compute available count client-side)
      supabase
        .from('audit_credits')
        .select('user_id,status')
        .in('user_id', userIds),
      // Audits — no results column; only fields needed
      supabase
        .from('Audit')
        .select('user_id,audit_type,createdAt,score')
        .in('user_id', userIds)
        .order('createdAt', { ascending: false }),
      supabase
        .from('onboarding_data')
        .select('user_id,website_url')
        .in('user_id', userIds),
      // User profiles
      supabase
        .from('user_profiles')
        .select('user_id,first_name,last_name,company,title')
        .in('user_id', userIds),
    ]);

  // Build subscription lookup: all subs per user
  const allSubsByUser = new Map<
    string,
    Array<{ plan: string; status: string; amount_cents: number; created_at: string }>
  >();
  for (const sub of subsRes.data ?? []) {
    const existing = allSubsByUser.get(sub.user_id) ?? [];
    existing.push({
      plan: sub.plan,
      status: sub.status,
      amount_cents: sub.amount_cents,
      created_at: sub.created_at,
    });
    allSubsByUser.set(sub.user_id, existing);
  }

  // Credits available count
  const creditsByUser = new Map<string, number>();
  for (const credit of creditsRes.data ?? []) {
    if (credit.status === 'available') {
      creditsByUser.set(
        credit.user_id,
        (creditsByUser.get(credit.user_id) ?? 0) + 1
      );
    }
  }

  // Audit counts by type + last audit info
  const freeAuditsByUser = new Map<string, number>();
  const paidAuditsByUser = new Map<string, number>();
  const lastAuditByUser = new Map<string, { createdAt: string; score: number | null }>();
  for (const audit of auditsRes.data ?? []) {
    if (audit.audit_type === 'free') {
      freeAuditsByUser.set(audit.user_id, (freeAuditsByUser.get(audit.user_id) ?? 0) + 1);
    } else {
      paidAuditsByUser.set(audit.user_id, (paidAuditsByUser.get(audit.user_id) ?? 0) + 1);
    }
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

  const profilesByUser = new Map<
    string,
    { first_name: string | null; last_name: string | null; company: string | null; title: string | null }
  >();
  for (const row of profilesRes.data ?? []) {
    profilesByUser.set(row.user_id, {
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      company: row.company ?? null,
      title: row.title ?? null,
    });
  }

  const users: UserRow[] = userList.map((u) => {
    const subs = allSubsByUser.get(u.id) ?? [];
    const activeSub = subs.find((s) => s.status === 'active');
    const latestSub = activeSub ?? subs[0] ?? null;
    const lastAudit = lastAuditByUser.get(u.id) ?? null;
    const profile = profilesByUser.get(u.id) ?? null;
    const freeAudits = freeAuditsByUser.get(u.id) ?? 0;
    const paidAudits = paidAuditsByUser.get(u.id) ?? 0;

    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      company: profile?.company ?? null,
      title: profile?.title ?? null,
      plan: latestSub?.plan ?? null,
      subscription_status: latestSub?.status ?? null,
      credits_available: creditsByUser.get(u.id) ?? 0,
      free_audits: freeAudits,
      paid_audits: paidAudits,
      audits_total: freeAudits + paidAudits,
      last_audit_date: lastAudit?.createdAt ?? null,
      last_score: lastAudit?.score ?? null,
      website_url: onboardingByUser.get(u.id) ?? null,
      subscriptions_all: subs,
    };
  });

  return NextResponse.json({ users, total });
}
