'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ScoreGauge from './ScoreGauge';
import ScoreBreakdown from './ScoreBreakdown';
import Link from 'next/link';
import {
  Check, AlertTriangle, FileText, Globe, BarChart3, Zap,
  Search, Download, ArrowLeft, TrendingUp, Ticket, ArrowRight, Bot,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  content: 'Content Quality',
  onPage: 'On-Page SEO',
  schema: 'Schema Markup',
  performance: 'Performance',
  aiReadiness: 'AI Search Ready',
  images: 'Images',
};

interface ActionPlanItem {
  title: string;
  description: string;
  effort: string;
  impact: string;
  category: string;
}

interface ActionPlanPhase {
  phase: string;
  title: string;
  timeline: string;
  items: ActionPlanItem[];
  projectedScore: number;
}

interface AuditTicket {
  id: string;
  title: string;
  priority: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  testingInstructions: string;
  dependencies: string[];
  category: string;
}

interface PremiumInsights {
  executive?: string;
  topPriority?: string;
  criticalIssues?: string[];
  quickWins?: string[];
  actionPlan?: ActionPlanPhase[];
  technical?: string;
  content?: string;
  onPage?: string;
  schema?: string;
  performance?: string;
  aiReadiness?: string;
  images?: string;
  googleData?: string;
  deepDive?: string;
  googleDataDeep?: string;
  implementationGuide?: string;
  tickets?: AuditTicket[];
  schemaTemplates?: { type: string; description: string; jsonLd: string; applicablePages: string }[];
}

interface FullAuditResultsProps {
  audit: Record<string, unknown>;
  results: Record<string, unknown>;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-error text-white',
  P1: 'bg-error-light text-error',
  P2: 'bg-primary-fixed/40 text-primary',
  P3: 'bg-surface-high text-on-surface-muted',
};

const PHASE_COLORS: Record<string, string> = {
  critical: 'border-error/40 bg-error-light/30',
  high: 'border-primary/40 bg-primary-fixed/20',
  medium: 'border-tertiary/40 bg-tertiary-fixed/20',
  backlog: 'border-on-surface-light/20 bg-surface-low',
};

const PHASE_SCORE_COLORS: Record<string, string> = {
  critical: 'text-error',
  high: 'text-primary',
  medium: 'text-tertiary',
  backlog: 'text-on-surface-muted',
};

