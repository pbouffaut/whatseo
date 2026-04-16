import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  // Auth check
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { userId?: string; note?: string };
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: credit, error } = await supabase
    .from('audit_credits')
    .insert({
      user_id: userId,
      status: 'available',
      credit_type: 'admin_reissue',
      amount_cents: 0,
    })
    .select('id')
    .single();

  if (error || !credit) {
    console.error('reissue-credit error:', error);
    return NextResponse.json(
      { error: 'Failed to issue credit' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, creditId: credit.id });
}
