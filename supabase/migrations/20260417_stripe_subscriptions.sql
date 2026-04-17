-- Add Stripe fields to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Payments table for full payment history
CREATE TABLE IF NOT EXISTS payments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_payment_intent_id  text,
  stripe_subscription_id    text,
  stripe_customer_id        text,
  stripe_refund_id          text,
  amount_cents              integer NOT NULL,
  currency                  text NOT NULL DEFAULT 'usd',
  status                    text NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'pending')),
  plan                      text,
  description               text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id      ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at   ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi    ON payments (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- RLS: only service role can read/write (admin API uses service key)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Optionally allow users to read their own payments
CREATE POLICY "users can read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);
