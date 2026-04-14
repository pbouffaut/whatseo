'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import type { User } from '@supabase/supabase-js';
import { Check, AlertCircle, Zap } from 'lucide-react';

interface OnboardingData {
  website_url: string;
  gsc_connected: boolean;
  ga4_property_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  competitor_urls: string[];
  avg_deal_value?: number | null;
  conversion_rate_pct?: number | null;
  [key: string]: unknown;
}

interface AuditCredit {
  id: string;
  credit_type: string;
  status: string;
  amount_cents: number;
  audit_id: string | null;
  created_at: string;
  used_at: string | null;
}

interface Subscription {
  plan: string;
  status: string;
  expires_at: string | null;
  [key: string]: unknown;
}

type ConfirmStep = 'idle' | 'confirming' | 'running' | 'purchasing';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [audits, setAudits] = useState<Record<string, unknown>[]>([]);
  const [credits, setCredits] = useState<AuditCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('idle');
  const [error, setError] = useState('');
  const [runningAudit, setRunningAudit] = useState<Record<string, unknown> | null>(null);

  const availableCredits = credits.filter((c) => c.status === 'available');

  function getAddonButton(sub: Subscription, onClick: () => void, step: ConfirmStep) {
    const plan = PLANS[sub.plan as keyof typeof PLANS];
    if (!plan || !plan.addonPrice) return null;
    const price = plan.addonDisplayPrice ?? '$449';
    return (
      <button onClick={onClick} disabled={step === 'purchasing'}
        className="bg-surface-high text-on-surface px-6 py-2.5 rounded-full font-semibold hover:bg-surface-highest transition-colors text-sm">
        Buy Extra Audit &mdash; {price} (10% subscriber discount)
      </button>
    );
  }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setUser(user);

    const [subRes, onbRes, auditRes, creditRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('onboarding_data').select('*').eq('user_id', user.id).single(),
      supabase.from('Audit').select('*').eq('user_id', user.id).order('createdAt', { ascending: false }).limit(20),
      supabase.from('audit_credits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const sub = subRes.data as Subscription | null;
    const creds = (creditRes.data as AuditCredit[]) || [];

    // Auto-fix: if user has active subscription but zero AVAILABLE credits, grant one
    const hasAvailable = creds.some((c) => c.status === 'available');
    const hasCompletedFullAudit = (auditRes.data || []).some(
      (a: Record<string, unknown>) => a.audit_type === 'full' && a.status === 'complete'
    );
    if (sub && sub.status === 'active' && !hasAvailable && !hasCompletedFullAudit) {
      const { data: newCredit } = await supabase.from('audit_credits').insert({
        user_id: user.id,
        credit_type: sub.plan === 'professional' ? 'one_time' : 'subscription',
        status: 'available',
        amount_cents: PLANS[sub.plan as keyof typeof PLANS]?.price || 499_00,
      }).select().single();
      if (newCredit) creds.push(newCredit as AuditCredit);
    }

    // Check for running audits
    const allAudits = auditRes.data || [];
    const running = allAudits.find((a: Record<string, unknown>) => a.status === 'running');
    setRunningAudit(running || null);

    setSubscription(sub);
    setOnboarding(onbRes.data as OnboardingData | null);
    setAudits(allAudits);
    setCredits(creds);
    setLoading(false);
  }

  async function handleRunAudit() {
    if (!user || !onboarding || availableCredits.length === 0) return;
    setConfirmStep('running');
    setError('');

    try {
      const res = await fetch('/api/full-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: onboarding.website_url,
          competitorUrls: onboarding.competitor_urls || [],
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start audit');
      }

      router.push(`/audit-progress/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
      setConfirmStep('idle');
    }
  }

  async function handleBuyAddon() {
    if (!user || !subscription) return;
    setConfirmStep('purchasing');

    try {
      const plan = PLANS[subscription.plan as keyof typeof PLANS];
      const addonPrice = plan?.addonPrice || 499_00;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await supabase.from('audit_credits').insert({
        user_id: user.id,
        credit_type: 'addon',
        status: 'available',
        amount_cents: addonPrice,
      });

      setConfirmStep('idle');
      loadData();
    } catch {
      setError('Failed to purchase addon. Please try again.');
      setConfirmStep('idle');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const planLabels: Record<string, string> = {
    professional: 'Professional Audit',
    monthly: 'Monthly Monitor',
    bimonthly: 'Bi-Monthly Monitor',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-2">Dashboard</p>
            <h1 className="font-serif text-3xl text-on-surface tracking-tight">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
          </div>
          <button onClick={handleSignOut}
            className="px-5 py-2 rounded-full text-sm text-on-surface-muted bg-surface-high hover:bg-surface-highest transition-colors">
            Sign Out
          </button>
        </div>

        {/* Credits & Run Audit */}
        <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-on-surface">Audit Credits</h2>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-primary font-bold text-lg">{availableCredits.length}</span>
              <span className="text-on-surface-muted text-sm">available</span>
            </div>
          </div>

          {/* Running audit banner */}
          {runningAudit && (
            <div className="bg-primary-fixed/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <p className="text-on-surface text-sm font-medium">Audit in progress</p>
                  <p className="text-on-surface-muted text-xs">{String(runningAudit.url)}</p>
                </div>
              </div>
              <Link href={`/audit-progress/${runningAudit.id}`}
                className="bg-gradient-cta text-on-primary px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
                View Progress
              </Link>
            </div>
          )}

          {onboarding ? (
            <>
              {!runningAudit && confirmStep === 'idle' && availableCredits.length > 0 && (
                <button onClick={() => setConfirmStep('confirming')}
                  className="bg-gradient-cta text-on-primary px-8 py-3 rounded-full font-semibold hover:opacity-90 hover:scale-[1.02] transition-all flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Run Audit Now
                </button>
              )}

              {!runningAudit && confirmStep === 'idle' && availableCredits.length === 0 && (
                <div>
                  <p className="text-on-surface-muted text-sm mb-4">No credits remaining. Purchase more to run an audit.</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/checkout/professional"
                      className="bg-gradient-cta text-on-primary px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm">
                      Buy One-Time Audit — $499
                    </Link>
                    {!subscription && (
                      <Link href="/#pricing"
                        className="bg-surface-high text-on-surface px-6 py-2.5 rounded-full font-semibold hover:bg-surface-highest transition-colors text-sm">
                        View Subscription Plans
                      </Link>
                    )}
                    {subscription && getAddonButton(subscription, handleBuyAddon, confirmStep)}
                  </div>
                </div>
              )}

              {confirmStep === 'confirming' && (
                <div className="bg-surface-low rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-on-surface font-semibold mb-1">Confirm Audit</h3>
                      <p className="text-on-surface-muted text-sm leading-relaxed">
                        This will use <span className="text-primary font-medium">1 audit credit</span> and start a full analysis of:
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-white rounded-xl p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-muted">Website</span>
                      <span className="text-on-surface font-medium">{onboarding.website_url}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-muted">Search Console</span>
                      <span className={onboarding.gsc_connected ? 'text-tertiary' : 'text-on-surface-light'}>
                        {onboarding.gsc_connected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-muted">GA4 Property</span>
                      <span className={onboarding.ga4_property_id ? 'text-on-surface' : 'text-on-surface-light'}>
                        {onboarding.ga4_property_id || 'Not configured'}
                      </span>
                    </div>
                    {onboarding.competitor_urls?.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-muted">Competitors</span>
                        <span className="text-on-surface">{onboarding.competitor_urls.length} tracked</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-muted">Credits remaining after</span>
                      <span className="text-primary font-medium">{availableCredits.length - 1}</span>
                    </div>
                  </div>

                  {/* Warnings for missing integrations */}
                  {(!onboarding.gsc_connected || !onboarding.ga4_property_id || (onboarding.gsc_connected && !onboarding.google_access_token)) && (
                    <div className="bg-primary-fixed/30 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-primary text-sm font-medium">Missing data sources</p>
                      </div>
                      <div className="space-y-1 ml-6">
                        {!onboarding.gsc_connected && (
                          <p className="text-on-surface-muted text-xs">
                            <strong>Google Search Console</strong> not connected — audit will not include real search queries, clicks, impressions, or ranking data.
                          </p>
                        )}
                        {onboarding.gsc_connected && !onboarding.google_access_token && (
                          <p className="text-on-surface-muted text-xs">
                            <strong>Google tokens expired</strong> — please reconnect Google in Settings to refresh your access tokens.
                          </p>
                        )}
                        {!onboarding.ga4_property_id && (
                          <p className="text-on-surface-muted text-xs">
                            <strong>GA4 Property ID</strong> not configured — audit will not include organic traffic, engagement rates, or conversion data.
                          </p>
                        )}
                      </div>
                      <Link href="/onboarding" className="text-primary text-xs hover:text-primary-container mt-2 inline-block">
                        Connect now in Settings →
                      </Link>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleRunAudit}
                      className="bg-gradient-cta text-on-primary px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                      <Check className="w-4 h-4" /> {(!onboarding.gsc_connected || !onboarding.ga4_property_id) ? 'Run Anyway' : 'Confirm & Run Audit'}
                    </button>
                    <button onClick={() => setConfirmStep('idle')}
                      className="px-6 py-3 rounded-full text-on-surface-muted hover:text-on-surface transition-colors">
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-on-surface-light mt-3">
                    <Link href="/onboarding" className="text-primary hover:text-primary-container">Edit configuration</Link> before running if needed.
                  </p>
                </div>
              )}

              {confirmStep === 'running' && (
                <div className="flex items-center gap-3 py-4">
                  <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-primary font-medium">Running audit on {onboarding.website_url}...</span>
                </div>
              )}

              {confirmStep === 'purchasing' && (
                <div className="flex items-center gap-3 py-4">
                  <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-primary font-medium">Processing additional credit purchase...</span>
                </div>
              )}

              {error && <p className="text-error text-sm mt-3">{error}</p>}
            </>
          ) : (
            <div>
              <p className="text-on-surface-muted text-sm mb-4">Configure your audit settings before running your first analysis.</p>
              <Link href="/onboarding" className="bg-gradient-cta text-on-primary px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity inline-block">
                Set Up Now
              </Link>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
          <h2 className="font-serif text-xl text-on-surface mb-4">Subscription</h2>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-on-surface font-medium">{planLabels[subscription.plan] || subscription.plan}</p>
                <p className="text-on-surface-muted text-sm mt-1">
                  {'Status: '}
                  <span className={subscription.status === 'active' ? 'text-tertiary' : 'text-on-surface-muted'}>{subscription.status}</span>
                  {subscription.expires_at ? ` · Expires ${new Date(subscription.expires_at).toLocaleDateString()}` : ''}
                </p>
              </div>
              <span className="bg-tertiary-fixed/30 text-tertiary text-xs font-bold px-3 py-1 rounded-full">Active</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-on-surface-muted text-sm">No active subscription</p>
              <Link href="/#pricing" className="text-primary text-sm hover:text-primary-container">View plans</Link>
            </div>
          )}
        </div>

        {/* Audit Configuration */}
        <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-on-surface">Audit Configuration</h2>
            <Link href="/onboarding" className="text-primary text-sm hover:text-primary-container">
              {onboarding ? 'Edit' : 'Set up'}
            </Link>
          </div>
          {onboarding ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-secondary uppercase tracking-[0.1em] mb-1">Website</p>
                <p className="text-on-surface text-sm">{onboarding.website_url}</p>
              </div>
              {onboarding.gsc_connected && (
                <div>
                  <p className="text-xs text-secondary uppercase tracking-[0.1em] mb-1">Search Console</p>
                  <p className="text-tertiary text-sm">Connected</p>
                </div>
              )}
              {onboarding.ga4_property_id && (
                <div>
                  <p className="text-xs text-secondary uppercase tracking-[0.1em] mb-1">GA4 Property</p>
                  <p className="text-on-surface text-sm">{onboarding.ga4_property_id}</p>
                </div>
              )}
              {onboarding.competitor_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-secondary uppercase tracking-[0.1em] mb-1">Competitors</p>
                  <p className="text-on-surface text-sm">{onboarding.competitor_urls.length} tracked</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-on-surface-muted text-sm">Complete your audit setup to get the most accurate analysis.</p>
          )}
        </div>

        {/* Audit History */}
        <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
          <h2 className="font-serif text-xl text-on-surface mb-4">Audit History</h2>
          {audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <Link key={String(audit.id)} href={`/results/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-low hover:bg-surface-high transition-colors block">
                  <div>
                    <p className="text-on-surface text-sm font-medium">{String(audit.url)}</p>
                    <p className="text-on-surface-light text-xs mt-1">
                      {new Date(audit.createdAt as string).toLocaleDateString()} · {String(audit.status)}
                    </p>
                  </div>
                  {audit.score != null && (
                    <div className={`text-lg font-bold ${
                      Number(audit.score) >= 70 ? 'text-tertiary' : Number(audit.score) >= 40 ? 'text-primary' : 'text-error'
                    }`}>
                      {String(audit.score)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-muted text-sm">No audits yet. Use a credit to run your first audit.</p>
          )}
        </div>

        {/* Credit History */}
        {credits.length > 0 && (
          <div className="mt-6 bg-surface-white rounded-[2rem] shadow-ambient p-8">
            <h2 className="font-serif text-xl text-on-surface mb-4">Credit History</h2>
            <div className="space-y-2">
              {credits.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${credit.status === 'available' ? 'bg-tertiary' : 'bg-on-surface-light'}`} />
                    <span className="text-on-surface-muted capitalize">{credit.credit_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-on-surface-light text-xs">{new Date(credit.created_at).toLocaleDateString()}</span>
                    <span className={credit.status === 'available' ? 'text-tertiary font-medium' : 'text-on-surface-light'}>
                      {credit.status === 'available' ? 'Available' : credit.status === 'used' ? 'Used' : 'Expired'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-on-surface-light text-xs">Signed in as {user?.email}</p>
        </div>
      </div>
    </div>
  );
}
