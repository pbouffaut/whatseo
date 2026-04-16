'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type {
  SubscriptionRow,
  CreditRow,
  AuditRow,
  ScoreHistoryRow,
  MonitoringRow,
} from '@/lib/admin/types';

interface UserDetail {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface OnboardingDetail {
  website_url: string | null;
  ga4_property_id: string | null;
  has_google_token: boolean;
}

interface CustomerDetailResponse {
  user: UserDetail;
  onboarding: OnboardingDetail | null;
  subscriptions: SubscriptionRow[];
  credits: CreditRow[];
  audits: AuditRow[];
  scoreHistory: ScoreHistoryRow[];
  monitoring: MonitoringRow | null;
}

type TabKey = 'audits' | 'credits' | 'subscriptions' | 'scoreHistory';

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-[#c9a85c]" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-green-900/40 text-green-400',
    active: 'bg-green-900/40 text-green-400',
    available: 'bg-green-900/40 text-green-400',
    failed: 'bg-red-900/40 text-red-400',
    running: 'bg-yellow-900/40 text-yellow-400',
    pending: 'bg-yellow-900/40 text-yellow-400',
    used: 'bg-[#2e2e2e] text-[#a09888]',
    canceled: 'bg-[#2e2e2e] text-[#a09888]',
    past_due: 'bg-red-900/40 text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] ?? 'bg-[#2e2e2e] text-[#a09888]'
      }`}
    >
      {status}
    </span>
  );
}

// ─── Score Trend SVG ──────────────────────────────────────────────────────────
function ScoreTrendChart({ scoreHistory }: { scoreHistory: ScoreHistoryRow[] }) {
  const W = 480;
  const H = 100;
  const PAD_X = 24;
  const PAD_Y = 16;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const sorted = [...scoreHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  if (sorted.length === 0) return <p className="text-[#a09888] text-sm">No score history.</p>;

  if (sorted.length === 1) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <circle cx={W / 2} cy={H / 2} r={5} fill="#c9a85c" />
        <text x={W / 2} y={H / 2 + 18} textAnchor="middle" fontSize="11" fill="#c9a85c">
          {sorted[0].overall}
        </text>
      </svg>
    );
  }

  const scores = sorted.map((p) => p.overall);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const toX = (i: number) => PAD_X + (i / (sorted.length - 1)) * innerW;
  const toY = (v: number) => PAD_Y + innerH - ((v - minScore) / range) * innerH;

  const points = sorted.map((p, i) => `${toX(i)},${toY(p.overall)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="#c9a85c"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {sorted.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.overall)} r={3.5} fill="#c9a85c" />
          <title>{`${p.overall} — ${new Date(p.recorded_at).toLocaleDateString()}`}</title>
        </g>
      ))}
      <text x={toX(0)} y={H - 2} textAnchor="middle" fontSize="10" fill="#a09888">
        {new Date(sorted[0].recorded_at).toLocaleDateString()}
      </text>
      <text x={toX(sorted.length - 1)} y={H - 2} textAnchor="middle" fontSize="10" fill="#a09888">
        {new Date(sorted[sorted.length - 1].recorded_at).toLocaleDateString()}
      </text>
    </svg>
  );
}

