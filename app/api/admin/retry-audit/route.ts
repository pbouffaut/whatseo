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

  const body = await request.json() as { auditId?: string };
  const { auditId } = body;

  if (!auditId) {
    return NextResponse.json({ error: 'auditId is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Get audit to find user_id
  const { data: audit, error: auditError } = await supabase
    .from('Audit')
    .select('id,user_id,status')
    .eq('id', auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  const { user_id } = audit;

  // Check if user already has an available credit
  const { data: existingCredit } = await supabase
    .from('audit_credits')
    .select('id')
    .eq('user_id', user_id)
    .eq('status', 'available')
    .limit(1)
    .single();

  if (!existingCredit) {
    // Issue a new credit
    const { error: insertError } = await supabase
      .from('audit_credits')
      .insert({
        user_id,
        status: 'available',
        credit_type: 'admin_reissue',
        amount_cents: 0,
      });

    if (insertError) {
      console.error('retry-audit credit insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to issue credit' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
