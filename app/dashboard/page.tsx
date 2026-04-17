'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import type { User } from '@supabase/supabase-js';
import {
  Check, AlertCircle, Zap, ChevronDown, ChevronUp, ExternalLink,
  TrendingUp, Calendar, RefreshCw, Pencil, X, ArrowRight,
  Settings, Play, BarChart2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  interval_months: number | null;
  cancel_at_period_end: boolean | null;
  [key: string]: unknown;
}

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

type ConfirmStep = 'idle' | 'confirming' | 'running' | 'purchasing';

// ─── Plan config ──────────────────────────────────────────────────────────────

const planLabels: Record<string, string> = {
  one_time: 'Single Audit',
  professional: 'Single Audit',
  monthly: 'Monthly Monitor',
  bimonthly: 'Bi-Monthly Monitor',
  yearly: 'Yearly Monitor',
};

const isRecurring = (plan: string) =>
  plan === 'monthly' || plan === 'yearly' || plan === 'bimonthly';

// ─── Small components ─────────────────────────────────────────────────────────

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-[#c9a85c]`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{children}</p>
  );
}

// ─── Score trend ─────────────────────────────────────────────────────────────

function ScoreTrendChart({ scoreHistory }: { scoreHistory: ScoreHistoryEntry[] }) {
  const W = 280; const H = 72; const PX = 16; const PY = 10;
  const iW = W - PX * 2; const iH = H - PY * 2;
  if (scoreHistory.length < 2) return null;
  const scores = scoreHistory.map((p) => p.overall);
  const min = Math.min(...scores); const max = Math.max(...scores); const range = max - min || 1;
  const toX = (i: number) => PX + (i / (scoreHistory.length - 1)) * iW;
  const toY = (v: number) => PY + iH - ((v - min) / range) * iH;
  const pts = scoreHistory.map((p, i) => `${toX(i)},${toY(p.overall)}`).join(' ');
  const last = scoreHistory[scoreHistory.length - 1];
  const first = scoreHistory[0];
  const up = last.overall >= first.overall;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? '#22c55e' : '#f97316'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {scoreHistory.map((p, i) => <circle key={i} cx={toX(i)} cy={toY(p.overall)} r={2.5} fill={up ? '#22c55e' : '#f97316'} />)}
      <text x={toX(0)} y={H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">{first.overall}</text>
      <text x={toX(scoreHistory.length - 1)} y={H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">{last.overall}</text>
    </svg>
  );
}

// ─── Setup stepper ────────────────────────────────────────────────────────────

type SetupStep = 'configure' | 'first-audit' | 'active';

function getSetupStep(onboarding: OnboardingData | null | undefined, audits: AuditRow[] | undefined): SetupStep {
  if (!onboarding) return 'configure';
  const hasCompletedAudit = (audits ?? []).some((a) => a.status === 'complete');
  if (!hasCompletedAudit) return 'first-audit';
  return 'active';
}

function SetupStepper({
  step, plan, onboarding, cadence,
}: {
  step: SetupStep;
  plan: string;
  onboarding: OnboardingData | null | undefined;
  cadence: string;
}) {
  const steps = [
    { id: 'configure', label: 'Configure', icon: Settings },
    { id: 'first-audit', label: 'First audit', icon: Play },
    { id: 'active', label: 'Live', icon: BarChart2 },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-[#c9a85c] text-white ring-4 ring-[#c9a85c]/20' :
                'bg-slate-100 text-slate-400'
              }`}>
                {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                done ? 'text-emerald-600' : active ? 'text-[#c9a85c]' : 'text-slate-400'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-16 sm:w-24 mx-1 mb-5 transition-colors ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step content ─────────────────────────────────────────────────────────────

function StepConfigure({ plan }: { plan: string }) {
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-1">Connect your site first</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Tell us your website URL and connect Google Search Console. This unlocks real search data in your audit — without it, results are much less useful.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Set up my site <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepFirstAudit({
  plan, onboarding, availableCredits, runningAudit, confirmStep, setConfirmStep,
  handleRunAudit,
}: {
  plan: string;
  onboarding: OnboardingData;
  availableCredits: AuditCredit[];
  runningAudit: AuditRow | undefined;
  confirmStep: ConfirmStep;
  setConfirmStep: (s: ConfirmStep) => void;
  handleRunAudit: () => void;
}) {
  const hasCredits = availableCredits.length > 0;
  const missingGSC = !onboarding.gsc_connected;
  const missingGA4 = !onboarding.ga4_property_id;
  const hasMissing = missingGSC || missingGA4;

  if (runningAudit) {
    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center gap-4">
        <Spinner size={6} />
        <div>
          <p className="font-semibold text-slate-800">Audit in progress…</p>
          <p className="text-sm text-slate-500 mt-0.5">{runningAudit.url}</p>
        </div>
        <Link href={`/audit-progress/${runningAudit.id}`}
          className="ml-auto shrink-0 bg-[#c9a85c] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d4b46a] transition-colors">
          View progress
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#c9a85c]/10 flex items-center justify-center shrink-0">
          <Play className="w-5 h-5 text-[#c9a85c]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-1">Run your baseline audit</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-1">
            This first audit establishes your SEO baseline — a score across 80+ checks with your real Google data.
            {isRecurring(plan) && ' After this, your plan auto-scans your site on a schedule so you can track progress over time.'}
          </p>

          {hasMissing && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-3 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                {missingGSC && <p>Google Search Console not connected — you&apos;ll get a partial audit.</p>}
                {missingGA4 && <p>GA4 not configured — traffic data will be missing.</p>}
                <Link href="/onboarding" className="font-semibold underline underline-offset-2 mt-0.5 inline-block">Connect now →</Link>
              </div>
            </div>
          )}

          {!hasCredits ? (
            <div className="flex flex-wrap gap-3 mt-4">
              <p className="w-full text-sm text-slate-500">No credits — purchase one to run your first audit.</p>
              <Link href="/checkout/one_time"
                className="inline-flex items-center gap-2 bg-[#c9a85c] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d4b46a] transition-colors">
                Buy a credit — $349
              </Link>
            </div>
          ) : confirmStep === 'idle' ? (
            <button
              onClick={() => setConfirmStep('confirming')}
              className="mt-4 inline-flex items-center gap-2 bg-[#c9a85c] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#d4b46a] transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" /> Run My First Audit
            </button>
          ) : confirmStep === 'confirming' ? (
            <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 mb-3">
                This uses <strong>1 credit</strong> and starts a full analysis of <strong>{onboarding.website_url}</strong>.
              </p>
              <div className="flex gap-3">
                <button onClick={handleRunAudit}
                  className="bg-[#c9a85c] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#d4b46a] transition-colors flex items-center gap-2">
                  <Check className="w-4 h-4" /> Confirm & run
                </button>
                <button onClick={() => setConfirmStep('idle')}
                  className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Spinner size={4} /> Starting audit…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Monitoring card (active subscribers) ────────────────────────────────────

function MonitoringCard({
  schedule, scoreHistory, subscription,
  monitoringToggling, handleMonitoringToggle,
  showDatePicker, setShowDatePicker,
  pendingDate, setPendingDate,
  rescheduling, handleReschedule,
}: {
  schedule: MonitoringSchedule;
  scoreHistory: ScoreHistoryEntry[];
  subscription: Subscription | null;
  monitoringToggling: boolean;
  handleMonitoringToggle: () => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  pendingDate: string;
  setPendingDate: (v: string) => void;
  rescheduling: boolean;
  handleReschedule: () => void;
}) {
  const cadence = schedule.intervalMonths === 12 ? 'year' : 'month';
  const planName = subscription?.plan ? planLabels[subscription.plan] ?? 'Monitor' : 'Monitor';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  return (
    <Card>
      {/* Header strip */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-[#c9a85c]" />
          <span className="text-sm font-semibold text-slate-700">{planName}</span>
          <span className="text-xs text-slate-400">· auto-scans every {cadence}</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          schedule.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${schedule.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {schedule.enabled ? 'Active' : 'Paused'}
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Score trend */}
        {scoreHistory.length > 1 && (
          <div>
            <SectionLabel>Score history</SectionLabel>
            <ScoreTrendChart scoreHistory={scoreHistory} />
          </div>
        )}

        {/* Next scheduled scan */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Next auto-scan</p>
                <p className="text-sm font-semibold text-slate-800">
                  {schedule.nextRunAt
                    ? new Date(schedule.nextRunAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not yet scheduled'}
                </p>
              </div>
            </div>
            {!showDatePicker && (
              <button
                onClick={() => {
                  setPendingDate(schedule.nextRunAt ? new Date(schedule.nextRunAt).toISOString().slice(0, 10) : minDate);
                  setShowDatePicker(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#c9a85c] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white"
              >
                <Pencil className="w-3 h-3" /> Change
              </button>
            )}
          </div>

          {showDatePicker && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Pick a new date for the next auto-scan:</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date" value={pendingDate} min={minDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a85c]/30 focus:border-[#c9a85c]/50"
                />
                <button onClick={handleReschedule} disabled={!pendingDate || rescheduling}
                  className="px-4 py-2 rounded-lg bg-[#c9a85c] text-white text-sm font-semibold hover:bg-[#d4b46a] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {rescheduling ? <><Spinner size={3} /> Saving…</> : 'Save'}
                </button>
                <button onClick={() => { setShowDatePicker(false); setPendingDate(''); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Last scan */}
        {schedule.lastRunAt && (
          <div className="flex items-center justify-between text-sm text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Last auto-scan
            </span>
            <span className="text-slate-700">
              {new Date(schedule.lastRunAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {scoreHistory.length > 0 && (
                <> · <span className="font-semibold text-[#c9a85c]">{scoreHistory[scoreHistory.length - 1].overall}</span></>
              )}
            </span>
          </div>
        )}

        <button onClick={handleMonitoringToggle} disabled={monitoringToggling}
          className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
          {monitoringToggling
            ? <><Spinner size={3} />{schedule.enabled ? 'Pausing…' : 'Resuming…'}</>
            : schedule.enabled ? 'Pause monitoring' : 'Resume monitoring'}
        </button>
      </div>
    </Card>
  );
}

// ─── Audit history ────────────────────────────────────────────────────────────

function AuditHistory({ audits }: { audits: AuditRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? audits : audits.slice(0, 5);

  if (audits.length === 0) return null;

  return (
    <Card>
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Audit history</p>
        <span className="text-xs text-slate-400">{audits.length} total</span>
      </div>
      <div className="px-3 pb-3 space-y-0.5">
        {visible.map((audit) => (
          <Link key={audit.id} href={`/results/${audit.id}`}
            className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 font-medium truncate">{audit.url}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(audit.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                <span className={
                  audit.status === 'complete' ? 'text-emerald-600' :
                  audit.status === 'running' ? 'text-[#c9a85c]' : 'text-slate-400'
                }>
                  {audit.status === 'complete' ? 'Complete' : audit.status === 'running' ? 'In progress' : audit.status}
                </span>
                {audit.audit_type === 'scheduled' && (
                  <span className="ml-1.5 text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">Auto</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              {audit.score != null && (
                <span className={`text-sm font-bold tabular-nums ${
                  Number(audit.score) >= 70 ? 'text-emerald-600' :
                  Number(audit.score) >= 40 ? 'text-amber-500' : 'text-red-500'
                }`}>{audit.score}</span>
              )}
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
      {audits.length > 5 && (
        <div className="px-6 pb-5">
          <button onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors mx-auto">
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAll ? 'Show less' : `Show ${audits.length - 5} more`}
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Ad-hoc run card ──────────────────────────────────────────────────────────

function AdHocRunCard({
  onboarding, availableCredits, runningAudit,
  confirmStep, setConfirmStep, handleRunAudit,
  subscription, handleBuyAddon, confirmBuying,
}: {
  onboarding: OnboardingData;
  availableCredits: AuditCredit[];
  runningAudit: AuditRow | undefined;
  confirmStep: ConfirmStep;
  setConfirmStep: (s: ConfirmStep) => void;
  handleRunAudit: () => void;
  subscription: Subscription | null;
  handleBuyAddon: () => void;
  confirmBuying: boolean;
}) {
  const hasCredits = availableCredits.length > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Run an audit</p>
          <p className="text-xs text-slate-400 mt-0.5">{availableCredits.length} credit{availableCredits.length !== 1 ? 's' : ''} available</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
          hasCredits ? 'bg-[#c9a85c]/10 text-[#c9a85c]' : 'bg-slate-100 text-slate-400'
        }`}>
          <Zap className="w-3 h-3" /> {availableCredits.length}
        </span>
      </div>

      {runningAudit ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Spinner size={5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">Audit running</p>
            <p className="text-xs text-slate-500 truncate">{runningAudit.url}</p>
          </div>
          <Link href={`/audit-progress/${runningAudit.id}`}
            className="shrink-0 bg-[#c9a85c] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#d4b46a] transition-colors">
            View
          </Link>
        </div>
      ) : hasCredits ? (
        <>
          {confirmStep === 'idle' && (
            <button onClick={() => setConfirmStep('confirming')}
              className="w-full bg-[#c9a85c] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#d4b46a] transition-colors flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Run Audit Now
            </button>
          )}
          {confirmStep === 'confirming' && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-slate-700">Uses <strong>1 credit</strong> · <span className="text-slate-500">{onboarding.website_url}</span></p>
              <div className="flex gap-2">
                <button onClick={handleRunAudit}
                  className="bg-[#c9a85c] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d4b46a] transition-colors flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Confirm
                </button>
                <button onClick={() => setConfirmStep('idle')}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {confirmStep === 'running' && (
            <div className="flex items-center gap-2 text-sm text-slate-600 py-2">
              <Spinner size={4} /> Starting audit…
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-sm text-slate-500 mb-3">No credits remaining.</p>
          {subscription && (() => {
            const plan = PLANS[subscription.plan as keyof typeof PLANS];
            if (!plan?.addonPrice) return null;
            return (
              <button onClick={handleBuyAddon} disabled={confirmBuying}
                className="w-full border border-slate-200 bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-white transition-colors disabled:opacity-60">
                {confirmBuying ? 'Processing…' : `Buy extra audit — ${plan.addonDisplayPrice}`}
              </button>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [onboarding, setOnboarding] = useState<OnboardingData | null | undefined>(undefined);
  const [audits, setAudits] = useState<AuditRow[] | undefined>(undefined);
  const [credits, setCredits] = useState<AuditCredit[] | undefined>(undefined);

  const [confirmStep, setConfirmStep] = useState<ConfirmStep>('idle');
  const [error, setError] = useState('');
  const [confirmBuying, setConfirmBuying] = useState(false);

  const [monitoringSchedule, setMonitoringSchedule] = useState<MonitoringSchedule | null | undefined>(undefined);
  const [monitoringScoreHistory, setMonitoringScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [monitoringToggling, setMonitoringToggling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState('');

  const [showCreditHistory, setShowCreditHistory] = useState(false);

  const availableCredits = (credits ?? []).filter((c) => c.status === 'available');
  const runningAudit = (audits ?? []).find((a) => a.status === 'running');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return; }
      setUser(user);
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authChecked || !user) return;

    supabase.from('subscriptions')
      .select('plan,status,expires_at,interval_months,cancel_at_period_end')
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

    supabase.from('Audit')
      .select('id,url,status,score,createdAt,audit_type')
      .eq('user_id', user.id)
      .order('createdAt', { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        const rows = (data ?? []) as AuditRow[];
        setAudits(rows);

        const subSnap = await supabase.from('subscriptions').select('plan,status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
        const sub = subSnap.data as Subscription | null;
        const credSnap = await supabase.from('audit_credits').select('id,credit_type,status,amount_cents,audit_id,created_at,used_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
        const creds = (credSnap.data ?? []) as AuditCredit[];

        const hasAvailable = creds.some((c) => c.status === 'available');
        const hasCompletedFull = rows.some((a) => a.audit_type === 'full' && a.status === 'complete');
        if (sub && sub.status === 'active' && !hasAvailable && !hasCompletedFull) {
          const { data: newCredit } = await supabase.from('audit_credits').insert({
            user_id: user.id,
            credit_type: sub.plan === 'professional' || sub.plan === 'one_time' ? 'one_time' : 'subscription',
            status: 'available',
            amount_cents: PLANS[sub.plan as keyof typeof PLANS]?.price || 349_00,
          }).select('id,credit_type,status,amount_cents,audit_id,created_at,used_at').single();
          if (newCredit) creds.push(newCredit as AuditCredit);
        }
        setCredits(creds);
      });
  }, [authChecked, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/monitoring/status')
      .then(async (res) => {
        if (!res.ok) { setMonitoringSchedule(null); return; }
        const json = await res.json();
        setMonitoringSchedule(json.schedule ?? null);
        setMonitoringScoreHistory(json.scoreHistory ?? []);
      })
      .catch(() => setMonitoringSchedule(null));
  }, [authChecked]);

  async function handleMonitoringToggle() {
    if (!monitoringSchedule) return;
    setMonitoringToggling(true);
    try {
      const res = await fetch('/api/monitoring/toggle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !monitoringSchedule.enabled }),
      });
      if (res.ok) {
        const json = await res.json();
        setMonitoringSchedule((prev) => prev ? { ...prev, enabled: json.enabled } : prev);
      }
    } finally { setMonitoringToggling(false); }
  }

  async function handleReschedule() {
    if (!pendingDate) return;
    setRescheduling(true);
    try {
      const res = await fetch('/api/monitoring/reschedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextRunAt: new Date(pendingDate).toISOString() }),
      });
      if (res.ok) {
        const json = await res.json();
        setMonitoringSchedule((prev) => prev ? { ...prev, nextRunAt: json.nextRunAt } : prev);
        setShowDatePicker(false);
        setPendingDate('');
      }
    } finally { setRescheduling(false); }
  }

  async function handleRunAudit() {
    if (!user || !onboarding || availableCredits.length === 0) return;
    setConfirmStep('running');
    setError('');
    try {
      const res = await fetch('/api/full-audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    setConfirmBuying(true);
    try {
      const plan = PLANS[subscription.plan as keyof typeof PLANS];
      const addonPrice = plan?.addonPrice || 349_00;
      await new Promise((r) => setTimeout(r, 2000));
      await supabase.from('audit_credits').insert({ user_id: user.id, credit_type: 'addon', status: 'available', amount_cents: addonPrice });
    } catch {
      setError('Failed to purchase addon. Please try again.');
    } finally {
      setConfirmBuying(false);
      setCredits(undefined);
    }
  }

  // Show spinner until auth resolves
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size={8} />
      </div>
    );
  }

  const dataLoading = subscription === undefined || onboarding === undefined || audits === undefined || credits === undefined;
  const setupStep = getSetupStep(onboarding, audits);
  const isGuided = setupStep !== 'active';

  // Plan context
  const planName = subscription?.plan ? planLabels[subscription.plan] ?? subscription.plan : null;
  const recurring = subscription?.plan ? isRecurring(subscription.plan) : false;
  const cadence = monitoringSchedule?.intervalMonths === 12 ? 'year' : 'month';

  return (
    <div className="space-y-6">

      {/* Loading skeleton */}
      {dataLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-36 animate-pulse" />
          ))}
        </div>
      )}

      {!dataLoading && (
        <>
          {/* ── Guided setup (new users) ─────────────────────────────────── */}
          {isGuided && (
            <Card className="p-6">
              {/* Plan welcome */}
              {planName && (
                <div className="flex items-center gap-2 mb-5">
                  {recurring && <RefreshCw className="w-4 h-4 text-[#c9a85c]" />}
                  <span className="text-sm font-semibold text-slate-700">{planName}</span>
                  {recurring && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      auto-scans every {cadence}
                    </span>
                  )}
                  {subscription?.status === 'active' && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  )}
                </div>
              )}

              {/* Stepper */}
              <SetupStepper step={setupStep} plan={subscription?.plan ?? ''} onboarding={onboarding} cadence={cadence} />

              {/* Current step content */}
              {setupStep === 'configure' && <StepConfigure plan={subscription?.plan ?? ''} />}
              {setupStep === 'first-audit' && onboarding && (
                <StepFirstAudit
                  plan={subscription?.plan ?? ''}
                  onboarding={onboarding}
                  availableCredits={availableCredits}
                  runningAudit={runningAudit}
                  confirmStep={confirmStep}
                  setConfirmStep={setConfirmStep}
                  handleRunAudit={handleRunAudit}
                />
              )}

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              {/* What's included — shown on first two steps */}
              {subscription && recurring && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">What&apos;s included</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(PLANS[subscription.plan as keyof typeof PLANS]?.features ?? []).map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Active user layout ────────────────────────────────────────── */}
          {!isGuided && (
            <div className="grid sm:grid-cols-[1fr_320px] gap-6 items-start">
              {/* Left column */}
              <div className="space-y-6">
                {/* Monitoring card (recurring plans) */}
                {monitoringSchedule && (
                  <MonitoringCard
                    schedule={monitoringSchedule}
                    scoreHistory={monitoringScoreHistory}
                    subscription={subscription}
                    monitoringToggling={monitoringToggling}
                    handleMonitoringToggle={handleMonitoringToggle}
                    showDatePicker={showDatePicker}
                    setShowDatePicker={setShowDatePicker}
                    pendingDate={pendingDate}
                    setPendingDate={setPendingDate}
                    rescheduling={rescheduling}
                    handleReschedule={handleReschedule}
                  />
                )}
                <AuditHistory audits={audits ?? []} />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Ad-hoc run */}
                <AdHocRunCard
                  onboarding={onboarding!}
                  availableCredits={availableCredits}
                  runningAudit={runningAudit}
                  confirmStep={confirmStep}
                  setConfirmStep={setConfirmStep}
                  handleRunAudit={handleRunAudit}
                  subscription={subscription}
                  handleBuyAddon={handleBuyAddon}
                  confirmBuying={confirmBuying}
                />

                {/* Subscription summary */}
                {subscription && (
                  <Card className="p-5">
                    <SectionLabel>Your plan</SectionLabel>
                    <p className="text-sm font-semibold text-slate-800 mb-1">{planName}</p>
                    {recurring && !subscription.cancel_at_period_end && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3" />
                        Auto-renews {subscription.interval_months === 12 ? 'yearly' : 'monthly'}
                        {subscription.expires_at ? ` · ${new Date(subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </p>
                    )}
                    {subscription.cancel_at_period_end && subscription.expires_at && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        Cancels {new Date(subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </Card>
                )}

                {/* Credit history */}
                {credits && credits.length > 0 && (
                  <Card className="p-5">
                    <button onClick={() => setShowCreditHistory(!showCreditHistory)}
                      className="flex items-center justify-between w-full text-left">
                      <SectionLabel>Credits</SectionLabel>
                      <div className="flex items-center gap-1.5 -mt-3">
                        <span className="text-xs font-bold text-[#c9a85c]">{availableCredits.length} available</span>
                        {showCreditHistory ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </button>
                    {showCreditHistory && (
                      <div className="space-y-1.5 mt-1">
                        {credits.slice(0, 8).map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-slate-500">
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {c.credit_type.replace(/_/g, ' ')}
                            </span>
                            <span className={c.status === 'available' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                              {c.status === 'available' ? 'Available' : c.status === 'used' ? 'Used' : 'Expired'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* Config */}
                {onboarding && (
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <SectionLabel>Configuration</SectionLabel>
                      <Link href="/onboarding" className="text-xs text-[#c9a85c] hover:underline -mt-3">Edit</Link>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Website</span>
                        <span className="text-slate-700 font-medium truncate max-w-[140px]">{onboarding.website_url}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Search Console</span>
                        <span className={onboarding.gsc_connected ? 'text-emerald-600' : 'text-slate-400'}>
                          {onboarding.gsc_connected ? '✓ Connected' : 'Not connected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">GA4</span>
                        <span className={onboarding.ga4_property_id ? 'text-slate-700' : 'text-slate-400'}>
                          {onboarding.ga4_property_id || 'Not configured'}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
