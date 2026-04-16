import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { FailedAuditRow } from '@/lib/admin/types';
export type { FailedAuditRow } from '@/lib/admin/types';


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

  const { data: audits, error } = await supabase
    .from('Audit')
    .select('id,url,user_id,error,createdAt,updatedAt')
    .eq('status', 'failed')
    .order('updatedAt', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const rows = audits ?? [];

  // Look up user emails
  const emailResults = await Promise.all(
    rows.map(async (audit) => {
      const { data } = await supabase.auth.admin.getUserById(audit.user_id);
      return {
        userId: audit.user_id,
        email: data?.user?.email ?? null,
      };
    })
  );

  const emailMap = new Map<string, string | null>(
    emailResults.map((r) => [r.userId, r.email])
  );

  const result: FailedAuditRow[] = rows.map((audit) => ({
    id: audit.id,
    url: audit.url,
    user_id: audit.user_id,
    error: audit.error ?? null,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    user_email: emailMap.get(audit.user_id) ?? null,
  }));

  return NextResponse.json({ audits: result });
}
