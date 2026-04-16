'use client';

import { useEffect, useState } from 'react';
import type { FailedAuditRow } from '@/app/api/admin/failed-audits/route';

interface StatsData {
  audits: { today: number; week: number; month: number; total: number };
  failed: { today: number; week: number };
  users: { total: number; withSubscription: number };
  credits: { available: number; used: number; issuedThisMonth: number };
  revenue: { total_cents: number; thisMonth_cents: number };
  monitoring: { active: number };
}

interface RecentAudit {
  id: string;
  url: string;
  user_id: string;
  score: number | null;
  status: string;
  audit_type: string;
  createdAt: string;
  user_email?: string | null;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#232323] rounded-2xl p-6">
      <p className="text-[#a09888] text-xs uppercase tracking-wider mb-2">{label}</p>
      <p
        className={`text-3xl font-bold ${accent ? 'text-[#c9a85c]' : 'text-[#f5f0e8]'}`}
      >
        {value}
      </p>
      {sub && <p className="text-[#a09888] text-xs mt-1">{sub}</p>}
    </div>
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
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-[#2e2e2e] text-[#a09888]'}`}
    >
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-[#c9a85c]" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [failedAudits, setFailedAudits] = useState<FailedAuditRow[]>([]);
  const [failedLoading, setFailedLoading] = useState(true);
  const [recentAudits, setRecentAudits] = useState<RecentAudit[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [reissuedIds, setReissuedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d: StatsData) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));

    fetch('/api/admin/failed-audits')
      .then((r) => r.json())
      .then((d: { audits: FailedAuditRow[] }) => setFailedAudits(d.audits ?? []))
      .catch(() => setFailedAudits([]))
      .finally(() => setFailedLoading(false));

    // Fetch recent completed full audits via customers endpoint — use a custom route
    // We'll query customers and pull recent audits from there via a dedicated approach
    fetchRecentAudits();
  }, []);

  async function fetchRecentAudits() {
    try {
      const res = await fetch('/api/admin/recent-audits');
      if (res.ok) {
        const data = await res.json() as { audits: RecentAudit[] };
        setRecentAudits(data.audits ?? []);
      }
    } catch {
      // ignore
    } finally {
      setRecentLoading(false);
    }
  }

  async function handleReissueCredit(audit: FailedAuditRow) {
    if (reissuingId) return;
    setReissuingId(audit.id);
    try {
      const res = await fetch('/api/admin/reissue-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: audit.user_id }),
      });
      if (res.ok) {
        setReissuedIds((prev) => new Set([...prev, audit.id]));
      }
    } finally {
      setReissuingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f5f0e8]">Overview</h1>
        <p className="text-[#a09888] text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* Top row: 4 cards */}
      {statsLoading ? (
        <div className="flex items-center gap-3 mb-8">
          <Spinner />
          <span className="text-[#a09888] text-sm">Loading stats…</span>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Audits Today"
              value={stats.audits.today}
              sub={`${stats.audits.week} this week`}
            />
            <StatCard
              label="Audits This Week"
              value={stats.audits.week}
              sub={`${stats.audits.month} this month`}
            />
            <StatCard
              label="Total Users"
              value={stats.users.total.toLocaleString()}
              sub={`${stats.users.withSubscription} with active sub`}
            />
            <StatCard
              label="Active Subscriptions"
              value={stats.users.withSubscription}
              accent
              sub={`${stats.monitoring.active} monitoring active`}
            />
          </div>

          {/* Second row: 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Failed Today"
              value={stats.failed.today}
              sub={`${stats.failed.week} this week`}
            />
            <StatCard
              label="Credits Available"
              value={stats.credits.available.toLocaleString()}
              sub={`${stats.credits.issuedThisMonth} issued this month`}
            />
            <StatCard
              label="MRR Estimate"
              value={formatCents(stats.revenue.thisMonth_cents)}
              accent
              sub={`${formatCents(stats.revenue.total_cents)} all-time`}
            />
          </div>
        </>
      ) : (
        <div className="text-[#a09888] text-sm mb-8">Failed to load stats.</div>
      )}

      {/* Failed Audits */}
      <div className="bg-[#232323] rounded-2xl p-6 mb-6">
        <h2 className="text-[#f5f0e8] font-semibold mb-4">
          Failed Audits{' '}
          {!failedLoading && (
            <span className="text-[#a09888] text-sm font-normal">
              (last {failedAudits.length})
            </span>
          )}
        </h2>
        {failedLoading ? (
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-[#a09888] text-sm">Loading…</span>
          </div>
        ) : failedAudits.length === 0 ? (
          <p className="text-[#a09888] text-sm">No failed audits. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#a09888] text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">URL</th>
                  <th className="text-left py-2 pr-4 font-medium">User</th>
                  <th className="text-left py-2 pr-4 font-medium">Error</th>
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {failedAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
                  >
                    <td className="py-3 pr-4 text-[#f5f0e8] max-w-[200px] truncate">
                      <span title={audit.url}>{audit.url}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#a09888] max-w-[180px] truncate">
                      <span title={audit.user_email ?? audit.user_id}>
                        {audit.user_email ?? audit.user_id.slice(0, 8) + '…'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-red-400 max-w-[200px] truncate">
                      <span title={audit.error ?? ''}>
                        {audit.error ? audit.error.slice(0, 60) + (audit.error.length > 60 ? '…' : '') : '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">
                      {new Date(audit.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {reissuedIds.has(audit.id) ? (
                        <span className="text-green-400 text-xs">Reissued ✓</span>
                      ) : (
                        <button
                          onClick={() => handleReissueCredit(audit)}
                          disabled={reissuingId === audit.id}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 transition-colors disabled:opacity-50"
                        >
                          {reissuingId === audit.id ? 'Reissuing…' : 'Reissue Credit'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#232323] rounded-2xl p-6">
        <h2 className="text-[#f5f0e8] font-semibold mb-4">Recent Completed Audits</h2>
        {recentLoading ? (
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-[#a09888] text-sm">Loading…</span>
          </div>
        ) : recentAudits.length === 0 ? (
          <p className="text-[#a09888] text-sm">No recent audits.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#a09888] text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">URL</th>
                  <th className="text-left py-2 pr-4 font-medium">User</th>
                  <th className="text-left py-2 pr-4 font-medium">Score</th>
                  <th className="text-left py-2 pr-4 font-medium">Type</th>
                  <th className="text-left py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
                  >
                    <td className="py-3 pr-4 text-[#f5f0e8] max-w-[200px] truncate">
                      <span title={audit.url}>{audit.url}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#a09888] max-w-[180px] truncate">
                      <span title={audit.user_email ?? audit.user_id}>
                        {audit.user_email ?? audit.user_id.slice(0, 8) + '…'}
                      </span>
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
                      <span className="text-[#a09888] text-xs uppercase">{audit.audit_type}</span>
                    </td>
                    <td className="py-3 text-[#a09888] whitespace-nowrap">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
