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

  const body = await request.json() as {
    userId: string;
    type: 'last_month' | 'amount';
    amountCents?: number;
    reason?: string;
  };

  const { userId, type, amountCents, reason } = body;
  if (!userId || !type) {
    return NextResponse.json({ error: 'userId and type are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (type === 'amount') {
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents must be positive' }, { status: 400 });
    }

    // Find latest payment intent to refund against
    const { data: payment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id, amount_cents')
      .eq('user_id', userId)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment?.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No refundable payment found' }, { status: 404 });
    }

    const refund = await getStripe().refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: amountCents,
      reason: 'requested_by_customer',
      metadata: { admin_user_id: user.id, target_user_id: userId, note: reason ?? '' },
    });

    await supabase.from('payments').insert({
      user_id: userId,
      stripe_payment_intent_id: payment.stripe_payment_intent_id,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      amount_cents: -amountCents,
      currency: 'usd',
      status: 'refunded',
      plan: null,
      description: `Admin refund: ${reason ?? 'manual'}`,
      stripe_refund_id: refund.id,
    });

    return NextResponse.json({ ok: true, refundId: refund.id });
  }

  // type === 'last_month'
  const { data: lastPayment } = await supabase
    .from('payments')
    .select('stripe_payment_intent_id, amount_cents, plan')
    .eq('user_id', userId)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastPayment?.stripe_payment_intent_id) {
    return NextResponse.json({ error: 'No refundable payment found' }, { status: 404 });
  }

  const refund = await getStripe().refunds.create({
    payment_intent: lastPayment.stripe_payment_intent_id,
    reason: 'requested_by_customer',
    metadata: { admin_user_id: user.id, target_user_id: userId, note: 'last month refund' },
  });

  await supabase.from('payments').insert({
    user_id: userId,
    stripe_payment_intent_id: lastPayment.stripe_payment_intent_id,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    amount_cents: -lastPayment.amount_cents,
    currency: 'usd',
    status: 'refunded',
    plan: lastPayment.plan,
    description: 'Admin refund: last month',
    stripe_refund_id: refund.id,
  });

  return NextResponse.json({ ok: true, refundId: refund.id });
}
