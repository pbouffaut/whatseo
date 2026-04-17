import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function isAdmin(email: string | undefined) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as {
    userId: string;
    quantity: number;
    creditType: 'subscription' | 'lifetime' | 'one_time';
    note?: string;
  };

  const { userId, quantity, creditType, note } = body;

  if (!userId || !quantity || quantity < 1) {
    return NextResponse.json({ error: 'userId and quantity >= 1 required' }, { status: 400 });
  }
  if (!['subscription', 'lifetime', 'one_time'].includes(creditType)) {
    return NextResponse.json({ error: 'invalid creditType' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const rows = Array.from({ length: quantity }, () => ({
    user_id: userId,
    status: 'available',
    credit_type: creditType,
    amount_cents: 0,
    note: note ?? null,
  }));

  const { data, error } = await supabase.from('audit_credits').insert(rows).select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credits: data });
}
