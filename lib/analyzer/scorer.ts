import { AuditScore, TechnicalResult, ContentResult, OnPageResult, SchemaResult, PerformanceResult, AIReadinessResult, ImageResult, PageAuditResult } from './types';

const WEIGHTS = {
  technical: 0.22,
  content: 0.23,
  onPage: 0.20,
  schema: 0.10,
  performance: 0.10,
  aiReadiness: 0.10,
  images: 0.05,
} as const;

interface ScoreContext {
  pages?: PageAuditResult[];
  thinContentCount?: number;
  missingSchemaCount?: number;
  totalPages?: number;
}

export function calculateScore(results: {
  technical: TechnicalResult;
  content: ContentResult;
  onPage: OnPageResult;
  schema: SchemaResult;
  performance: PerformanceResult;
  aiReadiness: AIReadinessResult;
  images: ImageResult;
}, context?: ScoreContext): AuditScore {
  const cats = {
    technical: results.technical.score,
    content: results.content.score,
    onPage: results.onPage.score,
    schema: results.schema.score,
    performance: results.performance.score,
    aiReadiness: results.aiReadiness.score,
    images: results.images.score,
  };

  // --- Stricter scoring penalties ---
  if (context && context.totalPages && context.totalPages > 1) {
    const total = context.totalPages;

    // Thin content penalty: if >30% of pages are thin, reduce content score
    if (context.thinContentCount && context.thinContentCount / total > 0.3) {
      const thinPct = context.thinContentCount / total;
      // Penalty scales: 30% thin = -10pts, 50% thin = -20pts, 80%+ thin = -30pts
      const penalty = Math.min(30, Math.round(thinPct * 40));
      cats.content = Math.max(10, cats.content - penalty);
    }

    // Schema penalty: if >50% of pages lack schema, cap schema score
    if (context.missingSchemaCount && context.missingSchemaCount / total > 0.5) {
      const missingPct = context.missingSchemaCount / total;
      // 100% missing = cap at 15, 50% missing = cap at 40
      const cap = Math.round(40 - (missingPct - 0.5) * 50);
      cats.schema = Math.min(cats.schema, Math.max(10, cap));
    }

    // On-Page penalty: check for critical on-page issues across pages
    if (context.pages) {
      // Count pages with missing H1 or duplicate titles
      const missingH1 = context.pages.filter(p => p.onPage.h1s.length === 0).length;
      const missingTitle = context.pages.filter(p => !p.onPage.title).length;
      const criticalOnPage = (missingH1 + missingTitle) / total;
      if (criticalOnPage > 0.02) { // More than 2% of pages
        const penalty = Math.min(20, Math.round(criticalOnPage * 60));
        cats.onPage = Math.max(20, cats.onPage - penalty);
      }
    }

    // Technical penalty: critical failures
    const criticalFails = results.technical.checks.filter(c =>
      c.status === 'fail' && ['robots.txt', 'HTTPS', 'Sitemap'].some(n => c.name.includes(n))
    );
    if (criticalFails.length > 0) {
      cats.technical = Math.round(cats.technical * 0.7);
    }
  }

  let overall = 0;
  const categories = {} as AuditScore['categories'];

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const k = key as keyof typeof WEIGHTS;
    const score = cats[k];
    const weighted = Math.round(score * weight * 10) / 10;
    overall += weighted;
    categories[k] = { score, weight: Math.round(weight * 100), weighted };
  }

  return { overall: Math.round(overall), categories };
}
