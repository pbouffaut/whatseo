import { AuditResult } from './types';
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

export async function analyzeUrl(url: string): Promise<AuditResult> {
  const start = Date.now();

  // Step 1: Fetch the page
  const fetchResult = await fetchPage(url);
  const { html, finalUrl, headers, redirectChain, responseTime } = fetchResult;

  // Step 2: Run analyzers in parallel
  const [technical, onPage, schema, images, content, performance, aiReadiness] = await Promise.all([
    analyzeTechnical(html, finalUrl, headers, redirectChain, responseTime),
    Promise.resolve(analyzeOnPage(html, finalUrl)),
    Promise.resolve(analyzeSchema(html)),
    Promise.resolve(analyzeImages(html)),
    Promise.resolve(analyzeContent(html)),
    analyzePerformance(finalUrl),
    analyzeAIReadiness(html, finalUrl),
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
