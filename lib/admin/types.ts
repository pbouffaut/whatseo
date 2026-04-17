// Shared types for admin dashboard — used by both API routes and client pages.
// Must not import from Next.js server-only modules.

export interface FailedAuditRow {
  id: string;
  url: string;
  user_id: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  user_email: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  plan: string | null;
  subscription_status: string | null;
  credits_available: number;
  free_audits: number;
  paid_audits: number;
  audits_total: number;
  last_audit_date: string | null;
  last_score: number | null;
  website_url: string | null;
  subscriptions_all: Array<{ plan: string; status: string; amount_cents: number; created_at: string }>;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  profile_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount_cents: number;
  interval_months: number | null;
  created_at: string;
  expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

export interface CreditRow {
  id: string;
  user_id: string;
  status: string;
  credit_type: string;
  amount_cents: number;
  audit_id: string | null;
  created_at: string;
  used_at: string | null;
}

export interface AuditRow {
  id: string;
  url: string;
  status: string;
  score: number | null;
  audit_type: string;
  createdAt: string;
  error: string | null;
  pages_crawled: number | null;
}

export interface ScoreHistoryRow {
  id: string;
  user_id: string;
  audit_id: string;
  overall: number;
  technical: number | null;
  on_page: number | null;
  schema_score: number | null;
  performance: number | null;
  ai_readiness: number | null;
  pages_crawled: number | null;
  recorded_at: string;
}

export interface MonitoringRow {
  user_id: string;
  enabled: boolean;
  interval_months: number;
  next_run_at: string | null;
  last_run_at: string | null;
  last_audit_id: string | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_refund_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  plan: string | null;
  description: string | null;
  created_at: string;
}
