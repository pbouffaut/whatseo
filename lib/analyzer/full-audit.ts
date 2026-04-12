import {
  FullAuditResult, PageAuditResult, Recommendation, CrawledPage,
  TechnicalResult, OnPageResult, SchemaResult, ImageResult, ContentResult,
  PerformanceResult, AIReadinessResult, AuditScore,
} from './types';
import { crawlSite } from './crawl';
import { analyzeTechnical } from './technical';
import { analyzeOnPage } from './onpage';
import { analyzeSchema } from './schema';
import { analyzeImages } from './images';
import { analyzeContent } from './content';
import { analyzePerformance } from './performance';
import { analyzeAIReadiness } from './ai-readiness';
import { calculateScore } from './scorer';

interface FullAuditOptions {
  url: string;
  maxPages?: number;
  priorityPages?: string[];
  competitorUrls?: string[];
  onPhaseChange?: (phase: string) => void;
  onProgress?: (crawled: number, total: number) => void;
}

function avgScore(results: { score: number }[]): number {
  if (results.length === 0) return 0;
  return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
}

function mergeChecks(results: { checks: { name: string; status: string; message: string }[] }[]): { name: string; status: 'pass' | 'fail' | 'warn'; message: string }[] {
  // Take the worst status for each check name across all pages
  const checkMap = new Map<string, { name: string; status: 'pass' | 'fail' | 'warn'; message: string; failCount: number }>();
  for (const r of results) {
    for (const c of r.checks) {
      const existing = checkMap.get(c.name);
      const status = c.status as 'pass' | 'fail' | 'warn';
      if (!existing) {
        checkMap.set(c.name, { name: c.name, status, message: c.message, failCount: status === 'fail' ? 1 : 0 });
      } else {
        if (status === 'fail') existing.failCount++;
        if (status === 'fail' && existing.status !== 'fail') {
          existing.status = 'fail';
          existing.message = c.message;
        }
      }
    }
  }
  return Array.from(checkMap.values()).map(({ name, status, message, failCount }) => ({
    name,
    status,
    message: failCount > 1 ? `${message} (${failCount} pages affected)` : message,
  }));
}

async function analyzePages(pages: CrawledPage[], onProgress?: (done: number, total: number) => void): Promise<PageAuditResult[]> {
  const results: PageAuditResult[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page.html || page.statusCode >= 400) continue;

    try {
      // Run sync DOM analyzers — no need for concurrency, cheerio is fast
      const [onPage, schema, images, content] = [
        analyzeOnPage(page.html, page.finalUrl),
        analyzeSchema(page.html),
        analyzeImages(page.html),
        analyzeContent(page.html),
      ];

      // Technical needs async (fetches robots.txt) — only do for homepage
      const technical = i === 0
        ? await analyzeTechnical(page.html, page.finalUrl, page.headers, page.redirectChain, page.responseTime)
        : { score: onPage.score, checks: [] }; // Skip per-page technical for speed

      results.push({
        url: page.finalUrl,
        statusCode: page.statusCode,
        responseTime: page.responseTime,
        technical,
        onPage,
        schema,
        images,
        content,
      });
    } catch { /* skip failed page analysis */ }

    onProgress?.(i + 1, pages.length);
  }

  return results;
}

function detectPatterns(pages: PageAuditResult[]): {
  thinContentPages: string[];
  missingTitlePages: string[];
  missingMetaDescPages: string[];
  duplicateTitles: { title: string; urls: string[] }[];
  duplicateDescriptions: { description: string; urls: string[] }[];
  missingSchemaPages: string[];
  slowPages: string[];
} {
  const thinContentPages: string[] = [];
  const missingTitlePages: string[] = [];
  const missingMetaDescPages: string[] = [];
  const missingSchemaPages: string[] = [];
  const slowPages: string[] = [];
  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();

  for (const page of pages) {
    if (page.content.wordCount < 300) thinContentPages.push(page.url);
    if (!page.onPage.title) missingTitlePages.push(page.url);
    if (!page.onPage.metaDescription) missingMetaDescPages.push(page.url);
    if (page.schema.jsonLdBlocks === 0) missingSchemaPages.push(page.url);
    if (page.responseTime > 2000) slowPages.push(page.url);

    if (page.onPage.title) {
      const urls = titleMap.get(page.onPage.title) || [];
      urls.push(page.url);
      titleMap.set(page.onPage.title, urls);
    }
    if (page.onPage.metaDescription) {
      const urls = descMap.get(page.onPage.metaDescription) || [];
      urls.push(page.url);
      descMap.set(page.onPage.metaDescription, urls);
    }
  }

  const duplicateTitles = Array.from(titleMap.entries())
    .filter(([, urls]) => urls.length > 1)
    .map(([title, urls]) => ({ title, urls }));

  const duplicateDescriptions = Array.from(descMap.entries())
    .filter(([, urls]) => urls.length > 1)
    .map(([description, urls]) => ({ description, urls }));

  return { thinContentPages, missingTitlePages, missingMetaDescPages, duplicateTitles, duplicateDescriptions, missingSchemaPages, slowPages };
}