// ─── Audits Tab ───────────────────────────────────────────────────────────────
function AuditsTab({
  audits,
  userId,
}: {
  audits: AuditRow[];
  userId: string;
}) {
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [reissuedIds, setReissuedIds] = useState<Set<string>>(new Set());

  async function handleReissue(audit: AuditRow) {
    if (reissuingId) return;
    setReissuingId(audit.id);
    try {
      const res = await fetch('/api/admin/reissue-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) setReissuedIds((prev) => new Set([...prev, audit.id]));
    } finally {
      setReissuingId(null);
    }
  }

  if (audits.length === 0) {
    return <p className="text-[#a09888] text-sm py-4">No audits yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
            <th className="text-left py-2 pr-4 font-medium">URL</th>
            <th className="text-left py-2 pr-4 font-medium">Score</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Type</th>
            <th className="text-left py-2 pr-4 font-medium">Pages</th>
            <th className="text-left py-2 pr-4 font-medium">Date</th>
            <th className="text-left py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr
              key={audit.id}
              className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4 max-w-[220px]">
                <span className="text-[#f5f0e8] truncate block" title={audit.url}>
                  {audit.url}
                </span>
                {audit.error && (
                  <span
                    className="text-red-400 text-xs truncate block mt-0.5"
                    title={audit.error}
                  >
                    {audit.error.slice(0, 60)}
                    {audit.error.length > 60 ? '…' : ''}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4">
                {audit.score != null ? (
                  <span
                    className={`font-bold ${
                      audit.score >= 70
                        ? 'text-green-400'
                        : audit.score >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {audit.score}
                  </span>
                ) : (
                  <span className="text-[#a09888]">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={audit.status} />
              </td>
              <td className="py-3 pr-4 text-[#a09888] text-xs uppercase">
                {audit.audit_type}
              </td>
              <td className="py-3 pr-4 text-[#a09888]">
                {audit.pages_crawled ?? '—'}
              </td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">
                {new Date(audit.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3">
                {audit.status === 'failed' && (
                  reissuedIds.has(audit.id) ? (
                    <span className="text-green-400 text-xs">Reissued ✓</span>
                  ) : (
                    <button
                      onClick={() => handleReissue(audit)}
                      disabled={reissuingId === audit.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 transition-colors disabled:opacity-50"
                    >
                      {reissuingId === audit.id ? 'Reissuing…' : 'Reissue Credit'}
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Credits Tab ──────────────────────────────────────────────────────────────
function CreditsTab({ credits }: { credits: CreditRow[] }) {
  if (credits.length === 0) {
    return <p className="text-[#a09888] text-sm py-4">No credits.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
            <th className="text-left py-2 pr-4 font-medium">Type</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Amount</th>
            <th className="text-left py-2 pr-4 font-medium">Audit ID</th>
            <th className="text-left py-2 pr-4 font-medium">Created</th>
            <th className="text-left py-2 font-medium">Used At</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((credit) => (
            <tr
              key={credit.id}
              className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4 text-[#f5f0e8] capitalize">
                {credit.credit_type.replace(/_/g, ' ')}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={credit.status} />
              </td>
              <td className="py-3 pr-4 text-[#a09888]">
                {credit.amount_cents > 0
                  ? `$${(credit.amount_cents / 100).toFixed(0)}`
                  : '—'}
              </td>
              <td className="py-3 pr-4 text-[#a09888] font-mono text-xs">
                {credit.audit_id ? credit.audit_id.slice(0, 8) + '…' : '—'}
              </td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">
                {new Date(credit.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 text-[#a09888] whitespace-nowrap">
                {credit.used_at ? new Date(credit.used_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────
function SubscriptionsTab({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  if (subscriptions.length === 0) {
    return <p className="text-[#a09888] text-sm py-4">No subscriptions.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
            <th className="text-left py-2 pr-4 font-medium">Plan</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Amount</th>
            <th className="text-left py-2 pr-4 font-medium">Interval</th>
            <th className="text-left py-2 pr-4 font-medium">Created</th>
            <th className="text-left py-2 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr
              key={sub.id}
              className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
            >
              <td className="py-3 pr-4 text-[#f5f0e8] capitalize">{sub.plan}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={sub.status} />
              </td>
              <td className="py-3 pr-4 text-[#a09888]">
                ${(sub.amount_cents / 100).toFixed(0)}
              </td>
              <td className="py-3 pr-4 text-[#a09888]">
                {sub.interval_months}mo
              </td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">
                {new Date(sub.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 text-[#a09888] whitespace-nowrap">
                {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Score History Tab ────────────────────────────────────────────────────────
function ScoreHistoryTab({ scoreHistory }: { scoreHistory: ScoreHistoryRow[] }) {
  if (scoreHistory.length === 0) {
    return <p className="text-[#a09888] text-sm py-4">No score history.</p>;
  }

  const sorted = [...scoreHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  return (
    <div>
      <div className="mb-6 bg-[#1e1e1e] rounded-xl p-4">
        <ScoreTrendChart scoreHistory={scoreHistory} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
              <th className="text-left py-2 pr-4 font-medium">Date</th>
              <th className="text-left py-2 pr-4 font-medium">Overall</th>
              <th className="text-left py-2 pr-4 font-medium">Technical</th>
              <th className="text-left py-2 pr-4 font-medium">On-Page</th>
              <th className="text-left py-2 pr-4 font-medium">Performance</th>
              <th className="text-left py-2 pr-4 font-medium">AI Readiness</th>
              <th className="text-left py-2 font-medium">Pages</th>
            </tr>
          </thead>
          <tbody>
            {sorted.reverse().map((row) => (
              <tr
                key={row.id}
                className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
              >
                <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">
                  {new Date(row.recorded_at).toLocaleDateString()}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`font-bold ${
                      row.overall >= 70
                        ? 'text-green-400'
                        : row.overall >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {row.overall}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[#f5f0e8]">{row.technical ?? '—'}</td>
                <td className="py-3 pr-4 text-[#f5f0e8]">{row.on_page ?? '—'}</td>
                <td className="py-3 pr-4 text-[#f5f0e8]">{row.performance ?? '—'}</td>
                <td className="py-3 pr-4 text-[#f5f0e8]">{row.ai_readiness ?? '—'}</td>
                <td className="py-3 text-[#a09888]">{row.pages_crawled ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('audits');
  const [reissuing, setReissuing] = useState(false);
  const [reissued, setReissued] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/admin/customers/${userId}`)
      .then((r) => r.json())
      .then((d: CustomerDetailResponse) => setData(d))
      .catch(() => setError('Failed to load customer.'))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleReissueCredit() {
    if (reissuing) return;
    setReissuing(true);
    try {
      const res = await fetch('/api/admin/reissue-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) setReissued(true);
    } finally {
      setReissuing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Spinner />
        <span className="text-[#a09888]">Loading customer…</span>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-400">{error || 'Customer not found.'}</p>;
  }

  const { user, onboarding, subscriptions, credits, audits, scoreHistory, monitoring } = data;

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const creditsAvailable = credits.filter((c) => c.status === 'available').length;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'audits', label: 'Audits', count: audits.length },
    { key: 'credits', label: 'Credits', count: credits.length },
    { key: 'subscriptions', label: 'Subscriptions', count: subscriptions.length },
    { key: 'scoreHistory', label: 'Score History', count: scoreHistory.length },
  ];

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f0e8] break-all">{user.email}</h1>
            <p className="text-[#a09888] text-sm mt-1">
              Joined {new Date(user.created_at).toLocaleDateString()}
              {user.last_sign_in_at && (
                <> &bull; Last seen {new Date(user.last_sign_in_at).toLocaleDateString()}</>
              )}
            </p>
            {onboarding?.website_url && (
              <p className="text-[#c9a85c] text-sm mt-1">{onboarding.website_url}</p>
            )}
          </div>
          <a
            href="/admin/customers"
            className="text-[#a09888] text-sm hover:text-[#f5f0e8] transition-colors"
          >
            ← Back
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Plan</p>
          <p className="text-[#f5f0e8] font-medium">
            {activeSub ? (
              <span className="capitalize">{activeSub.plan}</span>
            ) : (
              <span className="text-[#a09888]">None</span>
            )}
          </p>
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Credits</p>
          <p
            className={`font-medium ${
              creditsAvailable > 0 ? 'text-green-400' : 'text-[#a09888]'
            }`}
          >
            {creditsAvailable} available
          </p>
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Audits</p>
          <p className="text-[#f5f0e8] font-medium">{audits.length} total</p>
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Monitoring</p>
          <p className="font-medium">
            {monitoring ? (
              <span className={monitoring.enabled ? 'text-green-400' : 'text-[#a09888]'}>
                {monitoring.enabled ? 'Active' : 'Paused'}
              </span>
            ) : (
              <span className="text-[#a09888]">Off</span>
            )}
          </p>
        </div>
      </div>

      {/* Onboarding info */}
      {onboarding && (
        <div className="bg-[#232323] rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-[#a09888] mr-2">GA4:</span>
            <span className="text-[#f5f0e8]">{onboarding.ga4_property_id ?? '—'}</span>
          </div>
          <div>
            <span className="text-[#a09888] mr-2">Google Token:</span>
            <span className={onboarding.has_google_token ? 'text-green-400' : 'text-red-400'}>
              {onboarding.has_google_token ? 'Connected' : 'Missing'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[#232323] rounded-2xl overflow-hidden">
        <div className="flex border-b border-[#2e2e2e] px-2 pt-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#c9a85c] bg-[#1e1e1e]'
                  : 'text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'audits' && <AuditsTab audits={audits} userId={userId} />}
          {activeTab === 'credits' && <CreditsTab credits={credits} />}
          {activeTab === 'subscriptions' && (
            <SubscriptionsTab subscriptions={subscriptions} />
          )}
          {activeTab === 'scoreHistory' && (
            <ScoreHistoryTab scoreHistory={scoreHistory} />
          )}
        </div>
      </div>

      {/* Floating Action Button: Reissue Credit */}
      <div className="fixed bottom-8 right-8 z-40">
        {reissued ? (
          <div className="bg-green-900/80 text-green-300 px-5 py-3 rounded-full text-sm font-medium shadow-lg">
            Credit Reissued ✓
          </div>
        ) : (
          <button
            onClick={handleReissueCredit}
            disabled={reissuing}
            className="bg-[#c9a85c] text-[#1a1a1a] px-5 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-[#d4b46a] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {reissuing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Reissuing…
              </>
            ) : (
              '+ Reissue Credit'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
