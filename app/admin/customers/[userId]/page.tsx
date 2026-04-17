'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type {
  SubscriptionRow,
  CreditRow,
  AuditRow,
  ScoreHistoryRow,
  MonitoringRow,
  ProfileRow,
  PaymentRow,
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
  profile: ProfileRow | null;
  onboarding: OnboardingDetail | null;
  subscriptions: SubscriptionRow[];
  credits: CreditRow[];
  audits: AuditRow[];
  scoreHistory: ScoreHistoryRow[];
  monitoring: MonitoringRow | null;
}

type TabKey = 'audits' | 'credits' | 'subscriptions' | 'scoreHistory' | 'payments';

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
    succeeded: 'bg-green-900/40 text-green-400',
    failed: 'bg-red-900/40 text-red-400',
    running: 'bg-yellow-900/40 text-yellow-400',
    pending: 'bg-yellow-900/40 text-yellow-400',
    used: 'bg-[#2e2e2e] text-[#a09888]',
    canceled: 'bg-[#2e2e2e] text-[#a09888]',
    past_due: 'bg-red-900/40 text-red-400',
    refunded: 'bg-blue-900/40 text-blue-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-[#2e2e2e] text-[#a09888]'}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    one_time: 'bg-[#c9a85c]/10 text-[#c9a85c] border border-[#c9a85c]/30',
    monthly: 'bg-blue-900/20 text-blue-300 border border-blue-400/30',
    yearly: 'bg-purple-900/20 text-purple-300 border border-purple-400/30',
    professional: 'bg-[#c9a85c]/10 text-[#c9a85c] border border-[#c9a85c]/30',
    monthly_monitor: 'bg-blue-900/20 text-blue-300 border border-blue-400/30',
  };
  const labels: Record<string, string> = {
    one_time: 'Single Audit',
    monthly: 'Monthly',
    yearly: 'Yearly',
    professional: 'Professional',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[plan] ?? 'bg-[#2e2e2e] text-[#a09888]'}`}>
      {labels[plan] ?? plan}
    </span>
  );
}

// ─── Score Trend SVG ──────────────────────────────────────────────────────────
function ScoreTrendChart({ scoreHistory }: { scoreHistory: ScoreHistoryRow[] }) {
  const W = 480; const H = 100; const PAD_X = 24; const PAD_Y = 16;
  const innerW = W - PAD_X * 2; const innerH = H - PAD_Y * 2;
  const sorted = [...scoreHistory].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  if (sorted.length === 0) return <p className="text-[#a09888] text-sm">No score history.</p>;
  if (sorted.length === 1) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <circle cx={W / 2} cy={H / 2} r={5} fill="#c9a85c" />
        <text x={W / 2} y={H / 2 + 18} textAnchor="middle" fontSize="11" fill="#c9a85c">{sorted[0].overall}</text>
      </svg>
    );
  }
  const scores = sorted.map((p) => p.overall);
  const minScore = Math.min(...scores); const maxScore = Math.max(...scores); const range = maxScore - minScore || 1;
  const toX = (i: number) => PAD_X + (i / (sorted.length - 1)) * innerW;
  const toY = (v: number) => PAD_Y + innerH - ((v - minScore) / range) * innerH;
  const points = sorted.map((p, i) => `${toX(i)},${toY(p.overall)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke="#c9a85c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.overall)} r={3.5} fill="#c9a85c" />
          <title>{`${p.overall} — ${new Date(p.recorded_at).toLocaleDateString()}`}</title>
        </g>
      ))}
      <text x={toX(0)} y={H - 2} textAnchor="middle" fontSize="10" fill="#a09888">{new Date(sorted[0].recorded_at).toLocaleDateString()}</text>
      <text x={toX(sorted.length - 1)} y={H - 2} textAnchor="middle" fontSize="10" fill="#a09888">{new Date(sorted[sorted.length - 1].recorded_at).toLocaleDateString()}</text>
    </svg>
  );
}

