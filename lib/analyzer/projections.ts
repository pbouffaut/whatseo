/**
 * Grounded score projections and click opportunity calculations.
 * These replace Claude's hallucinated "+X clicks/month" numbers with
 * real math derived from actual audit data.
 */

import type { FullAuditResult } from './types';

// Real CTR curve (Sistrix/Backlinko industry data)
const CTR_CURVE: Record<number, number> = {
  1: 0.284, 2: 0.152, 3: 0.105, 4: 0.079, 5: 0.061,
  6: 0.048, 7: 0.038, 8: 0.031, 9: 0.026, 10: 0.022,
};
function ctrAtPosition(pos: number): number {
  if (pos <= 1) return CTR_CURVE[1];
  if (pos >= 10) return pos <= 20 ? 0.01 : 0.005;
  const lo = Math.floor(pos);
  const hi = lo + 1;
  const frac = pos - lo;
  return (CTR_CURVE[lo] ?? 0.01) * (1 - frac) + (CTR_CURVE[hi] ?? 0.01) * frac;
}

// Category weights (must match scorer.ts)
const WEIGHTS: Record<string, number> = {
  technical: 0.22,
  content: 0.23,
  onPage: 0.20,
  schema: 0.10,
  performance: 0.10,
  aiReadiness: 0.10,
  images: 0.05,
};

// Map recommendation category strings → scorer category keys
const CAT_MAP: Record<string, string> = {
  'Technical': 'technical', 'Technical SEO': 'technical',
  'Content': 'content', 'Content Quality': 'content',
  'On-Page': 'onPage', 'On-Page SEO': 'onPage',
  'Schema': 'schema', 'Schema Markup': 'schema', 'Structured Data': 'schema',
  'Performance': 'performance',
  'AI Readiness': 'aiReadiness', 'AI Search': 'aiReadiness',
  'Images': 'images',
};

export interface ScoreRoadmap {
  currentScore: number;
  phases: {
    phase: 'critical' | 'high' | 'medium' | 'backlog';
    title: string;
    timeline: string;
    projectedScore: number;
    scoreDelta: number;
    recsFixed: number;
  }[];
}

/**
 * Calculate deterministic projected scores per action plan phase.
 * Uses the actual category weights and failing check distribution.
 */
