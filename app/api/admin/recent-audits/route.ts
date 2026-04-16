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

export interface RecentAuditRow {
  id: string;
  url: string;
  user_id: string;
  score: number | null;
  status: string;
  audit_type: string;
  createdAt: string;
  user_email: string | null;
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

  const { data: audits, error } = await supabase
    .from('Audit')
    .select('id,url,user_id,score,status,audit_type,createdAt')
    .eq('status', 'complete')
    .eq('audit_type', 'full')
    .order('createdAt', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const rows = audits ?? [];

  // Look up user emails in parallel
  const emailResults = await Promise.all(
    rows.map(async (audit) => {
      const { data } = await supabase.auth.admin.getUserById(audit.user_id);
      return { userId: audit.user_id, email: data?.user?.email ?? null };
    })
  );

  const emailMap = new Map<string, string | null>(
    emailResults.map((r) => [r.userId, r.email])
  );

  const result: RecentAuditRow[] = rows.map((audit) => ({
    id: audit.id,
    url: audit.url,
    user_id: audit.user_id,
    score: audit.score,
    status: audit.status,
    audit_type: audit.audit_type,
    createdAt: audit.createdAt,
    user_email: emailMap.get(audit.user_id) ?? null,
  }));

  return NextResponse.json({ audits: result });
}