// ─── Audits Tab ───────────────────────────────────────────────────────────────
function AuditsTab({ audits, userId, onRefresh }: { audits: AuditRow[]; userId: string; onRefresh: () => void }) {
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [reissuedIds, setReissuedIds] = useState<Set<string>>(new Set());

  async function handleReissue(audit: AuditRow) {
    if (reissuingId) return;
    setReissuingId(audit.id);
    try {
      const res = await fetch('/api/admin/reissue-credit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (res.ok) { setReissuedIds((prev) => new Set([...prev, audit.id])); onRefresh(); }
      else { const err = await res.json().catch(() => ({})); alert(`Failed to reissue: ${err.error ?? res.status}`); }
    } finally { setReissuingId(null); }
  }

  if (audits.length === 0) return <p className="text-[#a09888] text-sm py-4">No audits yet.</p>;
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
            <tr key={audit.id} className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors">
              <td className="py-3 pr-4 max-w-[220px]">
                <span className="text-[#f5f0e8] truncate block" title={audit.url}>{audit.url}</span>
                {audit.error && <span className="text-red-400 text-xs truncate block mt-0.5" title={audit.error}>{audit.error.slice(0, 60)}{audit.error.length > 60 ? '…' : ''}</span>}
              </td>
              <td className="py-3 pr-4">
                {audit.score != null ? (
                  <span className={`font-bold ${audit.score >= 70 ? 'text-green-400' : audit.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{audit.score}</span>
                ) : <span className="text-[#a09888]">—</span>}
              </td>
              <td className="py-3 pr-4"><StatusBadge status={audit.status} /></td>
              <td className="py-3 pr-4 text-[#a09888] text-xs uppercase">{audit.audit_type}</td>
              <td className="py-3 pr-4 text-[#a09888]">{audit.pages_crawled ?? '—'}</td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">{new Date(audit.createdAt).toLocaleDateString()}</td>
              <td className="py-3">
                {audit.status === 'failed' && (
                  reissuedIds.has(audit.id)
                    ? <span className="text-green-400 text-xs">Reissued ✓</span>
                    : <button onClick={() => handleReissue(audit)} disabled={reissuingId === audit.id} className="px-3 py-1 rounded-lg text-xs font-medium bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 transition-colors disabled:opacity-50">{reissuingId === audit.id ? 'Reissuing…' : 'Reissue Credit'}</button>
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
  if (credits.length === 0) return <p className="text-[#a09888] text-sm py-4">No credits.</p>;
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
            <tr key={credit.id} className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors">
              <td className="py-3 pr-4 text-[#f5f0e8] capitalize">{credit.credit_type.replace(/_/g, ' ')}</td>
              <td className="py-3 pr-4"><StatusBadge status={credit.status} /></td>
              <td className="py-3 pr-4 text-[#a09888]">{credit.amount_cents > 0 ? `$${(credit.amount_cents / 100).toFixed(0)}` : '—'}</td>
              <td className="py-3 pr-4 text-[#a09888] font-mono text-xs">{credit.audit_id ? credit.audit_id.slice(0, 8) + '…' : '—'}</td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">{new Date(credit.created_at).toLocaleDateString()}</td>
              <td className="py-3 text-[#a09888] whitespace-nowrap">{credit.used_at ? new Date(credit.used_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────
function SubscriptionsTab({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  if (subscriptions.length === 0) return <p className="text-[#a09888] text-sm py-4">No subscriptions.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
            <th className="text-left py-2 pr-4 font-medium">Plan</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Amount</th>
            <th className="text-left py-2 pr-4 font-medium">Interval</th>
            <th className="text-left py-2 pr-4 font-medium">Period End</th>
            <th className="text-left py-2 pr-4 font-medium">Cancel At End</th>
            <th className="text-left py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub.id} className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors">
              <td className="py-3 pr-4"><PlanBadge plan={sub.plan} /></td>
              <td className="py-3 pr-4"><StatusBadge status={sub.status} /></td>
              <td className="py-3 pr-4 text-[#a09888]">${(sub.amount_cents / 100).toFixed(0)}</td>
              <td className="py-3 pr-4 text-[#a09888]">{sub.interval_months ? `${sub.interval_months}mo` : 'one-time'}</td>
              <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}</td>
              <td className="py-3 pr-4">
                {sub.cancel_at_period_end ? <span className="text-yellow-400 text-xs">Yes</span> : <span className="text-[#a09888] text-xs">No</span>}
              </td>
              <td className="py-3 text-[#a09888] whitespace-nowrap">{new Date(sub.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/payments/${userId}`)
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleRefund(payment: PaymentRow) {
    if (!confirm(`Refund $${(payment.amount_cents / 100).toFixed(2)} to this customer?`)) return;
    setRefundingId(payment.id);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'amount', amountCents: payment.amount_cents, reason: 'admin refund' }),
      });
      if (res.ok) {
        onRefresh();
        setPayments([]);
        setLoading(true);
        fetch(`/api/admin/payments/${userId}`).then((r) => r.json()).then((d) => setPayments(d.payments ?? [])).finally(() => setLoading(false));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Refund failed: ${err.error ?? res.status}`);
      }
    } finally { setRefundingId(null); }
  }

  if (loading) return <div className="flex items-center gap-2 py-4"><Spinner /><span className="text-[#a09888] text-sm">Loading payments…</span></div>;
  if (payments.length === 0) return <p className="text-[#a09888] text-sm py-4">No payment history.</p>;

  const total = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount_cents, 0);
  const refunded = payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + Math.abs(p.amount_cents), 0);

  return (
    <div>
      <div className="flex gap-4 mb-4 text-sm">
        <div className="bg-[#1e1e1e] rounded-xl px-4 py-2">
          <span className="text-[#a09888]">Total paid: </span>
          <span className="text-green-400 font-medium">${(total / 100).toFixed(2)}</span>
        </div>
        {refunded > 0 && (
          <div className="bg-[#1e1e1e] rounded-xl px-4 py-2">
            <span className="text-[#a09888]">Refunded: </span>
            <span className="text-blue-400 font-medium">${(refunded / 100).toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#a09888] text-xs uppercase tracking-wider border-b border-[#2e2e2e]">
              <th className="text-left py-2 pr-4 font-medium">Date</th>
              <th className="text-left py-2 pr-4 font-medium">Description</th>
              <th className="text-left py-2 pr-4 font-medium">Plan</th>
              <th className="text-left py-2 pr-4 font-medium">Amount</th>
              <th className="text-left py-2 pr-4 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors">
                <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="py-3 pr-4 text-[#f5f0e8] max-w-[180px] truncate" title={p.description ?? ''}>{p.description ?? '—'}</td>
                <td className="py-3 pr-4">{p.plan ? <PlanBadge plan={p.plan} /> : <span className="text-[#a09888]">—</span>}</td>
                <td className={`py-3 pr-4 font-medium ${p.amount_cents < 0 ? 'text-blue-400' : 'text-[#f5f0e8]'}`}>
                  {p.amount_cents < 0 ? '-' : ''}${(Math.abs(p.amount_cents) / 100).toFixed(2)}
                </td>
                <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                <td className="py-3">
                  {p.status === 'succeeded' && p.amount_cents > 0 && (
                    <button
                      onClick={() => handleRefund(p)}
                      disabled={refundingId === p.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                    >
                      {refundingId === p.id ? 'Refunding…' : 'Refund'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Score History Tab ────────────────────────────────────────────────────────
function ScoreHistoryTab({ scoreHistory }: { scoreHistory: ScoreHistoryRow[] }) {
  if (scoreHistory.length === 0) return <p className="text-[#a09888] text-sm py-4">No score history.</p>;
  const sorted = [...scoreHistory].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
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
              <tr key={row.id} className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors">
                <td className="py-3 pr-4 text-[#a09888] whitespace-nowrap">{new Date(row.recorded_at).toLocaleDateString()}</td>
                <td className="py-3 pr-4">
                  <span className={`font-bold ${row.overall >= 70 ? 'text-green-400' : row.overall >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{row.overall}</span>
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

// ─── Admin Actions Panel ──────────────────────────────────────────────────────
function AdminActionsPanel({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // State for modals / inputs
  const [showRefundAmount, setShowRefundAmount] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [creditQty, setCreditQty] = useState('1');
  const [creditType, setCreditType] = useState<'subscription' | 'lifetime' | 'one_time'>('one_time');

  async function doAction(action: string, body: object) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ text: 'Done ✓', ok: true });
        onRefresh();
      } else {
        setMsg({ text: data.error ?? `Error ${res.status}`, ok: false });
      }
    } catch {
      setMsg({ text: 'Network error', ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-5 mb-6">
      <h3 className="text-[#c9a85c] text-xs uppercase tracking-widest font-semibold mb-4">Admin Actions</h3>
      <div className="flex flex-wrap gap-2">
        {/* Refund last month */}
        <button
          onClick={() => doAction('refund', { type: 'last_month' })}
          disabled={!!busy}
          className="px-4 py-2 rounded-xl bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 border border-blue-400/20 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {busy === 'refund' ? 'Working…' : 'Refund Last Month'}
        </button>

        {/* Refund custom amount */}
        {!showRefundAmount ? (
          <button
            onClick={() => setShowRefundAmount(true)}
            className="px-4 py-2 rounded-xl bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 border border-blue-400/20 text-xs font-medium transition-colors"
          >
            Refund Amount…
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[#a09888] text-xs">$</span>
            <input
              type="number" min="1" placeholder="amount"
              value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg bg-[#2e2e2e] border border-[#3e3e3e] text-[#f5f0e8] text-xs focus:outline-none focus:border-[#c9a85c]"
            />
            <button
              onClick={() => { doAction('refund', { type: 'amount', amountCents: Math.round(parseFloat(refundAmount) * 100) }); setShowRefundAmount(false); setRefundAmount(''); }}
              disabled={!refundAmount || !!busy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >Confirm</button>
            <button onClick={() => { setShowRefundAmount(false); setRefundAmount(''); }} className="text-[#a09888] text-xs hover:text-[#f5f0e8]">Cancel</button>
          </div>
        )}

        {/* Add credit */}
        {!showAddCredit ? (
          <button
            onClick={() => setShowAddCredit(true)}
            className="px-4 py-2 rounded-xl bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 border border-[#c9a85c]/20 text-xs font-medium transition-colors"
          >
            Add Credit…
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number" min="1" max="12" placeholder="qty"
              value={creditQty} onChange={(e) => setCreditQty(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-lg bg-[#2e2e2e] border border-[#3e3e3e] text-[#f5f0e8] text-xs focus:outline-none focus:border-[#c9a85c]"
            />
            <select
              value={creditType} onChange={(e) => setCreditType(e.target.value as typeof creditType)}
              className="px-2 py-1.5 rounded-lg bg-[#2e2e2e] border border-[#3e3e3e] text-[#f5f0e8] text-xs focus:outline-none focus:border-[#c9a85c]"
            >
              <option value="one_time">One-time</option>
              <option value="subscription">Subscription</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <button
              onClick={() => { doAction('add-credit', { quantity: parseInt(creditQty) || 1, creditType }); setShowAddCredit(false); }}
              disabled={!!busy}
              className="px-3 py-1.5 rounded-lg bg-[#c9a85c] text-[#1a1a1a] text-xs font-semibold hover:bg-[#d4b46a] disabled:opacity-50 transition-colors"
            >Add</button>
            <button onClick={() => setShowAddCredit(false)} className="text-[#a09888] text-xs hover:text-[#f5f0e8]">Cancel</button>
          </div>
        )}

        {/* Cancel subscription */}
        <button
          onClick={() => { if (confirm('Cancel this subscription at period end?')) doAction('cancel-subscription', { immediately: false }); }}
          disabled={!!busy}
          className="px-4 py-2 rounded-xl bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-400/20 text-xs font-medium transition-colors disabled:opacity-50"
        >
          Cancel Subscription
        </button>
      </div>

      {msg && (
        <p className={`mt-3 text-xs ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
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
  const [error, setError] = useState('');

  function fetchData() {
    if (!userId) return;
    fetch(`/api/admin/customers/${userId}`)
      .then((r) => r.json())
      .then((d: CustomerDetailResponse) => setData(d))
      .catch(() => setError('Failed to load customer.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const { user, profile, onboarding, subscriptions, credits, audits, scoreHistory, monitoring } = data;

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const creditsAvailable = credits.filter((c) => c.status === 'available').length;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'audits', label: 'Audits', count: audits.length },
    { key: 'credits', label: 'Credits', count: credits.length },
    { key: 'subscriptions', label: 'Subscriptions', count: subscriptions.length },
    { key: 'payments', label: 'Payments' },
    { key: 'scoreHistory', label: 'Score History', count: scoreHistory.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            {profile?.first_name || profile?.last_name ? (
              <>
                <h1 className="text-2xl font-bold text-[#f5f0e8]">{[profile.first_name, profile.last_name].filter(Boolean).join(' ')}</h1>
                <p className="text-[#a09888] text-sm mt-0.5 break-all">{user.email}</p>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-[#f5f0e8] break-all">{user.email}</h1>
            )}
            {(profile?.company || profile?.title) && (
              <p className="text-[#a09888] text-sm mt-1">{[profile.company, profile.title].filter(Boolean).join(' · ')}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[#a09888] text-xs">
                Joined {new Date(user.created_at).toLocaleDateString()}
                {user.last_sign_in_at && <> &bull; Last seen {new Date(user.last_sign_in_at).toLocaleDateString()}</>}
              </p>
              {profile?.profile_completed_at
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400">Profile complete</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2e2e2e] text-[#a09888]">Profile incomplete</span>
              }
            </div>
            {onboarding?.website_url && <p className="text-[#c9a85c] text-sm mt-1">{onboarding.website_url}</p>}
          </div>
          <a href="/admin/customers" className="text-[#a09888] text-sm hover:text-[#f5f0e8] transition-colors">← Back</a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-2">Plan</p>
          {activeSub ? (
            <div>
              <PlanBadge plan={activeSub.plan} />
              {activeSub.cancel_at_period_end && (
                <p className="text-yellow-400 text-xs mt-1">Cancels at period end</p>
              )}
            </div>
          ) : (
            <span className="text-[#a09888] font-medium">None</span>
          )}
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Credits</p>
          <p className={`font-medium ${creditsAvailable > 0 ? 'text-green-400' : 'text-[#a09888]'}`}>{creditsAvailable} available</p>
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Audits</p>
          <p className="text-[#f5f0e8] font-medium">{audits.length} total</p>
        </div>
        <div className="bg-[#232323] rounded-xl p-4">
          <p className="text-[#a09888] text-xs uppercase tracking-wider mb-1">Monitoring</p>
          <p className="font-medium">
            {monitoring
              ? <span className={monitoring.enabled ? 'text-green-400' : 'text-[#a09888]'}>{monitoring.enabled ? 'Active' : 'Paused'}</span>
              : <span className="text-[#a09888]">Off</span>
            }
          </p>
        </div>
      </div>

      {/* Onboarding info */}
      {onboarding && (
        <div className="bg-[#232323] rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm">
          <div><span className="text-[#a09888] mr-2">GA4:</span><span className="text-[#f5f0e8]">{onboarding.ga4_property_id ?? '—'}</span></div>
          <div>
            <span className="text-[#a09888] mr-2">Google Token:</span>
            <span className={onboarding.has_google_token ? 'text-green-400' : 'text-red-400'}>{onboarding.has_google_token ? 'Connected' : 'Missing'}</span>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <AdminActionsPanel userId={userId} onRefresh={fetchData} />

      {/* Tabs */}
      <div className="bg-[#232323] rounded-2xl overflow-hidden">
        <div className="flex border-b border-[#2e2e2e] px-2 pt-2 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? 'text-[#c9a85c] bg-[#1e1e1e]' : 'text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'audits' && <AuditsTab audits={audits} userId={userId} onRefresh={fetchData} />}
          {activeTab === 'credits' && <CreditsTab credits={credits} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} />}
          {activeTab === 'payments' && <PaymentsTab userId={userId} onRefresh={fetchData} />}
          {activeTab === 'scoreHistory' && <ScoreHistoryTab scoreHistory={scoreHistory} />}
        </div>
      </div>
    </div>
  );
}