export function projectScoreRoadmap(result: FullAuditResult): ScoreRoadmap {
  const current = result.score.overall;
  const cats = { ...result.score.categories } as Record<string, { score: number; weight: number }>;

  // Count failing checks per category
  const failsByCat: Record<string, { high: number; medium: number; low: number; total: number }> = {};
  for (const cat of Object.keys(WEIGHTS)) {
    failsByCat[cat] = { high: 0, medium: 0, low: 0, total: 0 };
  }

  for (const rec of result.recommendations) {
    const rawCat = String(rec.category || '');
    const cat = CAT_MAP[rawCat] || Object.keys(WEIGHTS).find(k => rawCat.toLowerCase().includes(k)) || null;
    if (!cat || !failsByCat[cat]) continue;
    const impact = String(rec.impact || 'medium').toLowerCase();
    if (impact === 'high') failsByCat[cat].high++;
    else if (impact === 'medium') failsByCat[cat].medium++;
    else failsByCat[cat].low++;
    failsByCat[cat].total++;
  }

  // Also count actual failing checks per category from the audit results
  const checkFailsByCat: Record<string, number> = {};
  for (const cat of Object.keys(WEIGHTS)) {
    const catResult = (result as unknown as Record<string, unknown>)[cat] as { checks?: { status: string }[] } | undefined;
    checkFailsByCat[cat] = catResult?.checks?.filter(c => c.status === 'fail').length ?? 0;
  }

  /**
   * Estimate category score after fixing a set of high/medium/low impact items.
   * Logic: each failing check in a category is assumed to reduce the score proportionally.
   * Fixing "high impact" items gives back most of the gap.
   */
  function estimateCatScoreAfterFix(
    cat: string,
    fixHigh: boolean,
    fixMedium: boolean,
    fixLow: boolean,
  ): number {
    const current_cat_score = cats[cat]?.score ?? 50;
    const fails = failsByCat[cat];
    const checkFails = checkFailsByCat[cat] ?? 0;
    const gapTo100 = 100 - current_cat_score;

    // How much of the gap is recoverable by fixing each tier?
    // High-impact recs = ~50% of category gap if present
    // Medium-impact recs = ~25% of gap
    // Low-impact = ~10%
    // Check-level fails (non-recommendation) = remaining gap × 0.3
    let recovered = 0;
    if (fixHigh && fails.high > 0) recovered += gapTo100 * 0.50;
    if (fixMedium && fails.medium > 0) recovered += gapTo100 * 0.25;
    if (fixLow && fails.low > 0) recovered += gapTo100 * 0.10;
    // Even without recs, fixing check-level fails contributes
    if ((fixHigh || fixMedium) && checkFails > 0) recovered += gapTo100 * 0.15;

    return Math.min(100, Math.round(current_cat_score + recovered));
  }

  function computeOverall(catScores: Record<string, number>): number {
    let total = 0;
    for (const [cat, weight] of Object.entries(WEIGHTS)) {
      total += (catScores[cat] ?? cats[cat]?.score ?? 50) * weight;
    }
    return Math.round(total);
  }

  // Phase 1 — Critical: fix all high-impact issues across all categories
  const afterPhase1: Record<string, number> = {};
  for (const cat of Object.keys(WEIGHTS)) {
    afterPhase1[cat] = estimateCatScoreAfterFix(cat, true, false, false);
  }
  const score1 = computeOverall(afterPhase1);

  // Phase 2 — High: additionally fix medium-impact issues
  const afterPhase2: Record<string, number> = {};
  for (const cat of Object.keys(WEIGHTS)) {
    afterPhase2[cat] = estimateCatScoreAfterFix(cat, true, true, false);
  }
  const score2 = computeOverall(afterPhase2);

  // Phase 3 — Medium: fix everything remaining
  const afterPhase3: Record<string, number> = {};
  for (const cat of Object.keys(WEIGHTS)) {
    afterPhase3[cat] = estimateCatScoreAfterFix(cat, true, true, true);
  }
  const score3 = computeOverall(afterPhase3);

  // Phase 4 — Backlog: marginal remaining gains (cap improvement at 3 pts)
  const score4 = Math.min(95, score3 + 3);

  // Count recs per phase tier
  const recsByCat = result.recommendations;
  const highRecs = recsByCat.filter(r => String(r.impact) === 'high').length;
  const medRecs = recsByCat.filter(r => String(r.impact) === 'medium').length;
  const lowRecs = recsByCat.filter(r => String(r.impact) === 'low').length;

  return {
    currentScore: current,
    phases: [
      { phase: 'critical', title: 'Critical Foundation', timeline: 'Week 1–2', projectedScore: score1, scoreDelta: score1 - current, recsFixed: highRecs },
      { phase: 'high', title: 'High Impact', timeline: 'Week 3–4', projectedScore: score2, scoreDelta: score2 - score1, recsFixed: medRecs },
      { phase: 'medium', title: 'Growth Phase', timeline: 'Month 2–3', projectedScore: score3, scoreDelta: score3 - score2, recsFixed: lowRecs },
      { phase: 'backlog', title: 'Optimization Backlog', timeline: 'Quarter 2+', projectedScore: score4, scoreDelta: score4 - score3, recsFixed: 0 },
    ],
  };
}

export interface ClickOpportunity {
  query: string;
  currentPosition: number;
  impressions: number;
  currentClicks: number;
  estimatedNewClicks: number;
  clickGain: number;
  targetPosition: number;
}

export interface ClickRoadmap {
  totalMonthlyGain: number;
  opportunities: ClickOpportunity[];
  hasGscData: boolean;
}

/**
 * Calculate realistic click gains from GSC striking-distance queries.
 * Queries in position 4–20 are within reach of a top-3 result.
 */
