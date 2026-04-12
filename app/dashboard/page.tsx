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
  competitor_urls: string[];
  priority_pages: string[];
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
        className="bg-warm-white/5 text-warm-white px-6 py-2.5 rounded-full font-semibold hover:bg-warm-white/10 transition-colors border border-warm-white/10 text-sm">
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
      // Call the full audit API — it handles credit consumption, crawling, analysis
      const res = await fetch('/api/full-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: onboarding.website_url,
          priorityPages: onboarding.priority_pages || [],
          competitorUrls: onboarding.competitor_urls || [],
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start audit');
      }

      // Redirect to progress page
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

      // Simulate payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Add credit
      await supabase.from('audit_credits').insert({
        user_id: user.id,
        credit_type: 'addon',
        status: 'available',
        amount_cents: addonPrice,
      });

      setConfirmStep('idle');
      loadData(); // Refresh
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
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-gold" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-2">Dashboard</p>
            <h1 className="font-serif text-3xl text-warm-white">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
          </div>
          <button onClick={handleSignOut}
            className="px-5 py-2 rounded-full text-sm text-warm-gray border border-warm-white/10 hover:text-warm-white hover:border-warm-white/20 transition-colors">
            Sign Out
          </button>
        </div>

        {/* Credits & Run Audit */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-white">Audit Credits</h2>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              <span className="text-gold font-bold text-lg">{availableCredits.length}</span>
              <span className="text-warm-gray text-sm">available</span>
            </div>
          </div>

          {/* Running audit banner */}
          {runningAudit && (
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-gold" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <p className="text-warm-white text-sm font-medium">Audit in progress</p>
                  <p className="text-warm-gray text-xs">{String(runningAudit.url)}</p>
                </div>
              </div>
              <Link href={`/audit-progress/${runningAudit.id}`}
                className="bg-gold text-dark px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold-light transition-colors">
                View Progress
              </Link>
            </div>
          )}

          {onboarding ? (
            <>
              {/* Confirmation Flow — hide if audit is running */}
              {!runningAudit && confirmStep === 'idle' && availableCredits.length > 0 && (
                <button onClick={() => setConfirmStep('confirming')}
                  className="bg-gold text-dark px-8 py-3 rounded-full font-semibold hover:bg-gold-light transition-colors flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Run Audit Now
                </button>
              )}

              {!runningAudit && confirmStep === 'idle' && availableCredits.length === 0 && (
                <div>
                  <p className="text-warm-gray text-sm mb-4">No credits remaining. Purchase more to run an audit.</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/checkout/professional"
                      className="bg-gold text-dark px-6 py-2.5 rounded-full font-semibold hover:bg-gold-light transition-colors text-sm">
                      Buy One-Time Audit — $499
                    </Link>
                    {!subscription && (
                      <Link href="/#pricing"
                        className="bg-warm-white/5 text-warm-white px-6 py-2.5 rounded-full font-semibold hover:bg-warm-white/10 transition-colors border border-warm-white/10 text-sm">
                        View Subscription Plans
                      </Link>
                    )}
                    {subscription && getAddonButton(subscription, handleBuyAddon, confirmStep)}
                  </div>
                </div>
              )}

              {confirmStep === 'confirming' && (
                <div className="bg-dark/50 rounded-xl p-6 border border-gold/20">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-warm-white font-semibold mb-1">Confirm Audit</h3>
                      <p className="text-warm-gray text-sm leading-relaxed">
                        This will use <span className="text-gold font-medium">1 audit credit</span> and start a full analysis of:
                      </p>
                    </div>
                  </div>

                  <div className="bg-warm-white/5 rounded-lg p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-gray">Website</span>
                      <span className="text-warm-white font-medium">{onboarding.website_url}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-gray">Search Console</span>
                      <span className={onboarding.gsc_connected ? 'text-[#4aab6a]' : 'text-warm-gray-light'}>
                        {onboarding.gsc_connected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-gray">GA4 Property</span>
                      <span className={onboarding.ga4_property_id ? 'text-warm-white' : 'text-warm-gray-light'}>
                        {onboarding.ga4_property_id || 'Not configured'}
                      </span>
                    </div>
                    {onboarding.competitor_urls?.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-warm-gray">Competitors</span>
                        <span className="text-warm-white">{onboarding.competitor_urls.length} tracked</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-gray">Credits remaining after</span>
                      <span className="text-gold font-medium">{availableCredits.length - 1}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleRunAudit}
                      className="bg-gold text-dark px-6 py-3 rounded-full font-semibold hover:bg-gold-light transition-colors flex items-center gap-2">
                      <Check className="w-4 h-4" /> Confirm &amp; Run Audit
                    </button>
                    <button onClick={() => setConfirmStep('idle')}
                      className="px-6 py-3 rounded-full text-warm-gray hover:text-warm-white transition-colors">
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-warm-gray-light mt-3">
                    <Link href="/onboarding" className="text-gold hover:text-gold-light">Edit configuration</Link> before running if needed.
                  </p>
                </div>
              )}

              {confirmStep === 'running' && (
                <div className="flex items-center gap-3 py-4">
                  <svg className="animate-spin h-5 w-5 text-gold" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-gold font-medium">Running audit on {onboarding.website_url}...</span>
                </div>
              )}

              {confirmStep === 'purchasing' && (
                <div className="flex items-center gap-3 py-4">
                  <svg className="animate-spin h-5 w-5 text-gold" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-gold font-medium">Processing additional credit purchase...</span>
                </div>
              )}

              {error && <p className="text-[#e05555] text-sm mt-3">{error}</p>}
            </>
          ) : (
            <div>
              <p className="text-warm-gray text-sm mb-4">Configure your audit settings before running your first analysis.</p>
              <Link href="/onboarding" className="bg-gold text-dark px-6 py-2.5 rounded-full font-semibold hover:bg-gold-light transition-colors inline-block">
                Set Up Now
              </Link>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Subscription</h2>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warm-white font-medium">{planLabels[subscription.plan] || subscription.plan}</p>
                <p className="text-warm-gray text-sm mt-1">
                  {'Status: '}
                  <span className={subscription.status === 'active' ? 'text-[#4aab6a]' : 'text-warm-gray'}>{subscription.status}</span>
                  {subscription.expires_at ? ` · Expires ${new Date(subscription.expires_at).toLocaleDateString()}` : ''}
                </p>
              </div>
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 rounded-full">Active</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-warm-gray text-sm">No active subscription</p>
              <Link href="/#pricing" className="text-gold text-sm hover:text-gold-light">View plans</Link>
            </div>
          )}
        </div>

        {/* Audit Configuration */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-white">Audit Configuration</h2>
            <Link href="/onboarding" className="text-gold text-sm hover:text-gold-light">
              {onboarding ? 'Edit' : 'Set up'}
            </Link>
          </div>
          {onboarding ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Website</p>
                <p className="text-warm-white text-sm">{onboarding.website_url}</p>
              </div>
              {onboarding.gsc_connected && (
                <div>
                  <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Search Console</p>
                  <p className="text-[#4aab6a] text-sm">Connected</p>
                </div>
              )}
              {onboarding.ga4_property_id && (
                <div>
                  <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">GA4 Property</p>
                  <p className="text-warm-white text-sm">{onboarding.ga4_property_id}</p>
                </div>
              )}
              {onboarding.competitor_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Competitors</p>
                  <p className="text-warm-white text-sm">{onboarding.competitor_urls.length} tracked</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-warm-gray text-sm">Complete your audit setup to get the most accurate analysis.</p>
          )}
        </div>

        {/* Audit History */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Audit History</h2>
          {audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <Link key={String(audit.id)} href={`/results/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-warm-white/3 hover:bg-warm-white/5 transition-colors block">
                  <div>
                    <p className="text-warm-white text-sm font-medium">{String(audit.url)}</p>
                    <p className="text-warm-gray-light text-xs mt-1">
                      {new Date(audit.createdAt as string).toLocaleDateString()} · {String(audit.status)}
                    </p>
                  </div>
                  {audit.score != null && (
                    <div className={`text-lg font-bold ${
                      Number(audit.score) >= 70 ? 'text-[#4aab6a]' : Number(audit.score) >= 40 ? 'text-[#d4952b]' : 'text-[#e05555]'
                    }`}>
                      {String(audit.score)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-warm-gray text-sm">No audits yet. Use a credit to run your first audit.</p>
          )}
        </div>

        {/* Credit History */}
        {credits.length > 0 && (
          <div className="mt-6 bg-dark-card rounded-2xl border border-warm-white/8 p-6">
            <h2 className="text-lg font-semibold text-warm-white mb-4">Credit History</h2>
            <div className="space-y-2">
              {credits.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${credit.status === 'available' ? 'bg-[#4aab6a]' : 'bg-warm-gray-light'}`} />
                    <span className="text-warm-gray capitalize">{credit.credit_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-warm-gray-light text-xs">{new Date(credit.created_at).toLocaleDateString()}</span>
                    <span className={credit.status === 'available' ? 'text-[#4aab6a] font-medium' : 'text-warm-gray-light'}>
                      {credit.status === 'available' ? 'Available' : credit.status === 'used' ? 'Used' : 'Expired'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-warm-gray-light text-xs">Signed in as {user?.email}</p>
        </div>
      </div>
    </div>
  );
}