export default function FullAuditResults({ audit, results }: FullAuditResultsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // ── Integration state ──────────────────────────────────────────────────────
  const [integrationStatus, setIntegrationStatus] = useState<{
    github: boolean; jira: boolean; githubLogin?: string; jiraEmail?: string;
  }>({ github: false, jira: false });
  const [ghRepos, setGhRepos] = useState<{ id: number; full_name: string; private: boolean }[]>([]);
  const [jiraResources, setJiraResources] = useState<{ id: string; name: string; url: string; projects: { id: string; key: string; name: string }[] }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedCloud, setSelectedCloud] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [pushing, setPushing] = useState<'github' | 'jira' | null>(null);
  const [pushResult, setPushResult] = useState<{ provider: 'github' | 'jira'; created: { url?: string; key?: string; title?: string; summary?: string }[]; errors: string[] } | null>(null);

  const auditId = audit?.id as string | undefined;

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) setIntegrationStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadGhRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/github/repos');
      if (res.ok) { const d = await res.json(); setGhRepos(d.repos || []); }
    } catch { /* ignore */ }
  }, []);

  const loadJiraResources = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/jira/resources');
      if (res.ok) { const d = await res.json(); setJiraResources(d.resources || []); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadIntegrationStatus();
    // Handle OAuth return — ?connected=github|jira
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('connected');
      if (connected === 'github' || connected === 'jira') {
        setActiveTab('tickets');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [loadIntegrationStatus]);

  useEffect(() => {
    if (integrationStatus.github) loadGhRepos();
    if (integrationStatus.jira) loadJiraResources();
  }, [integrationStatus.github, integrationStatus.jira, loadGhRepos, loadJiraResources]);

  const connectGithub = () => {
    if (auditId) window.location.href = `/api/integrations/github/connect?auditId=${auditId}`;
  };
  const connectJira = () => {
    if (auditId) window.location.href = `/api/integrations/jira/connect?auditId=${auditId}`;
  };
  const disconnectProvider = async (provider: 'github' | 'jira') => {
    await fetch('/api/integrations/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
    setIntegrationStatus(s => ({ ...s, [provider]: false }));
    if (provider === 'github') { setGhRepos([]); setSelectedRepo(''); }
    if (provider === 'jira') { setJiraResources([]); setSelectedCloud(''); setSelectedProject(''); }
  };
  const pushToGithub = async () => {
    if (!selectedRepo || !auditId) return;
    setPushing('github'); setPushResult(null);
    try {
      const res = await fetch('/api/integrations/github/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auditId, repo: selectedRepo }) });
      const d = await res.json();
      setPushResult({ provider: 'github', created: d.created || [], errors: d.errors || [] });
    } catch { setPushResult({ provider: 'github', created: [], errors: ['Network error'] }); }
    finally { setPushing(null); }
  };
  const pushToJira = async () => {
    if (!selectedCloud || !selectedProject || !auditId) return;
    setPushing('jira'); setPushResult(null);
    try {
      const res = await fetch('/api/integrations/jira/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auditId, cloudId: selectedCloud, projectKey: selectedProject }) });
      const d = await res.json();
      setPushResult({ provider: 'jira', created: d.created || [], errors: d.errors || [] });
    } catch { setPushResult({ provider: 'jira', created: [], errors: ['Network error'] }); }
    finally { setPushing(null); }
  };

  const score = results.score as { overall: number; categories: Record<string, { score: number; weight: number }> };
  const pages = (results.pages || []) as Record<string, unknown>[];
  const recommendations = (results.recommendations || []) as Record<string, unknown>[];
  const insights = results.insights as PremiumInsights | undefined;
  const googleData = results.googleData as Record<string, unknown> | undefined;
  const gsc = googleData?.gsc as Record<string, unknown> | undefined;
  const ga4 = googleData?.ga4 as Record<string, unknown> | undefined;
  const crux = googleData?.crux as Record<string, unknown> | undefined;
  const psi = googleData?.pageSpeed as Record<string, unknown> | undefined;

  const tickets = insights?.tickets || [];
  const actionPlan = insights?.actionPlan || [];

  // Aggregate issues across all pages
  const allChecks: { name: string; status: string; message: string }[] = [];
  for (const [, data] of Object.entries(results)) {
    if (data && typeof data === 'object' && 'checks' in (data as Record<string, unknown>)) {
      for (const check of ((data as Record<string, unknown>).checks as { name: string; status: string; message: string }[])) {
        allChecks.push(check);
      }
    }
  }
  const issues = allChecks.filter((c) => c.status === 'fail');
  const wins = allChecks.filter((c) => c.status === 'pass');

  const categories = Object.entries(score?.categories || {}).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    score: val.score,
    weight: val.weight,
  }));

  // Score roadmap — build milestone progression from action plan
  const currentScore = score?.overall || 0;
  const scoreRoadmap = actionPlan.map((phase) => ({
    phase: phase.phase,
    title: phase.title,
    timeline: phase.timeline,
    projectedScore: phase.projectedScore || 0,
  })).filter((p) => p.projectedScore > currentScore);

  const finalScore = scoreRoadmap.length > 0
    ? scoreRoadmap[scoreRoadmap.length - 1].projectedScore
    : Math.min(90, currentScore + 25);
  const fastScore = scoreRoadmap[1]?.projectedScore || scoreRoadmap[0]?.projectedScore || Math.min(80, currentScore + 15);
  const fastTimeline = scoreRoadmap[1]?.timeline || scoreRoadmap[0]?.timeline || '4 weeks';

  // Match a recommendation to its closest ticket
  function findRelatedTicket(rec: Record<string, unknown>): AuditTicket | null {
    if (!tickets.length) return null;
    const recTitle = String(rec.title || '').toLowerCase();
    const recCat = String(rec.category || '').toLowerCase();
    // Exact category match first
    const catMatch = tickets.find(t =>
      t.category?.toLowerCase().includes(recCat) || recCat.includes(t.category?.toLowerCase() || '')
    );
    if (catMatch) return catMatch;
    // Fuzzy title match
    const words = recTitle.split(' ').filter(w => w.length > 4);
    const titleMatch = tickets.find(t =>
      words.some(w => t.title?.toLowerCase().includes(w))
    );
    return titleMatch || null;
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'actionplan', label: 'Action Plan', icon: TrendingUp },
    { key: 'pages', label: `Pages (${pages.length})`, icon: FileText },
    { key: 'recommendations', label: `Fixes (${recommendations.length})`, icon: AlertTriangle },
    ...(gsc || ga4 ? [{ key: 'google', label: 'Google Data', icon: Search }] : []),
    ...(crux || psi ? [{ key: 'performance', label: 'Performance', icon: Zap }] : []),
    { key: 'ai', label: 'AI Search', icon: Bot },
    ...(tickets.length > 0 ? [{ key: 'tickets', label: `Tickets (${tickets.length})`, icon: Ticket }] : []),
  ];

  const impactColors: Record<string, string> = {
    high: 'text-error bg-error-light',
    medium: 'text-primary bg-primary-fixed/30',
    low: 'text-tertiary bg-tertiary-fixed/30',
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-3">Full Audit Complete</p>
        <h1 className="font-serif text-3xl md:text-4xl text-on-surface mb-2 tracking-tight">SEO Audit Report</h1>
        <p className="text-on-surface-muted">{String(audit.url)}</p>
        <p className="text-xs text-on-surface-light mt-1">
          {Number(results.pagesCrawled)} pages crawled
          {' · '}{new Date(String(audit.createdAt)).toLocaleDateString()}
        </p>
      </div>

      {/* Score */}
      <div className="flex justify-center mb-6">
        <ScoreGauge score={currentScore} />
      </div>
      <div className="flex justify-center mb-8">
        <ScoreBreakdown categories={categories} />
      </div>

      {/* ── Score Roadmap — Executive Banner ── */}
      {actionPlan.length > 0 && (
        <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-1">Your Path to Top Performance</p>
              <h3 className="font-serif text-2xl text-on-surface">
                Reach <span className="text-primary">{fastScore}/100</span> in {fastTimeline}
              </h3>
              <p className="text-on-surface-muted text-sm mt-1">
                Full roadmap gets you to <span className="font-semibold text-on-surface">{finalScore}/100</span> — fixing the issues costing you traffic today.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('actionplan')}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-container font-medium"
            >
              See full plan <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Score progression timeline */}
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {/* Current */}
            <div className="flex flex-col items-center shrink-0 min-w-[80px]">
              <div className="w-12 h-12 rounded-full bg-surface-low border-2 border-on-surface-light/20 flex items-center justify-center">
                <span className="text-sm font-bold text-on-surface-muted">{currentScore}</span>
              </div>
              <span className="text-[10px] text-on-surface-light mt-1.5 text-center">Today</span>
            </div>

            {scoreRoadmap.map((milestone, i) => (
              <div key={i} className="flex items-center flex-1 min-w-[90px]">
                {/* Connector line */}
                <div className="flex-1 h-0.5 bg-gradient-to-r from-on-surface-light/20 to-primary/40 min-w-[20px]" />
                {/* Milestone */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    i === 0 ? 'bg-error-light border-error/40' :
                    i === 1 ? 'bg-primary-fixed/30 border-primary/40' :
                    'bg-tertiary-fixed/20 border-tertiary/40'
                  }`}>
                    <span className={`text-sm font-bold ${
                      i === 0 ? 'text-error' : i === 1 ? 'text-primary' : 'text-tertiary'
                    }`}>{milestone.projectedScore}</span>
                  </div>
                  <span className="text-[10px] text-on-surface-light mt-1.5 text-center leading-tight max-w-[80px]">{milestone.timeline}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick wins for execs */}
          {insights?.quickWins && insights.quickWins.length > 0 && (
            <div className="mt-6 pt-6 border-t border-on-surface-light/10">
              <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-3">Quick Wins — high ROI, low effort</p>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.quickWins.slice(0, 4).map((win, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-tertiary-fixed/40 text-tertiary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-xs text-on-surface-muted leading-relaxed">{win}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs — centered */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-cta text-on-primary shadow-sm'
                : 'bg-surface-high text-on-surface-muted hover:bg-surface-highest hover:text-on-surface'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* #1 Priority */}
            {insights?.topPriority && (
              <div className="bg-gradient-to-r from-primary-fixed/50 to-primary-fixed/20 rounded-[2rem] p-6">
                <div className="flex items-start gap-3">
                  <span className="bg-gradient-cta text-on-primary text-xs font-bold px-2.5 py-1 rounded-full shrink-0 mt-0.5">#1 Priority</span>
                  <p className="text-on-surface text-sm leading-relaxed">{insights.topPriority}</p>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            {insights?.executive && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-4">Executive Summary</h3>
                <div className="text-on-surface-muted text-sm leading-[1.7] space-y-3">
                  {insights.executive.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pages Crawled', value: String(results.pagesCrawled) },
                { label: 'Issues Found', value: String(issues.length) },
                { label: 'Fixes Ready', value: String(recommendations.length) },
                { label: 'Dev Tickets', value: String(tickets.length) },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-white rounded-2xl shadow-ambient p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-on-surface-light mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Critical Issues */}
            {insights?.criticalIssues && insights.criticalIssues.length > 0 && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-error mb-4">Critical Issues ({insights.criticalIssues.length})</h3>
                <ul className="space-y-4">
                  {insights.criticalIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-error-light text-error text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-on-surface-muted leading-relaxed">{issue}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Category Insights — with ticket links */}
            {insights && (
              <div className="grid md:grid-cols-2 gap-4">
                {([
                  { key: 'technical', label: 'Technical SEO' },
                  { key: 'onPage', label: 'On-Page SEO' },
                  { key: 'content', label: 'Content Quality' },
                  { key: 'schema', label: 'Structured Data' },
                  { key: 'performance', label: 'Performance' },
                  { key: 'aiReadiness', label: 'AI Readiness' },
                ] as { key: keyof PremiumInsights; label: string }[]).map(({ key, label }) => {
                  const text = insights[key] as string | undefined;
                  if (!text) return null;
                  const relatedTickets = tickets.filter(t =>
                    t.category?.toLowerCase().includes(label.toLowerCase().split(' ')[0]) ||
                    label.toLowerCase().includes(t.category?.toLowerCase().split(' ')[0] || '')
                  ).slice(0, 2);
                  return (
                    <div key={key} className="bg-surface-white rounded-2xl shadow-ambient p-6">
                      <h4 className="text-sm font-semibold text-primary mb-2">{label}</h4>
                      <p className="text-on-surface-muted text-xs leading-relaxed mb-3">{text.split('\n\n')[0]}</p>
                      {relatedTickets.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {relatedTickets.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => { setActiveTab('tickets'); setExpandedTicket(t.id); }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-surface-low text-on-surface-muted hover:bg-primary-fixed/30 hover:text-primary transition-colors font-mono"
                            >
                              {t.id} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Patterns */}
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
              <h3 className="font-serif text-xl text-on-surface mb-4">Patterns Detected</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: 'Thin Content Pages', value: (results.thinContentPages as string[])?.length || 0 },
                  { label: 'Missing Titles', value: (results.missingTitlePages as string[])?.length || 0 },
                  { label: 'Missing Meta Descriptions', value: (results.missingMetaDescPages as string[])?.length || 0 },
                  { label: 'Missing Schema', value: (results.missingSchemaPages as string[])?.length || 0 },
                  { label: 'Duplicate Titles', value: (results.duplicateTitles as unknown[])?.length || 0 },
                  { label: 'Slow Pages (>2s)', value: (results.slowPages as string[])?.length || 0 },
                ].map((p) => (
                  <div key={p.label} className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-surface-low">
                    <span className="text-sm text-on-surface-muted">{p.label}</span>
                    <span className={`text-sm font-bold ${p.value > 0 ? 'text-error' : 'text-tertiary'}`}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Working */}
            {wins.length > 0 && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-tertiary mb-4">What&apos;s Working ({wins.length})</h3>
                <ul className="space-y-2">
                  {wins.slice(0, 6).map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                      <span className="text-sm text-on-surface-muted">{c.name}: {c.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── ACTION PLAN TAB ── */}
        {activeTab === 'actionplan' && (
          <div className="space-y-6">
            {/* ROI Header */}
            <div className="bg-gradient-to-r from-primary-fixed/50 to-tertiary-fixed/20 rounded-[2rem] p-8">
              <h3 className="font-serif text-2xl text-on-surface mb-2">
                {currentScore} → {finalScore} in {scoreRoadmap[scoreRoadmap.length - 1]?.timeline || '3 months'}
              </h3>
              <p className="text-on-surface-muted text-sm mb-6">
                Here&apos;s exactly what to do, when, and what it&apos;s worth. Phases are ordered by ROI — do critical fixes first.
              </p>
              {/* Score path */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-on-surface-muted">{currentScore}</span>
                {scoreRoadmap.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-on-surface-light" />
                    <span className={`text-lg font-bold ${PHASE_SCORE_COLORS[m.phase] || 'text-on-surface'}`}>{m.projectedScore}</span>
                    <span className="text-xs text-on-surface-light">({m.timeline})</span>
                  </div>
                ))}
              </div>
            </div>

            {actionPlan.map((phase, pi) => (
              <div key={pi} className={`rounded-[2rem] border p-8 ${PHASE_COLORS[phase.phase] || 'bg-surface-white border-surface-high'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${PHASE_SCORE_COLORS[phase.phase]}`}>
                      {phase.timeline}
                    </span>
                    <h3 className="font-serif text-xl text-on-surface mt-0.5">{phase.title}</h3>
                  </div>
                  {phase.projectedScore > 0 && (
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${PHASE_SCORE_COLORS[phase.phase]}`}>{phase.projectedScore}</div>
                      <div className="text-xs text-on-surface-light">projected score</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(phase.items || []).map((item, ii) => {
                    // Find linked ticket
                    const linked = tickets.find(t =>
                      t.title?.toLowerCase().includes(item.title?.toLowerCase().split(' ')[0] || '') ||
                      item.title?.toLowerCase().includes(t.title?.toLowerCase().split(' ')[0] || '')
                    );
                    return (
                      <div key={ii} className="bg-surface-white/60 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-on-surface">{item.title}</h4>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.effort && (
                              <span className="text-xs text-on-surface-muted">{item.effort}</span>
                            )}
                            {linked && (
                              <button
                                onClick={() => { setActiveTab('tickets'); setExpandedTicket(linked.id); }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary hover:bg-primary-fixed/60 transition-colors font-mono"
                              >
                                {linked.id}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-on-surface-muted leading-relaxed mb-2">{item.description}</p>
                        {item.impact && (
                          <p className="text-xs text-primary font-medium">{item.impact}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Implementation Guide teaser */}
            {insights?.implementationGuide && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-4">Developer Implementation Guide</h3>
                <div className="text-on-surface-muted text-sm leading-[1.7] space-y-3 max-h-96 overflow-y-auto">
                  {insights.implementationGuide.split('\n\n').map((p, i) => (
                    <p key={i} className={p.startsWith('###') ? 'font-semibold text-on-surface pt-2' : ''}>{p}</p>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="mt-4 flex items-center gap-2 text-sm text-primary hover:text-primary-container font-medium"
                >
                  View all {tickets.length} dev tickets <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PAGES TAB ── */}
        {activeTab === 'pages' && (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="text-left text-on-surface-light font-medium px-4 py-3">URL</th>
                    <th className="text-center text-on-surface-light font-medium px-3 py-3 w-16">Status</th>
                    <th className="text-center text-on-surface-light font-medium px-3 py-3 w-20">Speed</th>
                    <th className="text-center text-on-surface-light font-medium px-3 py-3 w-20">Words</th>
                    <th className="text-center text-on-surface-light font-medium px-3 py-3 w-20">Schema</th>
                    <th className="text-center text-on-surface-light font-medium px-3 py-3 w-20">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page, i) => {
                    const onPage = page.onPage as Record<string, unknown> | undefined;
                    const schema = page.schema as Record<string, unknown> | undefined;
                    const content = page.content as Record<string, unknown> | undefined;
                    const pageIssues = [
                      ...((onPage?.checks || []) as { status: string }[]),
                      ...((schema?.checks || []) as { status: string }[]),
                      ...((content?.checks || []) as { status: string }[]),
                    ].filter((c) => c.status === 'fail').length;
                    const urlPath = String(page.url).replace(/^https?:\/\/[^/]+/, '') || '/';
                    return (
                      <tr key={i} className="hover:bg-surface-low/50 transition-colors" style={{ borderBottom: '1px solid rgba(219,194,176,0.1)' }}>
                        <td className="px-4 py-3 text-on-surface truncate max-w-[300px]" title={String(page.url)}>{urlPath}</td>
                        <td className="text-center px-3 py-3">
                          <span className={Number(page.statusCode) < 400 ? 'text-tertiary' : 'text-error'}>{String(page.statusCode)}</span>
                        </td>
                        <td className="text-center px-3 py-3 text-on-surface-muted">{Number(page.responseTime)}ms</td>
                        <td className="text-center px-3 py-3">
                          <span className={Number(content?.wordCount || 0) < 300 ? 'text-error' : 'text-on-surface-muted'}>
                            {String(content?.wordCount || 0)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          {Number(schema?.jsonLdBlocks || 0) > 0
                            ? <Check className="w-4 h-4 text-tertiary mx-auto" />
                            : <span className="text-error">—</span>
                          }
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={pageIssues > 0 ? 'text-error font-medium' : 'text-tertiary'}>{pageIssues}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FIXES TAB ── */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {insights?.topPriority && (
              <div className="bg-gradient-to-r from-primary-fixed/50 to-primary-fixed/20 rounded-2xl p-6 mb-2">
                <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-2">Start Here</p>
                <p className="text-on-surface text-sm leading-relaxed">{insights.topPriority}</p>
              </div>
            )}
            {recommendations.map((rec, i) => {
              const linked = findRelatedTicket(rec);
              return (
                <div key={i} className="bg-surface-white rounded-2xl shadow-ambient p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-on-surface font-semibold text-sm">{String(rec.title)}</h3>
                    <div className="flex gap-2 shrink-0 ml-4 flex-wrap justify-end">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${impactColors[String(rec.impact)] || ''}`}>
                        {String(rec.impact)} impact
                      </span>
                      {linked && (
                        <button
                          onClick={() => { setActiveTab('tickets'); setExpandedTicket(linked.id); }}
                          className="text-xs px-2.5 py-0.5 rounded-full bg-primary-fixed/40 text-primary hover:bg-primary-fixed/60 transition-colors font-mono"
                        >
                          {linked.id} →
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-on-surface-muted text-xs leading-relaxed mb-3">{String(rec.description)}</p>
                  {(rec.affectedUrls as string[])?.length > 0 && (
                    <details className="text-xs">
                      <summary className="text-primary cursor-pointer hover:text-primary-container">
                        {(rec.affectedUrls as string[]).length} affected URLs
                      </summary>
                      <ul className="mt-2 space-y-1 ml-4">
                        {(rec.affectedUrls as string[]).slice(0, 10).map((url, j) => (
                          <li key={j} className="text-on-surface-light truncate">{url}</li>
                        ))}
                        {(rec.affectedUrls as string[]).length > 10 && (
                          <li className="text-on-surface-light">…and {(rec.affectedUrls as string[]).length - 10} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
            {recommendations.length === 0 && (
              <p className="text-on-surface-muted text-center py-8">No recommendations — your site looks great!</p>
            )}
          </div>
        )}

        {/* ── GOOGLE DATA TAB ── */}
        {activeTab === 'google' && (
          <div className="space-y-6">
            {insights?.googleData && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-3">What Your Google Data Tells Us</h3>
                <div className="text-on-surface-muted text-sm leading-[1.7] space-y-3">
                  {insights.googleData.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            )}
            {gsc && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-1">Search Console (90 days)</h3>
                <p className="text-on-surface-light text-xs mb-4">
                  {String((gsc as Record<string, unknown>).totalClicks || 0)} clicks · {String((gsc as Record<string, unknown>).totalImpressions || 0)} impressions
                </p>
                <h4 className="text-sm font-medium text-on-surface-muted mb-2">Top Queries</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-low">
                        <th className="text-left text-on-surface-light px-3 py-2 rounded-l-lg">Query</th>
                        <th className="text-right text-on-surface-light px-3 py-2">Clicks</th>
                        <th className="text-right text-on-surface-light px-3 py-2">Impressions</th>
                        <th className="text-right text-on-surface-light px-3 py-2">CTR</th>
                        <th className="text-right text-on-surface-light px-3 py-2 rounded-r-lg">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((gsc as Record<string, unknown>).topQueries as Record<string, unknown>[])?.slice(0, 15).map((q, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(219,194,176,0.1)' }}>
                          <td className="px-3 py-2 text-on-surface truncate max-w-[200px]">{String(q.query)}</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{String(q.clicks)}</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{String(q.impressions)}</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{(Number(q.ctr) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{Number(q.position).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4 className="text-sm font-medium text-on-surface-muted mb-2">Top Pages</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-low">
                        <th className="text-left text-on-surface-light px-3 py-2 rounded-l-lg">Page</th>
                        <th className="text-right text-on-surface-light px-3 py-2">Clicks</th>
                        <th className="text-right text-on-surface-light px-3 py-2">CTR</th>
                        <th className="text-right text-on-surface-light px-3 py-2 rounded-r-lg">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((gsc as Record<string, unknown>).topPages as Record<string, unknown>[])?.slice(0, 15).map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(219,194,176,0.1)' }}>
                          <td className="px-3 py-2 text-on-surface truncate max-w-[250px]">{String(p.page).replace(/^https?:\/\/[^/]+/, '')}</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{String(p.clicks)}</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{(Number(p.ctr) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-on-surface-muted">{Number(p.position).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {ga4 && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-4">Google Analytics (90 days)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Organic Sessions', value: String((ga4 as Record<string, unknown>).organicSessions || 0) },
                    { label: 'Organic Share', value: `${Number((ga4 as Record<string, unknown>).organicPercentage || 0).toFixed(1)}%` },
                    { label: 'Engagement Rate', value: `${Number((ga4 as Record<string, unknown>).engagementRate || 0).toFixed(1)}%` },
                    { label: 'Total Sessions', value: String((ga4 as Record<string, unknown>).totalSessions || 0) },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-4 bg-surface-low rounded-2xl">
                      <div className="text-xl font-bold text-primary">{s.value}</div>
                      <div className="text-xs text-on-surface-light">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!gsc && !ga4 && (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-on-surface-light mx-auto mb-4" />
                <p className="text-on-surface-muted mb-2">No Google data connected</p>
                <Link href="/onboarding" className="text-primary text-sm hover:text-primary-container mt-2 inline-block">Connect Search Console & GA4 →</Link>
              </div>
            )}
          </div>
        )}

        {/* ── PERFORMANCE TAB ── */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {insights?.performance && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-3">What This Means for Your Visitors</h3>
                <div className="text-on-surface-muted text-sm leading-[1.7] space-y-3">
                  {insights.performance.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            )}
            {psi && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-4">Lighthouse Scores (Mobile)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Performance', score: Number((psi as Record<string, unknown>).performanceScore || 0) },
                    { label: 'SEO', score: Number((psi as Record<string, unknown>).seoScore || 0) },
                    { label: 'Accessibility', score: Number((psi as Record<string, unknown>).accessibilityScore || 0) },
                    { label: 'Best Practices', score: Number((psi as Record<string, unknown>).bestPracticesScore || 0) },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 bg-surface-low rounded-2xl">
                      <div className={`text-2xl font-bold ${item.score >= 90 ? 'text-tertiary' : item.score >= 50 ? 'text-primary' : 'text-error'}`}>
                        {item.score}
                      </div>
                      <div className="text-xs text-on-surface-light mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {crux && (
              <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                <h3 className="font-serif text-xl text-on-surface mb-4">Core Web Vitals (Real Users)</h3>
                <div className="space-y-3">
                  {[
                    { label: 'LCP', data: (crux as Record<string, unknown>).lcp as Record<string, unknown> | null, unit: 'ms', target: 2500 },
                    { label: 'INP', data: (crux as Record<string, unknown>).inp as Record<string, unknown> | null, unit: 'ms', target: 200 },
                    { label: 'CLS', data: (crux as Record<string, unknown>).cls as Record<string, unknown> | null, unit: '', target: 0.1 },
                    { label: 'FCP', data: (crux as Record<string, unknown>).fcp as Record<string, unknown> | null, unit: 'ms', target: 1800 },
                    { label: 'TTFB', data: (crux as Record<string, unknown>).ttfb as Record<string, unknown> | null, unit: 'ms', target: 800 },
                  ].map((metric) => {
                    if (!metric.data) return null;
                    const p75 = Number(metric.data.p75 || 0);
                    const pass = p75 <= metric.target;
                    return (
                      <div key={metric.label} className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-low">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${pass ? 'bg-tertiary' : 'bg-error'}`} />
                          <span className="text-sm text-on-surface font-medium w-12">{metric.label}</span>
                          <span className="text-sm text-on-surface-muted">p75: {p75}{metric.unit}</span>
                        </div>
                        <span className="text-xs text-on-surface-light">{Number(metric.data.good || 0)}% good</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI SEARCH TAB ── */}
        {activeTab === 'ai' && (() => {
          const aiData = (results as Record<string, unknown>).aiReadiness as { score: number; checks: { name: string; status: string; message: string }[] } | undefined;
          const aiScore = aiData?.score ?? 0;
          const aiChecks = aiData?.checks ?? [];

          // Parse the structured aiReadiness text into sections by ### heading
          const aiText = insights?.aiReadiness || '';
          const sections = aiText.split(/\n(?=###\s)/).filter(Boolean);

          const platforms = [
            { name: 'Google AI Overviews', icon: '🔍', desc: 'Appears for 30-40% of queries above organic results' },
            { name: 'ChatGPT / OpenAI', icon: '🤖', desc: '100M+ weekly users who often skip Google entirely' },
            { name: 'Perplexity', icon: '⚡', desc: 'Cites specific pages with facts & structured content' },
            { name: 'Bing Copilot', icon: '💠', desc: 'Powers Microsoft Edge & Windows search answers' },
          ];

          // Find Platform Assessment section text to match each platform
          const platformSection = sections.find(s => s.includes('Platform Assessment')) || '';

          const statusColor = (s: number) => s >= 70 ? 'text-tertiary' : s >= 40 ? 'text-primary' : 'text-error';
          const statusBg = (s: number) => s >= 70 ? 'bg-tertiary-fixed/30' : s >= 40 ? 'bg-primary-fixed/20' : 'bg-error-light';
          const statusLabel = (s: number) => s >= 70 ? 'AI-Ready' : s >= 40 ? 'Partially Ready' : 'Not Ready';
          const checkColor = (st: string) => st === 'pass' ? 'text-tertiary' : st === 'warn' ? 'text-primary' : 'text-error';
          const checkBg = (st: string) => st === 'pass' ? 'bg-tertiary-fixed/30' : st === 'warn' ? 'bg-primary-fixed/20' : 'bg-error-light';
          const checkIcon = (st: string) => st === 'pass' ? '✓' : st === 'warn' ? '~' : '✗';

          return (
            <div className="space-y-6">
              {/* Hero: score + why it matters */}
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[2rem] p-8 text-white">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-5 h-5 text-[#7c9ef8]" />
                      <span className="text-[#7c9ef8] text-xs font-semibold uppercase tracking-widest">AI Search Visibility</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold mb-3">The AI search revolution is here</h2>
                    <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                      Google AI Overviews now appear above organic results for 30-40% of queries. ChatGPT, Perplexity,
                      and Bing Copilot answer questions by citing specific pages — or ignoring sites that aren&apos;t structured for AI.
                      Being invisible here means losing traffic before users even see your links.
                    </p>
                  </div>
                  <div className={`text-center px-8 py-6 rounded-2xl ${statusBg(aiScore)} shrink-0`}>
                    <div className={`text-5xl font-bold ${statusColor(aiScore)}`}>{aiScore}</div>
                    <div className="text-white/60 text-xs mt-1">/ 100</div>
                    <div className={`text-sm font-semibold mt-2 ${statusColor(aiScore)}`}>{statusLabel(aiScore)}</div>
                  </div>
                </div>
              </div>

              {/* Platform cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {platforms.map((p) => {
                  // Look for this platform's assessment in the text
                  const needle = p.name.split(' ')[0].toLowerCase();
                  const relevantText = platformSection.toLowerCase();
                  const idx = relevantText.indexOf(needle);
                  const snippet = idx >= 0
                    ? platformSection.slice(idx, idx + 250).split('\n')[0].replace(/\*\*/g, '').trim()
                    : '';
                  // Determine status from checks
                  const isBlocked = aiChecks.some(c =>
                    (needle === 'chatgpt' && c.name.toLowerCase().includes('gpt') && c.status === 'fail') ||
                    (needle === 'bing' && c.name.toLowerCase().includes('indexnow') && c.status === 'fail') ||
                    (needle === 'google' && c.name.toLowerCase().includes('schema') && c.status === 'fail')
                  );
                  const hasIssues = aiChecks.some(c =>
                    (needle === 'google' && ['schema for ai', 'faq content', 'answer-ready content'].includes(c.name.toLowerCase()) && c.status !== 'pass') ||
                    (needle === 'chatgpt' && c.name.toLowerCase().includes('llms') && c.status !== 'pass') ||
                    (needle === 'perplexity' && c.name.toLowerCase().includes('citation') && c.status !== 'pass') ||
                    (needle === 'bing' && c.name.toLowerCase().includes('indexnow') && c.status !== 'pass')
                  );
                  const platformStatus = isBlocked ? 'Not Ready' : hasIssues ? 'Partially Ready' : 'Ready';
                  const pStatusColor = platformStatus === 'Ready' ? 'text-tertiary' : platformStatus === 'Partially Ready' ? 'text-primary' : 'text-error';
                  const pStatusBg = platformStatus === 'Ready' ? 'bg-tertiary-fixed/30' : platformStatus === 'Partially Ready' ? 'bg-primary-fixed/20' : 'bg-error-light';

                  return (
                    <div key={p.name} className="bg-surface-white rounded-2xl shadow-ambient p-6">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <h4 className="text-sm font-semibold text-on-surface">{p.name}</h4>
                            <p className="text-[10px] text-on-surface-light">{p.desc}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${pStatusBg} ${pStatusColor}`}>
                          {platformStatus}
                        </span>
                      </div>
                      {snippet && (
                        <p className="text-xs text-on-surface-muted leading-relaxed">{snippet}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Technical checks */}
              {aiChecks.length > 0 && (
                <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                  <h3 className="font-serif text-xl text-on-surface mb-1">Technical AI Readiness Checks</h3>
                  <p className="text-xs text-on-surface-light mb-5">Automated checks run against your site during the audit</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    {aiChecks.map((c, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${checkBg(c.status)}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5 ${
                          c.status === 'pass' ? 'bg-tertiary' : c.status === 'warn' ? 'bg-primary' : 'bg-error'
                        }`}>{checkIcon(c.status)}</span>
                        <div>
                          <p className="text-xs font-semibold text-on-surface">{c.name}</p>
                          <p className="text-[11px] text-on-surface-muted leading-relaxed mt-0.5">{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI analysis sections */}
              {sections.length > 0 ? sections.map((section, i) => {
                const lines = section.split('\n');
                const heading = lines[0].replace(/^###\s*/, '').trim();
                const body = lines.slice(1).join('\n').trim();
                if (!body) return null;

                // Special rendering for the "7 Concrete Actions" section
                const isActions = heading.toLowerCase().includes('action') || heading.toLowerCase().includes('concrete');
                const isByPlatform = heading.toLowerCase().includes('platform');

                return (
                  <div key={i} className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                    <h3 className="font-serif text-xl text-on-surface mb-4">{heading}</h3>
                    {isActions ? (
                      // Render numbered actions as visual cards
                      <div className="space-y-3">
                        {body.split(/\n(?=\d+\.\s)/).filter(Boolean).map((action, j) => {
                          const actionText = action.replace(/^\d+\.\s*/, '').trim();
                          const boldMatch = actionText.match(/^\*\*(.+?)\*\*/);
                          const title = boldMatch ? boldMatch[1] : actionText.split(':')[0].replace(/\*\*/g, '');
                          const detail = boldMatch ? actionText.replace(/^\*\*(.+?)\*\*[,:]?\s*/, '') : actionText.split(':').slice(1).join(':').trim();
                          return (
                            <div key={j} className="flex gap-4 p-4 bg-surface-low rounded-2xl">
                              <div className="w-7 h-7 rounded-full bg-gradient-cta text-on-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {j + 1}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-on-surface mb-0.5">{title}</p>
                                {detail && <p className="text-xs text-on-surface-muted leading-relaxed">{detail}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Render as paragraphs with bold support
                      <div className="text-on-surface-muted text-sm leading-[1.75] space-y-3">
                        {body.split('\n\n').filter(Boolean).map((para, j) => {
                          // Handle **bold** sub-headings (platform names)
                          if (para.startsWith('**') && isByPlatform) {
                            const boldEnd = para.indexOf('**', 2);
                            const label = para.slice(2, boldEnd);
                            const rest = para.slice(boldEnd + 2).replace(/^[—\s]+/, '');
                            return (
                              <div key={j} className="p-4 bg-surface-low rounded-xl">
                                <p className="text-sm font-semibold text-on-surface mb-1">{label}</p>
                                <p className="text-xs text-on-surface-muted leading-relaxed">{rest}</p>
                              </div>
                            );
                          }
                          return <p key={j}>{para.replace(/\*\*/g, '')}</p>;
                        })}
                      </div>
                    )}
                  </div>
                );
              }) : (
                // Fallback: no structured sections — render the whole text
                insights?.aiReadiness && (
                  <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
                    <h3 className="font-serif text-xl text-on-surface mb-4">AI Search Analysis</h3>
                    <div className="text-on-surface-muted text-sm leading-[1.75] space-y-3">
                      {insights.aiReadiness.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  </div>
                )
              )}

              {/* Static explainer box */}
              <div className="bg-surface-low rounded-[2rem] p-8 border border-surface-high">
                <h3 className="font-serif text-lg text-on-surface mb-4">How AI Search Ranking Works</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      step: '1', title: 'Crawling & Indexing',
                      body: 'AI systems crawl your site using bots like GPTBot (OpenAI) and ClaudeBot (Anthropic). Blocking them in robots.txt means they can\'t read your content.',
                    },
                    {
                      step: '2', title: 'Content Understanding',
                      body: 'AI reads your pages and identifies whether they answer questions clearly. Pages with headings, lists, FAQs, and direct answers score higher than walls of text.',
                    },
                    {
                      step: '3', title: 'Citation Selection',
                      body: 'When a user asks a question, the AI selects the most authoritative, structured, and relevant pages to cite. Schema markup, E-E-A-T signals, and content quality are the key factors.',
                    },
                  ].map((item) => (
                    <div key={item.step} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                        <span className="text-sm font-semibold text-on-surface">{item.title}</span>
                      </div>
                      <p className="text-xs text-on-surface-muted leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TICKETS TAB ── */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary-fixed/50 to-primary-fixed/20 rounded-2xl p-6 mb-2">
              <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">Sprint-Ready Tickets</p>
              <p className="text-on-surface text-sm leading-relaxed">
                {tickets.length} tickets — push directly to your backlog or copy manually.
              </p>
            </div>

            {/* ── Push to backlog panel ── */}
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-6">
              <h3 className="font-serif text-lg text-on-surface mb-1">Push to your backlog</h3>
              <p className="text-xs text-on-surface-light mb-5">Connect once — push all {tickets.length} tickets in one click with labels, priorities, and acceptance criteria.</p>

              {/* Push result banner */}
              {pushResult && (
                <div className={`mb-4 p-4 rounded-2xl ${pushResult.errors.length === 0 ? 'bg-tertiary-fixed/30' : 'bg-error-light'}`}>
                  {pushResult.created.length > 0 && (
                    <p className="text-sm font-semibold text-tertiary mb-2">
                      ✓ {pushResult.created.length} tickets created in {pushResult.provider === 'github' ? 'GitHub' : 'Jira'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {pushResult.created.slice(0, 8).map((t, i) => (
                      <a key={i} href={t.url || '#'} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-full bg-surface-white text-primary hover:underline font-mono">
                        {pushResult.provider === 'github' ? `#${(t as {number?: number}).number ?? i+1}` : t.key} ↗
                      </a>
                    ))}
                    {pushResult.created.length > 8 && <span className="text-[10px] text-on-surface-light">+{pushResult.created.length - 8} more</span>}
                  </div>
                  {pushResult.errors.length > 0 && (
                    <p className="text-xs text-error mt-2">{pushResult.errors.length} error(s): {pushResult.errors[0]}</p>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* GitHub */}
                <div className="border border-surface-high rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                      <span className="text-sm font-semibold text-on-surface">GitHub Issues</span>
                    </div>
                    {integrationStatus.github && (
                      <button onClick={() => disconnectProvider('github')} className="text-[10px] text-on-surface-light hover:text-error transition-colors">disconnect</button>
                    )}
                  </div>

                  {!integrationStatus.github ? (
                    <button onClick={connectGithub}
                      className="w-full py-2.5 px-4 bg-[#24292e] text-white text-sm rounded-xl hover:bg-[#1a1e22] transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                      Connect GitHub
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-tertiary font-medium">✓ Connected as @{integrationStatus.githubLogin}</p>
                      <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}
                        className="w-full text-sm bg-surface-low border border-surface-high rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-primary">
                        <option value="">Select repository…</option>
                        {ghRepos.map(r => (
                          <option key={r.id} value={r.full_name}>{r.full_name} {r.private ? '🔒' : ''}</option>
                        ))}
                      </select>
                      <button onClick={pushToGithub} disabled={!selectedRepo || pushing === 'github'}
                        className="w-full py-2.5 px-4 bg-gradient-cta text-on-primary text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                        {pushing === 'github' ? (
                          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Creating issues…</>
                        ) : `Push ${tickets.length} tickets to GitHub`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Jira */}
                <div className="border border-surface-high rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M11.571 11.429 6.286 6.143A8 8 0 0 0 6 8a6 6 0 0 0 6 6 8 8 0 0 0 1.857-.286l-2.286-2.285Z" fill="#2684FF"/><path d="M12 2a9.943 9.943 0 0 0-1.714.143L16.57 8.43A6 6 0 0 0 18 4a6 6 0 0 0-6-2Z" fill="#2684FF"/><path d="M12 22c.572 0 1.143-.048 1.714-.143L7.43 15.571A6 6 0 0 0 6 20a6 6 0 0 0 6 2Z" fill="#2684FF"/><path d="M12.429 12.571 17.714 17.857A8 8 0 0 0 18 16a6 6 0 0 0-6-6 8 8 0 0 0-1.857.286l2.286 2.285Z" fill="#2684FF"/></svg>
                      <span className="text-sm font-semibold text-on-surface">Jira</span>
                    </div>
                    {integrationStatus.jira && (
                      <button onClick={() => disconnectProvider('jira')} className="text-[10px] text-on-surface-light hover:text-error transition-colors">disconnect</button>
                    )}
                  </div>

                  {!integrationStatus.jira ? (
                    <button onClick={connectJira}
                      className="w-full py-2.5 px-4 bg-[#0052CC] text-white text-sm rounded-xl hover:bg-[#0043a8] transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M11.571 11.429 6.286 6.143A8 8 0 0 0 6 8a6 6 0 0 0 6 6 8 8 0 0 0 1.857-.286l-2.286-2.285Z"/><path d="M12 2a9.943 9.943 0 0 0-1.714.143L16.57 8.43A6 6 0 0 0 18 4a6 6 0 0 0-6-2Z"/><path d="M12 22c.572 0 1.143-.048 1.714-.143L7.43 15.571A6 6 0 0 0 6 20a6 6 0 0 0 6 2Z"/><path d="M12.429 12.571 17.714 17.857A8 8 0 0 0 18 16a6 6 0 0 0-6-6 8 8 0 0 0-1.857.286l2.286 2.285Z"/></svg>
                      Connect Jira
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-tertiary font-medium">✓ Connected — {integrationStatus.jiraEmail}</p>
                      {jiraResources.map(resource => (
                        <div key={resource.id}>
                          {resource.projects.length > 0 && (
                            <select
                              value={selectedCloud === resource.id ? selectedProject : ''}
                              onChange={e => { setSelectedCloud(resource.id); setSelectedProject(e.target.value); }}
                              className="w-full text-sm bg-surface-low border border-surface-high rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-primary">
                              <option value="">Select project in {resource.name}…</option>
                              {resource.projects.map(p => (
                                <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                      <button onClick={pushToJira} disabled={!selectedProject || pushing === 'jira'}
                        className="w-full py-2.5 px-4 bg-[#0052CC] text-white text-sm rounded-xl hover:bg-[#0043a8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {pushing === 'jira' ? (
                          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Creating issues…</>
                        ) : `Push ${tickets.length} tickets to Jira`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Group by priority */}
            {(['P0', 'P1', 'P2', 'P3'] as const).map((priority) => {
              const group = tickets.filter(t => t.priority === priority);
              if (!group.length) return null;
              return (
                <div key={priority}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted mb-3 mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[priority]}`}>{priority}</span>
                    {priority === 'P0' ? 'Critical — do this week' :
                     priority === 'P1' ? 'High — this sprint' :
                     priority === 'P2' ? 'Medium — next sprint' : 'Low — backlog'}
                  </h3>
                  <div className="space-y-3">
                    {group.map((ticket) => (
                      <div key={ticket.id} className="bg-surface-white rounded-2xl shadow-ambient overflow-hidden">
                        <button
                          className="w-full text-left p-5 hover:bg-surface-low/30 transition-colors"
                          onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs text-on-surface-light shrink-0">{ticket.id}</span>
                              <span className="text-sm font-medium text-on-surface truncate">{ticket.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-on-surface-muted">{ticket.storyPoints}pt</span>
                              <span className="text-xs text-on-surface-light bg-surface-low px-2 py-0.5 rounded-full">{ticket.category}</span>
                              <span className={`text-xs font-bold transition-transform ${expandedTicket === ticket.id ? 'rotate-90' : ''}`}>›</span>
                            </div>
                          </div>
                        </button>

                        {expandedTicket === ticket.id && (
                          <div className="px-5 pb-5 space-y-4 border-t border-on-surface-light/10">
                            <p className="text-sm text-on-surface-muted leading-relaxed pt-4">{ticket.description}</p>

                            {ticket.acceptanceCriteria?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-on-surface mb-2">Acceptance Criteria</p>
                                <ul className="space-y-1.5">
                                  {ticket.acceptanceCriteria.map((ac, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-on-surface-muted">
                                      <span className="text-tertiary mt-0.5">✓</span> {ac}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {ticket.testingInstructions && (
                              <div>
                                <p className="text-xs font-semibold text-on-surface mb-2">Testing</p>
                                <p className="text-xs text-on-surface-muted font-mono bg-surface-low rounded-xl p-3 whitespace-pre-wrap leading-relaxed">{ticket.testingInstructions}</p>
                              </div>
                            )}

                            {ticket.dependencies?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-on-surface mb-1">Dependencies</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ticket.dependencies.map((d, i) => (
                                    <span key={i} className="text-xs font-mono bg-surface-low text-on-surface-muted px-2 py-0.5 rounded-full">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {tickets.length === 0 && (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 text-on-surface-light mx-auto mb-4" />
                <p className="text-on-surface-muted">Dev tickets will appear here after the AI analysis completes.</p>
              </div>
            )}
          </div>
        )}

      </motion.div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-12">
        <a href={`/api/report/${String(audit.id)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-cta text-on-primary rounded-full font-semibold hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" />
          Download PDF Report
        </a>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-surface-high text-on-surface-muted rounded-full font-semibold hover:bg-surface-highest transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