export function calculateClickOpportunities(
  gscData: { topQueries?: { query: string; clicks: number; impressions: number; position: number; ctr: number }[] } | undefined
): ClickRoadmap {
  if (!gscData?.topQueries?.length) {
    return { totalMonthlyGain: 0, opportunities: [], hasGscData: false };
  }

  const striking = gscData.topQueries
    .filter(q => q.position >= 4 && q.position <= 20 && q.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions);

  const opportunities: ClickOpportunity[] = striking.slice(0, 20).map(q => {
    const currentCTR = ctrAtPosition(q.position);
    // Realistic target: move up ~3 positions (conservative)
    const targetPosition = Math.max(1, q.position - 3);
    const targetCTR = ctrAtPosition(targetPosition);
    // Apply 40% confidence factor — not all queries will improve
    const clickGain = Math.round(q.impressions * (targetCTR - currentCTR) * 0.4);
    return {
      query: q.query,
      currentPosition: Math.round(q.position * 10) / 10,
      impressions: q.impressions,
      currentClicks: q.clicks,
      estimatedNewClicks: q.clicks + clickGain,
      clickGain: Math.max(0, clickGain),
      targetPosition,
    };
  }).filter(o => o.clickGain > 0);

  const totalMonthlyGain = opportunities.reduce((s, o) => s + o.clickGain, 0);

  return { totalMonthlyGain, opportunities, hasGscData: true };
}

export interface RevenueProjection {
  monthlyClickGain: number;
  conversionRate: number;      // e.g. 0.02 = 2%
  avgDealValue: number;        // in $
  monthlyRevenueGain: number;
  annualRevenueGain: number;
  hasBusinessData: boolean;
}

/**
 * Calculate revenue projection from click gains + business metrics.
 * Requires avgDealValue and conversionRate from onboarding.
 * Falls back to industry-average estimates if not provided.
 */
export function calculateRevenueProjection(
  clickGain: number,
  avgDealValue?: number | null,
  conversionRatePct?: number | null,
): RevenueProjection {
  const hasBusinessData = !!(avgDealValue && conversionRatePct);
  // Industry defaults if not set (B2B SaaS/service as a reasonable baseline)
  const rate = (conversionRatePct ?? 2) / 100;
  const deal = avgDealValue ?? 500;
  const monthlyRevenueGain = Math.round(clickGain * rate * deal);

  return {
    monthlyClickGain: clickGain,
    conversionRate: rate,
    avgDealValue: deal,
    monthlyRevenueGain,
    annualRevenueGain: monthlyRevenueGain * 12,
    hasBusinessData,
  };
}

/**
 * Format projections as a concise string to inject into Claude prompts.
 * This grounds Claude's impact estimates in real numbers.
 */
export function formatProjectionsForPrompt(
  roadmap: ScoreRoadmap,
  clicks: ClickRoadmap,
  revenue: RevenueProjection,
): string {
  const lines: string[] = [
    '=== CALCULATED PROJECTIONS (use these exact numbers, do not invent your own) ===',
    '',
    `SCORE ROADMAP (deterministic, based on actual failing checks × category weights):`,
    `  Current score: ${roadmap.currentScore}/100`,
    ...roadmap.phases.map(p =>
      `  After ${p.title} (${p.timeline}): ${p.projectedScore}/100 (+${p.scoreDelta} pts, fixes ${p.recsFixed} issues)`
    ),
    '',
  ];

  if (clicks.hasGscData && clicks.totalMonthlyGain > 0) {
    lines.push(`CLICK OPPORTUNITY (GSC striking-distance formula, 40% confidence):`,
      `  Estimated monthly click gain: +${clicks.totalMonthlyGain.toLocaleString()} clicks/month`,
      `  Top opportunities:`
    );
    for (const opp of clicks.opportunities.slice(0, 5)) {
      lines.push(`    "${opp.query}" — pos ${opp.currentPosition} → pos ${opp.targetPosition}, +${opp.clickGain} clicks/mo (${opp.impressions} impressions)`);
    }
    lines.push('');
  }

  lines.push(
    `REVENUE PROJECTION${revenue.hasBusinessData ? ' (using your actual business metrics)' : ' (using industry defaults — connect business metrics in settings for accuracy)'}:`,
    `  Monthly click gain: +${revenue.monthlyClickGain} clicks`,
    `  Conversion rate: ${(revenue.conversionRate * 100).toFixed(1)}%`,
    `  Avg deal/order value: $${revenue.avgDealValue}`,
    `  Estimated monthly revenue gain: +$${revenue.monthlyRevenueGain.toLocaleString()}`,
    `  Estimated annual revenue gain: +$${revenue.annualRevenueGain.toLocaleString()}`,
    '',
    'IMPORTANT: Use these calculated numbers in your action plan impact estimates and ROI projections. Do not invent different numbers.',
  );

  return lines.join('\n');
}
