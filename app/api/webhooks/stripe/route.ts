import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import getStripe from '@/lib/stripe';
import type Stripe from 'stripe';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// In Stripe v22 (2026-03-25.dahlia):
// - invoice.subscription → invoice.parent.subscription_details.subscription
// - invoice.payment_intent → invoice.payments[].payment_intent (expanded)
// - subscription.current_period_end → subscription.items.data[0].current_period_end

function getSubIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return null;
  const sub = subDetails.subscription;
  return typeof sub === 'string' ? sub : (sub?.id ?? null);
}

function getPeriodEndFromSubscription(sub: Stripe.Subscription): number | null {
  const firstItem = sub.items?.data?.[0];
  return firstItem?.current_period_end ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, sub);
        break;
      }
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getServiceClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.supabase_user_id;
  const planSlug = session.metadata?.plan;
  if (!userId || !planSlug) return;

  const amountTotal = session.amount_total ?? 0;
  const stripeCustomerId = session.customer as string;

  // Record payment
  await supabase.from('payments').insert({
    user_id: userId,
    stripe_payment_intent_id: session.payment_intent as string | null,
    stripe_subscription_id: session.subscription as string | null,
    stripe_customer_id: stripeCustomerId,
    amount_cents: amountTotal,
    currency: session.currency ?? 'usd',
    status: 'succeeded',
    plan: planSlug,
    description: `${planSlug} checkout`,
  });

  if (session.mode === 'payment') {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: planSlug,
      status: 'active',
      amount_cents: amountTotal,
      interval_months: null,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: null,
      expires_at: null,
    });

    await supabase.from('audit_credits').insert({
      user_id: userId,
      status: 'available',
      credit_type: 'one_time',
      amount_cents: amountTotal,
    });
  } else if (session.mode === 'subscription' && session.subscription) {
    const stripeSubId = session.subscription as string;
    const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId);
    const periodEndTimestamp = getPeriodEndFromSubscription(stripeSub);
    const periodEnd = periodEndTimestamp
      ? new Date(periodEndTimestamp * 1000).toISOString()
      : null;
    const creditsToIssue = planSlug === 'yearly' ? 12 : 1;

    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: planSlug,
      status: 'active',
      amount_cents: amountTotal,
      interval_months: planSlug === 'yearly' ? 12 : 1,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubId,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      expires_at: periodEnd,
    });

    const creditRows = Array.from({ length: creditsToIssue }, () => ({
      user_id: userId,
      status: 'available',
      credit_type: 'subscription',
      amount_cents: 0,
    }));
    await supabase.from('audit_credits').insert(creditRows);
  }
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
) {
  // Skip first invoice — already handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') return;

  const stripeSubId = getSubIdFromInvoice(invoice);
  if (!stripeSubId) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, plan')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle();

  if (!sub) return;

  // Fetch subscription to get updated period end
  const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId);
  const periodEndTimestamp = getPeriodEndFromSubscription(stripeSub);
  const periodEnd = periodEndTimestamp
    ? new Date(periodEndTimestamp * 1000).toISOString()
    : null;

  await supabase
    .from('subscriptions')
    .update({ current_period_end: periodEnd, expires_at: periodEnd, status: 'active' })
    .eq('stripe_subscription_id', stripeSubId);

  // Get payment intent from the invoice payments list
  const firstPayment = invoice.payments?.data?.[0];
  const piRef = firstPayment?.payment?.payment_intent ?? null;
  const piId = typeof piRef === 'string' ? piRef : (piRef as Stripe.PaymentIntent | null | undefined)?.id ?? null;

  await supabase.from('payments').insert({
    user_id: sub.user_id,
    stripe_payment_intent_id: piId,
    stripe_subscription_id: stripeSubId,
    stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer | null)?.id ?? null,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    plan: sub.plan,
    description: 'subscription renewal',
  });

  await supabase.from('audit_credits').insert({
    user_id: sub.user_id,
    status: 'available',
    credit_type: 'subscription',
    amount_cents: 0,
  });
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
) {
  const stripeSubId = getSubIdFromInvoice(invoice);
  if (!stripeSubId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', stripeSubId);

  const firstPayment = invoice.payments?.data?.[0];
  const piRef = firstPayment?.payment?.payment_intent ?? null;
  const piId = typeof piRef === 'string' ? piRef : (piRef as Stripe.PaymentIntent | null | undefined)?.id ?? null;

  await supabase.from('payments').insert({
    user_id: null,
    stripe_payment_intent_id: piId,
    stripe_subscription_id: stripeSubId,
    stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : null,
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    plan: null,
    description: 'payment failed',
  });
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  stripeSub: Stripe.Subscription,
) {
  const periodEndTimestamp = getPeriodEndFromSubscription(stripeSub);
  const periodEnd = periodEndTimestamp
    ? new Date(periodEndTimestamp * 1000).toISOString()
    : null;

  await supabase
    .from('subscriptions')
    .update({
      status: stripeSub.status,
      current_period_end: periodEnd,
      expires_at: periodEnd,
      cancel_at_period_end: stripeSub.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', stripeSub.id);
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getServiceClient>,
  stripeSub: Stripe.Subscription,
) {
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', stripeSub.id);
}
