import { AuditResult, PerformanceResult, AIReadinessResult } from './types';
import { fetchPage } from './fetch';
import { analyzeTechnical } from './technical';
import { analyzeOnPage } from './onpage';
import { analyzeSchema } from './schema';
import { analyzeImages } from './images';
import { analyzePerformance } from './performance';
import { analyzeContent } from './content';
import { analyzeAIReadiness } from './ai-readiness';
import { calculateScore } from './scorer';

export type { AuditResult } from './types';

// Wrap an async call with a timeout — returns fallback on timeout instead of throwing
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const PERF_FALLBACK: PerformanceResult = {
  score: 70,
  checks: [{ name: 'PageSpeed API', status: 'warn', message: 'PageSpeed check skipped (timeout)' }],
};

const AI_FALLBACK: AIReadinessResult = {
  score: 50,
  checks: [{ name: 'AI Readiness', status: 'warn', message: 'AI readiness check skipped (timeout)' }],
};

export async function analyzeUrl(url: string): Promise<AuditResult> {
  const start = Date.now();

  // Step 1: Fetch the page (15s timeout built into fetchPage)
  const fetchResult = await fetchPage(url);
  const { html, finalUrl, headers, redirectChain, responseTime } = fetchResult;

  // Step 2: Run analyzers in parallel
  // Sync analyzers run instantly, async ones get individual timeouts
  const [technical, onPage, schema, images, content, performance, aiReadiness] = await Promise.all([
    withTimeout(analyzeTechnical(html, finalUrl, headers, redirectChain, responseTime), 10000, {
      score: 50,
      checks: [{ name: 'Technical', status: 'warn' as const, message: 'Technical check timed out' }],
    }),
    Promise.resolve(analyzeOnPage(html, finalUrl)),
    Promise.resolve(analyzeSchema(html)),
    Promise.resolve(analyzeImages(html)),
    Promise.resolve(analyzeContent(html)),
    withTimeout(analyzePerformance(finalUrl), 20000, PERF_FALLBACK),
    withTimeout(analyzeAIReadiness(html, finalUrl), 10000, AI_FALLBACK),
  ]);

  // Step 3: Calculate score
  const score = calculateScore({ technical, content, onPage, schema, performance, aiReadiness, images });

  return {
    url,
    finalUrl,
    score,
    technical,
    onPage,
    schema,
    images,
    performance,
    content,
    aiReadiness,
    analyzedAt: new Date().toISOString(),
    duration: Date.now() - start,
  };
}
