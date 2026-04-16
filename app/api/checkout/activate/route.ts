import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, plan } = body as { userId: string; plan: 'monthly' | 'bimonthly' };

  if (!userId || !plan) {
    return NextResponse.json({ error: 'Missing userId or plan' }, { status: 400 });
  }

  if (plan !== 'monthly' && plan !== 'bimonthly') {
    return NextResponse.json({ error: 'Invalid plan. Must be "monthly" or "bimonthly"' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. Verify the subscription exists and is active
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subError || !subscription) {
    console.error('[checkout/activate] subscription not found or inactive:', subError);
    return NextResponse.json({ error: 'No active subscription found for this user' }, { status: 404 });
  }

  // 2. Compute interval and next_run_at
  const intervalMonths = plan === 'monthly' ? 1 : 2;

  const nextRunAt = new Date();
  nextRunAt.setMonth(nextRunAt.getMonth() + intervalMonths);

  // 3. Upsert into monitoring_schedules
  const { error: upsertError } = await supabase
    .from('monitoring_schedules')
    .upsert(
      {
        user_id: userId,
        enabled: true,
        interval_months: intervalMonths,
        next_run_at: nextRunAt.toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('[checkout/activate] upsert error:', upsertError);
    return NextResponse.json({ error: 'Failed to create monitoring schedule' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
