import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import getStripe from '@/lib/stripe';

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

  const body = await request.json() as { userId: string; immediately?: boolean };
  const { userId, immediately = false } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('stripe_subscription_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active Stripe subscription found' }, { status: 404 });
  }

  if (immediately) {
    await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('id', sub.id);
  } else {
    await getStripe().subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', sub.id);
  }

  return NextResponse.json({ ok: true, immediately });
}
