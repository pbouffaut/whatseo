import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import getStripe from '@/lib/stripe';
import { getPlan, type PlanSlug } from '@/lib/plans';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { plan: string };
  const plan = getPlan(body.plan);

  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Look up or create a Stripe customer tied to this Supabase user
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  const isSubscription = plan.intervalMonths !== null;

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: isSubscription ? 'subscription' : 'payment',
    line_items: [
      {
        price: plan.stripePriceId || undefined,
        // Fallback: create price on the fly if price ID not configured
        ...(plan.stripePriceId
          ? {}
          : {
              price_data: {
                currency: 'usd',
                unit_amount: plan.price,
                product_data: { name: plan.name },
                ...(isSubscription
                  ? {
                      recurring: {
                        interval: plan.intervalMonths === 1 ? 'month' : 'year',
                      },
                    }
                  : {}),
              },
            }),
        quantity: 1,
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/${plan.slug}`,
    metadata: {
      supabase_user_id: user.id,
      plan: plan.slug,
    },
    subscription_data: isSubscription
      ? { metadata: { supabase_user_id: user.id, plan: plan.slug } }
      : undefined,
    payment_intent_data: !isSubscription
      ? { metadata: { supabase_user_id: user.id, plan: plan.slug } }
      : undefined,
  });

  return NextResponse.json({ url: session.url });
}
