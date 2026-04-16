'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import type { User } from '@supabase/supabase-js';
import { Check, AlertCircle, Zap, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from 'lucide-react';

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

interface AuditRow {
  id: string;
  url: string;
  status: string;
  score: number | null;
  createdAt: string;
  audit_type: string;
}

interface Subscription {
  plan: string;
  status: string;
  expires_at: string | null;
  [key: string]: unknown;
}

type ConfirmStep = 'idle' | 'confirming' | 'running' | 'purchasing';

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-primary`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6 animate-pulse">
      <div className="h-5 w-32 bg-surface-high rounded-full mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 bg-surface-high rounded-full" />
        <div className="h-4 w-1/2 bg-surface-high rounded-full" />
      </div>
    </div>
  );
}

// ─── Score Trend Chart ──────────────────────────────────────────────────────

interface ScoreHistoryPoint {
  overall: number;
  recordedAt: string;
}

function ScoreTrendChart({ scoreHistory }: { scoreHistory: ScoreHistoryPoint[] }) {
  const W = 280;
  const H = 80;
  const PAD_X = 20;
  const PAD_Y = 14;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  if (scoreHistory.length === 0) return null;

  if (scoreHistory.length === 1) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <circle cx={W / 2} cy={H / 2} r={4} fill="#c9a85c" />
        <text
          x={W / 2}
          y={H / 2 + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#c9a85c"
          fontFamily="sans-serif"
        >
          Baseline set
        </text>
      </svg>
    );
  }

  const scores = scoreHistory.map((p) => p.overall);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const toX = (i: number) =>
    PAD_X + (i / (scoreHistory.length - 1)) * innerW;
  const toY = (v: number) =>
    PAD_Y + innerH - ((v - minScore) / range) * innerH;

  const points = scoreHistory.map((p, i) => `${toX(i)},${toY(p.overall)}`).join(' ');

  const firstScore = scoreHistory[0].overall;
  const lastScore = scoreHistory[scoreHistory.length - 1].overall;
  const lastIdx = scoreHistory.length - 1;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#c9a85c"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {scoreHistory.map((p, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(p.overall)}
          r={3}
          fill="#c9a85c"
        />
      ))}
      {/* First label */}
      <text
        x={toX(0)}
        y={H - 2}
        textAnchor="middle"
        fontSize="9"
        fill="#c9a85c"
        fontFamily="sans-serif"
      >
        {firstScore}
      </text>
      {/* Last label */}
      <text
        x={toX(lastIdx)}
        y={H - 2}
        textAnchor="middle"
        fontSize="9"
        fill="#c9a85c"
        fontFamily="sans-serif"
      >
        {lastScore}
      </text>
    </svg>
  );
}

// ─── Types for monitoring ────────────────────────────────────────────────────

interface MonitoringSchedule {
  enabled: boolean;
  intervalMonths: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastAuditId: string | null;
}

interface ScoreHistoryEntry {
  auditId: string;
  overall: number;
  technical: number | null;
  onPage: number | null;
  schema: number | null;
  performance: number | null;
  aiReadiness: number | null;
  pagesCrawled: number | null;
  recordedAt: string;
}

// ─── Plan labels ─────────────────────────────────────────────────────────────

const planLabels: Record<string, string> = {
  professional: 'Professional Audit',
  monthly: 'Monthly Monitor',
  bimonthly: 'Bi-Monthly Monitor',
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Each section loads independently
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [onboarding, setOnboarding] = useState<OnboardingData | null | undefined>(undefined);
  const [audits, setAudits] = useState<AuditRow[] | undefined>(undefined);
  const [credits, setCredits] = useState<AuditCredit[] | undefined>(undefined);

  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('idle');
  const [error, setError] = useState('');
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [showAllAudits, setShowAllAudits] = useState(false);

  // Monitoring
  const [monitoringSchedule, setMonitoringSchedule] = useState<MonitoringSchedule | null | undefined>(undefined);
  const [monitoringScoreHistory, setMonitoringScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringToggling, setMonitoringToggling] = useState(false);

  const availableCredits = (credits ?? []).filter((c) => c.status === 'available');
  const runningAudit = (audits ?? []).find((a) => a.status === 'running');
  const visibleAudits = showAllAudits ? (audits ?? []) : (audits ?? []).slice(0, 5);

  // Step 1: auth check — fast, unblocks the page shell immediately
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setUser(user);
      setAuthChecked(true);
    });
  }, []);

  // Step 2: fire all queries in parallel once auth is confirmed
  useEffect(() => {
    if (!authChecked || !user) return;

    // Subscriptions + onboarding — lightweight
    supabase.from('subscriptions')
      .select('plan,status,expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setSubscription(data as Subscription | null));

    supabase.from('onboarding_data')
      .select('website_url,gsc_connected,ga4_property_id,google_access_token,google_refresh_token,competitor_urls,avg_deal_value,conversion_rate_pct')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setOnboarding(data as OnboardingData | null));

    // Audits — only the columns needed for the list (no insights/pdf blobs)
    supabase.from('Audit')
      .select('id,url,status,score,createdAt,audit_type')
      .eq('user_id', user.id)
      .order('createdAt', { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        const rows = (data ?? []) as AuditRow[];
        setAudits(rows);

        // Auto-grant credit if needed (only after audits are known)
        const subSnap = await supabase.from('subscriptions').select('plan,status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
        const sub = subSnap.data as Subscription | null;
        const credSnap = await supabase.from('audit_credits').select('id,credit_type,status,amount_cents,audit_id,created_at,used_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
        const creds = (credSnap.data ?? []) as AuditCredit[];

        const hasAvailable = creds.some((c) => c.status === 'available');
        const hasCompletedFull = rows.some((a) => a.audit_type === 'full' && a.status === 'complete');

        if (sub && sub.status === 'active' && !hasAvailable && !hasCompletedFull) {
          const { data: newCredit } = await supabase.from('audit_credits').insert({
            user_id: user.id,
            credit_type: sub.plan === 'professional' ? 'one_time' : 'subscription',
            status: 'available',
            amount_cents: PLANS[sub.plan as keyof typeof PLANS]?.price || 499_00,
          }).select('id,credit_type,status,amount_cents,audit_id,created_at,used_at').single();
          if (newCredit) creds.push(newCredit as AuditCredit);
        }
        setCredits(creds);
      });
  }, [authChecked, user]);

  // Monitoring: fetch status independently
  useEffect(() => {
    if (!authChecked) return;
    setMonitoringLoading(true);
    fetch('/api/monitoring/status')
      .then(async (res) => {
        if (!res.ok) {
          setMonitoringSchedule(null);
          return;
        }
        const json = await res.json();
        setMonitoringSchedule(json.schedule ?? null);
        setMonitoringScoreHistory(json.scoreHistory ?? []);
      })
      .catch(() => setMonitoringSchedule(null))
      .finally(() => setMonitoringLoading(false));
  }, [authChecked]);

  async function handleMonitoringToggle() {
    if (!monitoringSchedule) return;
    setMonitoringToggling(true);
    try {
      const res = await fetch('/api/monitoring/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !monitoringSchedule.enabled }),
      });
      if (res.ok) {
        const json = await res.json();
        setMonitoringSchedule((prev) => prev ? { ...prev, enabled: json.enabled } : prev);
      }
    } finally {
      setMonitoringToggling(false);
    }
  }

  async function handleRunAudit() {
    if (!user || !onboarding || availableCredits.length === 0) return;
    setConfirmStep('running');
    setError('');
    try {
      const res = await fetch('/api/full-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: onboarding.website_url, competitorUrls: onboarding.competitor_urls || [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start audit');
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
      await new Promise((r) => setTimeout(r, 2000));
      await supabase.from('audit_credits').insert({ user_id: user.id, credit_type: 'addon', status: 'available', amount_cents: addonPrice });
      setConfirmStep('idle');
      setCredits(undefined); // trigger reload
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

  // Show minimal shell while auth is resolving
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size={8} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 bg-background">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
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
        {credits === undefined ? <CardSkeleton /> : (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-on-surface">Audit Credits</h2>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold text-lg">{availableCredits.length}</span>
                <span className="text-on-surface-muted text-sm">available</span>
              </div>
            </div>

            {runningAudit && (
              <div className="bg-primary-fixed/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Spinner size={5} />
                  <div>
                    <p className="text-on-surface text-sm font-medium">Audit in progress</p>
                    <p className="text-on-surface-muted text-xs">{runningAudit.url}</p>
                  </div>
                </div>
                <Link href={`/audit-progress/${runningAudit.id}`}
                  className="bg-gradient-cta text-on-primary px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
                  View Progress
                </Link>
              </div>
            )}

            {onboarding === undefined ? (
              <div className="h-10 w-40 bg-surface-high rounded-full animate-pulse" />
            ) : onboarding ? (
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
                      {subscription && (() => {
                        const plan = PLANS[subscription.plan as keyof typeof PLANS];
                        if (!plan?.addonPrice) return null;
                        const price = (plan as { addonDisplayPrice?: string }).addonDisplayPrice ?? '$449';
                        return (
                          <button onClick={handleBuyAddon} disabled={(confirmStep as string) === 'purchasing'}
                            className="bg-surface-high text-on-surface px-6 py-2.5 rounded-full font-semibold hover:bg-surface-highest transition-colors text-sm">
                            Buy Extra Audit &mdash; {price} (10% subscriber discount)
                          </button>
                        );
                      })()}
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
                      {[
                        ['Website', onboarding.website_url],
                        ['Search Console', onboarding.gsc_connected ? '✓ Connected' : 'Not connected'],
                        ['GA4 Property', onboarding.ga4_property_id || 'Not configured'],
                        ...(onboarding.competitor_urls?.length > 0 ? [['Competitors', `${onboarding.competitor_urls.length} tracked`]] : []),
                        ['Credits remaining after', String(availableCredits.length - 1)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-on-surface-muted">{label}</span>
                          <span className="text-on-surface font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                    {(!onboarding.gsc_connected || !onboarding.ga4_property_id || (onboarding.gsc_connected && !onboarding.google_access_token)) && (
                      <div className="bg-primary-fixed/30 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-primary text-sm font-medium">Missing data sources</p>
                        </div>
                        <div className="space-y-1 ml-6">
                          {!onboarding.gsc_connected && <p className="text-on-surface-muted text-xs"><strong>Google Search Console</strong> not connected — audit will skip real search data.</p>}
                          {onboarding.gsc_connected && !onboarding.google_access_token && <p className="text-on-surface-muted text-xs"><strong>Google tokens expired</strong> — please reconnect in Settings.</p>}
                          {!onboarding.ga4_property_id && <p className="text-on-surface-muted text-xs"><strong>GA4 Property ID</strong> not configured — audit will skip traffic data.</p>}
                        </div>
                        <Link href="/onboarding" className="text-primary text-xs hover:text-primary-container mt-2 inline-block">Connect now in Settings →</Link>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={handleRunAudit}
                        className="bg-gradient-cta text-on-primary px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {(!onboarding.gsc_connected || !onboarding.ga4_property_id) ? 'Run Anyway' : 'Confirm & Run'}
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

                {(confirmStep === 'running' || confirmStep === 'purchasing') && (
                  <div className="flex items-center gap-3 py-4">
                    <Spinner size={5} />
                    <span className="text-primary font-medium">
                      {confirmStep === 'running' ? `Running audit on ${onboarding.website_url}…` : 'Processing additional credit purchase…'}
                    </span>
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

            {/* Credit history — collapsed toggle inside the credits card */}
            {credits && credits.length > 0 && (
              <div className="mt-6 pt-5 border-t border-on-surface-light/10">
                <button
                  onClick={() => setShowCreditHistory(!showCreditHistory)}
                  className="flex items-center gap-2 text-xs text-on-surface-muted hover:text-on-surface transition-colors">
                  {showCreditHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Credit history ({credits.length})
                </button>
                {showCreditHistory && (
                  <div className="mt-3 space-y-1.5">
                    {credits.map((credit) => (
                      <div key={credit.id} className="flex items-center justify-between py-1.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${credit.status === 'available' ? 'bg-tertiary' : 'bg-on-surface-light/40'}`} />
                          <span className="text-on-surface-muted capitalize">{credit.credit_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-on-surface-light">{new Date(credit.created_at).toLocaleDateString()}</span>
                          <span className={credit.status === 'available' ? 'text-tertiary font-medium' : 'text-on-surface-light'}>
                            {credit.status === 'available' ? 'Available' : credit.status === 'used' ? 'Used' : 'Expired'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Monitoring Card */}
        {monitoringLoading || monitoringSchedule === undefined ? (
          monitoringLoading ? <CardSkeleton /> : null
        ) : monitoringSchedule !== null ? (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-xl text-on-surface">
                  {monitoringSchedule.intervalMonths === 1 ? 'Monthly Monitor' : 'Bi-Monthly Monitor'}
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  monitoringSchedule.enabled
                    ? 'bg-tertiary-fixed/30 text-tertiary'
                    : 'bg-surface-high text-on-surface-muted'
                }`}
              >
                {monitoringSchedule.enabled ? 'Active' : 'Paused'}
              </span>
            </div>

            {monitoringScoreHistory.length > 1 && (
              <div className="mb-5">
                <ScoreTrendChart scoreHistory={monitoringScoreHistory} />
              </div>
            )}

            <div className="space-y-1.5 mb-5">
              {monitoringSchedule.nextRunAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-muted">Next audit</span>
                  <span className="text-on-surface font-medium">
                    {new Date(monitoringSchedule.nextRunAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {monitoringSchedule.lastRunAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-muted">Last audit</span>
                  <span className="text-on-surface">
                    {new Date(monitoringSchedule.lastRunAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {monitoringScoreHistory.length > 0 && (
                      <>
                        {' · Score: '}
                        <span className="font-medium text-primary">
                          {monitoringScoreHistory[monitoringScoreHistory.length - 1].overall}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleMonitoringToggle}
              disabled={monitoringToggling}
              className="px-5 py-2 rounded-full text-sm font-semibold border border-on-surface-light/20 text-on-surface-muted hover:text-on-surface hover:border-on-surface-light/40 transition-colors disabled:opacity-50"
            >
              {monitoringToggling ? (
                <span className="flex items-center gap-2">
                  <Spinner size={4} />
                  {monitoringSchedule.enabled ? 'Pausing…' : 'Resuming…'}
                </span>
              ) : monitoringSchedule.enabled ? (
                'Pause monitoring'
              ) : (
                'Resume monitoring'
              )}
            </button>
          </div>
        ) : null}

        {/* Subscription + Config — side by side on md+ */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {subscription === undefined ? <CardSkeleton /> : (
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
              <h2 className="font-serif text-xl text-on-surface mb-4">Subscription</h2>
              {subscription ? (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-on-surface font-medium">{planLabels[subscription.plan] || subscription.plan}</p>
                    <p className="text-on-surface-muted text-sm mt-1">
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
          )}

          {onboarding === undefined ? <CardSkeleton /> : (
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-on-surface">Configuration</h2>
                <Link href="/onboarding" className="text-primary text-sm hover:text-primary-container">
                  {onboarding ? 'Edit' : 'Set up'}
                </Link>
              </div>
              {onboarding ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-muted">Website</span>
                    <span className="text-on-surface font-medium truncate max-w-[160px]">{onboarding.website_url}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-muted">Search Console</span>
                    <span className={onboarding.gsc_connected ? 'text-tertiary' : 'text-on-surface-light'}>
                      {onboarding.gsc_connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-muted">GA4</span>
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
                </div>
              ) : (
                <p className="text-on-surface-muted text-sm">Complete your setup for the most accurate analysis.</p>
              )}
            </div>
          )}
        </div>

        {/* Audit History */}
        {audits === undefined ? <CardSkeleton /> : (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-on-surface">Audit History</h2>
              {audits.length > 0 && (
                <span className="text-xs text-on-surface-light">{audits.length} audit{audits.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {audits.length > 0 ? (
              <>
                <div className="space-y-2">
                  {visibleAudits.map((audit) => (
                    <Link key={audit.id} href={`/results/${audit.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-surface-low hover:bg-surface-high transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="text-on-surface text-sm font-medium truncate">{audit.url}</p>
                        <p className="text-on-surface-light text-xs mt-0.5">
                          {new Date(audit.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}
                          <span className={audit.status === 'complete' ? 'text-tertiary' : audit.status === 'running' ? 'text-primary' : 'text-on-surface-light'}>
                            {audit.status === 'complete' ? 'Complete' : audit.status === 'running' ? 'In progress' : audit.status}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        {audit.score != null && (
                          <span className={`text-base font-bold ${Number(audit.score) >= 70 ? 'text-tertiary' : Number(audit.score) >= 40 ? 'text-primary' : 'text-error'}`}>
                            {audit.score}
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-on-surface-light opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
                {audits.length > 5 && (
                  <button
                    onClick={() => setShowAllAudits(!showAllAudits)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-primary transition-colors mx-auto">
                    {showAllAudits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAllAudits ? 'Show less' : `Show ${audits.length - 5} more`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-on-surface-muted text-sm">No audits yet. Use a credit to run your first audit.</p>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-on-surface-light text-xs">Signed in as {user?.email}</p>
        </div>
      </div>
    </div>
  );
}
