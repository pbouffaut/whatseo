import { AuditScore, TechnicalResult, ContentResult, OnPageResult, SchemaResult, PerformanceResult, AIReadinessResult, ImageResult } from './types';

const WEIGHTS = {
  technical: 0.22,
  content: 0.23,
  onPage: 0.20,
  schema: 0.10,
  performance: 0.10,
  aiReadiness: 0.10,
  images: 0.05,
} as const;

export function calculateScore(results: {
  technical: TechnicalResult;
  content: ContentResult;
  onPage: OnPageResult;
  schema: SchemaResult;
  performance: PerformanceResult;
  aiReadiness: AIReadinessResult;
  images: ImageResult;
}): AuditScore {
  const cats = {
    technical: results.technical.score,
    content: results.content.score,
    onPage: results.onPage.score,
    schema: results.schema.score,
    performance: results.performance.score,
    aiReadiness: results.aiReadiness.score,
    images: results.images.score,
  };

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
