'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  interface OnboardingData {
    website_url: string;
    gsc_connected: boolean;
    ga4_property_id: string | null;
    competitor_urls: string[];
    priority_pages: string[];
    notification_channel: string;
    [key: string]: unknown;
  }
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [audits, setAudits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    setUser(user);

    const [subRes, onbRes, auditRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('onboarding_data').select('*').eq('user_id', user.id).single(),
      supabase.from('Audit').select('*').eq('user_id', user.id).order('createdAt', { ascending: false }).limit(10),
    ]);

    setSubscription(subRes.data);
    setOnboarding(onbRes.data as OnboardingData | null);
    setAudits(auditRes.data || []);
    setLoading(false);
  }

  async function handleRunAudit() {
    if (!user || !onboarding) return;
    setRunningAudit(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: onboarding.website_url,
          email: user.email,
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (data.status === 'complete') {
        router.push(`/results/${data.id}`);
      } else if (data.status === 'failed') {
        setRunningAudit(false);
        alert(data.error || 'Audit failed. Please try again.');
      } else {
        // Polling fallback
        router.push(`/analyze?url=${encodeURIComponent(String(onboarding.website_url))}&email=${encodeURIComponent(user.email || '')}`);
      }
    } catch {
      setRunningAudit(false);
      alert('Failed to start audit. Please try again.');
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
          <button
            onClick={handleSignOut}
            className="px-5 py-2 rounded-full text-sm text-warm-gray border border-warm-white/10 hover:text-warm-white hover:border-warm-white/20 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Subscription</h2>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warm-white font-medium">{planLabels[String(subscription.plan)] || String(subscription.plan)}</p>
                <p className="text-warm-gray text-sm mt-1">
                  {'Status: '}
                  <span className={String(subscription.status) === 'active' ? 'text-[#4aab6a]' : 'text-warm-gray'}>{String(subscription.status)}</span>
                  {subscription.expires_at ? ` · Expires ${new Date(String(subscription.expires_at)).toLocaleDateString()}` : ''}
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
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
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
              <button
                onClick={handleRunAudit}
                disabled={runningAudit}
                className="bg-gold text-dark px-8 py-3 rounded-full font-semibold hover:bg-gold-light transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {runningAudit ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Running audit...
                  </>
                ) : (
                  'Run Audit Now'
                )}
              </button>
            </>
          ) : (
            <div>
              <p className="text-warm-gray text-sm mb-4">
                Complete your audit setup to start your first analysis.
              </p>
              <Link href="/onboarding" className="bg-gold text-dark px-6 py-2.5 rounded-full font-semibold hover:bg-gold-light transition-colors inline-block">
                Set Up Now
              </Link>
            </div>
          )}
        </div>

        {/* Audits */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Your Audits</h2>
          {audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <Link
                  key={String(audit.id)}
                  href={`/results/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-warm-white/3 hover:bg-warm-white/5 transition-colors block"
                >
                  <div>
                    <p className="text-warm-white text-sm font-medium">{String(audit.url)}</p>
                    <p className="text-warm-gray-light text-xs mt-1">
                      {new Date(audit.createdAt as string).toLocaleDateString()} &middot; {String(audit.status)}
                    </p>
                  </div>
                  {audit.score !== null && audit.score !== undefined && (
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
            <p className="text-warm-gray text-sm">No audits yet. Run your first audit using the button above.</p>
          )}
        </div>

        {/* Account */}
        <div className="mt-8 text-center">
          <p className="text-warm-gray-light text-xs">
            Signed in as {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