function generateRecommendations(
  patterns: ReturnType<typeof detectPatterns>,
  pageCount: number
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (patterns.missingTitlePages.length > 0) {
    recs.push({
      title: `Add title tags to ${patterns.missingTitlePages.length} pages`,
      description: 'Title tags are a primary ranking signal. Pages without titles are invisible to search engines for targeted queries.',
      impact: 'high', effort: 'low', category: 'On-Page SEO',
      affectedUrls: patterns.missingTitlePages,
    });
  }

  if (patterns.missingMetaDescPages.length > 0) {
    recs.push({
      title: `Add meta descriptions to ${patterns.missingMetaDescPages.length} pages`,
      description: 'Meta descriptions control the snippet shown in search results. Missing descriptions let Google auto-generate snippets that may not be optimal.',
      impact: 'medium', effort: 'low', category: 'On-Page SEO',
      affectedUrls: patterns.missingMetaDescPages,
    });
  }

  if (patterns.duplicateTitles.length > 0) {
    const totalPages = patterns.duplicateTitles.reduce((s, d) => s + d.urls.length, 0);
    recs.push({
      title: `Fix ${totalPages} pages with duplicate title tags`,
      description: 'Duplicate titles confuse search engines about which page to rank for a query. Each page should have a unique, descriptive title.',
      impact: 'high', effort: 'medium', category: 'On-Page SEO',
      affectedUrls: patterns.duplicateTitles.flatMap((d) => d.urls),
    });
  }

  if (patterns.missingSchemaPages.length > 0) {
    const pct = Math.round((patterns.missingSchemaPages.length / pageCount) * 100);
    recs.push({
      title: `Add schema markup to ${patterns.missingSchemaPages.length} pages (${pct}% of site)`,
      description: 'JSON-LD structured data enables rich results in Google. Pages without schema miss opportunities for enhanced SERP snippets.',
      impact: 'high', effort: 'medium', category: 'Schema Markup',
      affectedUrls: patterns.missingSchemaPages,
    });
  }

  if (patterns.thinContentPages.length > 0) {
    recs.push({
      title: `Improve thin content on ${patterns.thinContentPages.length} pages`,
      description: 'Pages with fewer than 300 words may be flagged as thin content by Google. Add substantive, unique content or consider noindexing or consolidating.',
      impact: 'high', effort: 'high', category: 'Content Quality',
      affectedUrls: patterns.thinContentPages,
    });
  }

  if (patterns.slowPages.length > 0) {
    recs.push({
      title: `Optimize ${patterns.slowPages.length} slow pages (>2s response time)`,
      description: 'Slow server response times degrade user experience and can negatively impact Core Web Vitals. Investigate server-side rendering, caching, and database queries.',
      impact: 'medium', effort: 'medium', category: 'Performance',
      affectedUrls: patterns.slowPages,
    });
  }

  if (patterns.duplicateDescriptions.length > 0) {
    recs.push({
      title: `Fix duplicate meta descriptions across ${patterns.duplicateDescriptions.reduce((s, d) => s + d.urls.length, 0)} pages`,
      description: 'Duplicate descriptions reduce click-through rates. Each page should have a unique description that accurately represents its content.',
      impact: 'medium', effort: 'low', category: 'On-Page SEO',
      affectedUrls: patterns.duplicateDescriptions.flatMap((d) => d.urls),
    });
  }

  // Sort by impact (high first), then effort (low first)
  const impactOrder = { high: 0, medium: 1, low: 2 };
  const effortOrder = { low: 0, medium: 1, high: 2 };
  recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact] || effortOrder[a.effort] - effortOrder[b.effort]);

  return recs;
}

export async function analyzeFullSite(options: FullAuditOptions): Promise<FullAuditResult> {
  const {
    url, maxPages = 50, priorityPages = [],
    onPhaseChange, onProgress,
  } = options;
  const start = Date.now();

  // Phase 1: Crawl
  onPhaseChange?.('crawling');
  const crawlResult = await crawlSite(url, {
    maxPages,
    priorityPages,
    concurrency: 5,
    onProgress,
  });

  if (crawlResult.pages.length === 0) {
    throw new Error('Could not crawl any pages. The site may be blocking our crawler or the URL is invalid.');
  }

  // Phase 2: Analyze all pages
  onPhaseChange?.('analyzing');
  const pageResults = await analyzePages(crawlResult.pages, onProgress);

  // Phase 3: Performance + AI readiness on homepage
  onPhaseChange?.('google_data');
  const homepagePage = crawlResult.pages[0];
  const [performance, aiReadiness] = await Promise.all([
    analyzePerformance(homepagePage.finalUrl),
    analyzeAIReadiness(homepagePage.html, homepagePage.finalUrl),
  ]);

  // Phase 4: Aggregate and detect patterns
  onPhaseChange?.('generating_report');
  const patterns = detectPatterns(pageResults);
  const recommendations = generateRecommendations(patterns, pageResults.length);

  // Aggregate scores across all pages
  const aggTechnical: TechnicalResult = {
    score: pageResults[0]?.technical.score || 0,
    checks: pageResults[0]?.technical.checks || [],
  };
  const aggOnPage: OnPageResult = {
    score: avgScore(pageResults.map((p) => p.onPage)),
    checks: mergeChecks(pageResults.map((p) => p.onPage)),
    title: pageResults[0]?.onPage.title || null,
    metaDescription: pageResults[0]?.onPage.metaDescription || null,
    h1s: pageResults[0]?.onPage.h1s || [],
    h2s: pageResults[0]?.onPage.h2s || [],
    internalLinks: pageResults.reduce((s, p) => s + p.onPage.internalLinks, 0),
    externalLinks: pageResults.reduce((s, p) => s + p.onPage.externalLinks, 0),
  };
  const aggSchema: SchemaResult = {
    score: avgScore(pageResults.map((p) => p.schema)),
    checks: mergeChecks(pageResults.map((p) => p.schema)),
    schemasFound: [...new Set(pageResults.flatMap((p) => p.schema.schemasFound))],
    jsonLdBlocks: pageResults.reduce((s, p) => s + p.schema.jsonLdBlocks, 0),
  };
  const aggImages: ImageResult = {
    score: avgScore(pageResults.map((p) => p.images)),
    checks: mergeChecks(pageResults.map((p) => p.images)),
    totalImages: pageResults.reduce((s, p) => s + p.images.totalImages, 0),
    missingAlt: pageResults.reduce((s, p) => s + p.images.missingAlt, 0),
    lazyLoaded: pageResults.reduce((s, p) => s + p.images.lazyLoaded, 0),
    webpImages: pageResults.reduce((s, p) => s + p.images.webpImages, 0),
  };
  const aggContent: ContentResult = {
    score: avgScore(pageResults.map((p) => p.content)),
    checks: mergeChecks(pageResults.map((p) => p.content)),
    wordCount: pageResults.reduce((s, p) => s + p.content.wordCount, 0),
    readabilityLevel: pageResults[0]?.content.readabilityLevel || 'unknown',
  };

  const score: AuditScore = calculateScore({
    technical: aggTechnical,
    content: aggContent,
    onPage: aggOnPage,
    schema: aggSchema,
    performance,
    aiReadiness,
    images: aggImages,
  });

  return {
    url,
    finalUrl: homepagePage.finalUrl,
    auditType: 'full',
    score,
    pagesCrawled: pageResults.length,
    pagesTotal: crawlResult.pages.length,
    crawlDuration: crawlResult.duration,
    technical: aggTechnical,
    onPage: aggOnPage,
    schema: aggSchema,
    images: aggImages,
    content: aggContent,
    performance,
    aiReadiness,
    pages: pageResults,
    ...patterns,
    brokenLinks: crawlResult.pages
      .filter((p) => p.statusCode >= 400)
      .map((p) => ({ url: p.url, statusCode: p.statusCode, foundOn: '' })),
    recommendations,
    analyzedAt: new Date().toISOString(),
    duration: Date.now() - start,
  };
}
