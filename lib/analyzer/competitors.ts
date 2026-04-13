import * as cheerio from 'cheerio';
import { Check } from './types';

export interface CompetitorSnapshot {
  url: string;
  domain: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  schemaTypes: string[];
  hasLocalSchema: boolean;
  hasFaqSchema: boolean;
  hasReviewSchema: boolean;
  internalLinks: number;
  externalLinks: number;
  ogImage: boolean;
  twitterCard: boolean;
  h2Count: number;
  imageCount: number;
  imagesWithAlt: number;
  hasHreflang: boolean;
  hasLlmsTxt: boolean;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrame: boolean;
    referrerPolicy: boolean;
  };
  responseTime: number;
  error?: string;
}

export interface CompetitorAnalysisResult {
  score: number;
  checks: Check[];
  competitors: CompetitorSnapshot[];
  comparison: {
    metric: string;
    yours: string;
    competitors: { domain: string; value: string }[];
  }[];
}

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

async function fetchCompetitorSnapshot(competitorUrl: string): Promise<CompetitorSnapshot> {
  let normalized = competitorUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

  const domain = new URL(normalized).hostname.replace('www.', '');
  const start = Date.now();

  try {
    const res = await fetch(normalized, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'WhatSEO/1.0 (https://whatseo.ai)' },
      redirect: 'follow',
    });
    const html = await res.text();
    const responseTime = Date.now() - start;
    const headers = Object.fromEntries([...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
    const $ = cheerio.load(html);

    // Extract schema types
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        const extractTypes = (obj: Record<string, unknown>): void => {
          if (obj['@type']) {
            const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
            schemaTypes.push(...types.map(String));
          }
          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            obj['@graph'].forEach((item: Record<string, unknown>) => extractTypes(item));
          }
        };
        extractTypes(json);
      } catch { /* ignore parse errors */ }
    });

    const localSchemaTypes = ['LocalBusiness', 'CoworkingSpace', 'Restaurant', 'Store', 'Place', 'Hotel', 'FoodEstablishment'];

    // Count links
    const hostname = new URL(normalized).hostname;
    let internalLinks = 0, externalLinks = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/') || href.includes(hostname)) internalLinks++;
      else if (href.startsWith('http')) externalLinks++;
    });

    // Count images
    const images = $('img');
    const imageCount = images.length;
    let imagesWithAlt = 0;
    images.each((_, el) => {
      if ($(el).attr('alt') !== undefined) imagesWithAlt++;
    });

    // Check llms.txt
    let hasLlmsTxt = false;
    try {
      const origin = new URL(normalized).origin;
      const llmsRes = await fetch(`${origin}/llms.txt`, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'WhatSEO/1.0' },
      });
      hasLlmsTxt = llmsRes.ok && (llmsRes.headers.get('content-type') || '').includes('text/plain');
    } catch { /* ignore */ }

    return {
      url: normalized,
      domain,
      title: $('title').first().text().trim() || null,
      metaDescription: $('meta[name="description"]').attr('content')?.trim() || null,
      h1: $('h1').first().text().trim() || null,
      wordCount: $('body').text().replace(/\s+/g, ' ').trim().split(/\s+/).length,
      schemaTypes: [...new Set(schemaTypes)],
      hasLocalSchema: schemaTypes.some(t => localSchemaTypes.includes(t)),
      hasFaqSchema: schemaTypes.includes('FAQPage'),
      hasReviewSchema: schemaTypes.some(t => ['Review', 'AggregateRating'].includes(t)),
      internalLinks,
      externalLinks,
      ogImage: !!$('meta[property="og:image"]').attr('content'),
      twitterCard: !!$('meta[name="twitter:card"]').attr('content'),
      h2Count: $('h2').length,
      imageCount,
      imagesWithAlt,
      hasHreflang: $('link[rel="alternate"][hreflang]').length > 0,
      hasLlmsTxt,
      securityHeaders: {
        hsts: !!headers['strict-transport-security'],
        csp: !!headers['content-security-policy'],
        xFrame: !!headers['x-frame-options'],
        referrerPolicy: !!headers['referrer-policy'],
      },
      responseTime,
    };
  } catch (err) {
    return {
      url: normalized, domain,
      title: null, metaDescription: null, h1: null, wordCount: 0,
      schemaTypes: [], hasLocalSchema: false, hasFaqSchema: false, hasReviewSchema: false,
      internalLinks: 0, externalLinks: 0, ogImage: false, twitterCard: false,
      h2Count: 0, imageCount: 0, imagesWithAlt: 0, hasHreflang: false, hasLlmsTxt: false,
      securityHeaders: { hsts: false, csp: false, xFrame: false, referrerPolicy: false },
      responseTime: 0,
      error: err instanceof Error ? err.message : 'Failed to fetch',
    };
  }
}

export async function analyzeCompetitors(
  yourSnapshot: {
    title: string | null;
    wordCount: number;
    schemaTypes: string[];
    internalLinks: number;
    h2Count: number;
    imageCount: number;
    hasHreflang: boolean;
    hasLlmsTxt: boolean;
  },
  competitorUrls: string[],
): Promise<CompetitorAnalysisResult> {
  const checks: Check[] = [];

  if (competitorUrls.length === 0) {
    checks.push(check('Competitor URLs configured', false, 'No competitor URLs provided — add competitors in Settings for comparative analysis'));
    return { score: 0, checks, competitors: [], comparison: [] };
  }

  // Fetch all competitors in parallel (max 5)
  const urls = competitorUrls.slice(0, 5);
  const competitors = await Promise.all(urls.map(u => fetchCompetitorSnapshot(u)));

  const successfulComps = competitors.filter(c => !c.error);
  checks.push(check('Competitors analyzed', successfulComps.length > 0,
    successfulComps.length > 0
      ? `${successfulComps.length}/${urls.length} competitor sites analyzed`
      : 'Failed to fetch any competitor sites'));

  if (successfulComps.length === 0) {
    const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
    return { score, checks, competitors, comparison: [] };
  }

  // Compare schema coverage
  const compsWithSchema = successfulComps.filter(c => c.schemaTypes.length > 0);
  const youHaveSchema = yourSnapshot.schemaTypes.length > 0;
  if (compsWithSchema.length > 0 && !youHaveSchema) {
    checks.push(check('Schema vs competitors', false,
      `${compsWithSchema.length}/${successfulComps.length} competitors have schema markup, you don't — they get rich results, you don't`));
  } else if (youHaveSchema) {
    checks.push(check('Schema vs competitors', true,
      `You have schema markup. ${compsWithSchema.length}/${successfulComps.length} competitors also have it.`));
  } else {
    checks.push(check('Schema vs competitors', false,
      'Neither you nor your competitors have schema — first to implement wins rich results', true));
  }

  // Compare local schema
  const compsWithLocal = successfulComps.filter(c => c.hasLocalSchema);
  if (compsWithLocal.length > 0) {
    checks.push(check('Local schema vs competitors', false,
      `${compsWithLocal.length} competitor(s) have LocalBusiness schema (${compsWithLocal.map(c => c.domain).join(', ')}) — they appear in local pack with enhanced listings`, true));
  }

  // Compare FAQ schema
  const compsWithFaq = successfulComps.filter(c => c.hasFaqSchema);
  if (compsWithFaq.length > 0) {
    checks.push(check('FAQ schema vs competitors', false,
      `${compsWithFaq.length} competitor(s) have FAQ schema — they get expandable Q&A in search results`, true));
  }

  // Compare content depth
  const avgCompWordCount = Math.round(successfulComps.reduce((s, c) => s + c.wordCount, 0) / successfulComps.length);
  const contentWin = yourSnapshot.wordCount >= avgCompWordCount;
  checks.push(check('Content depth vs competitors', contentWin,
    `Your homepage: ${yourSnapshot.wordCount} words. Competitor avg: ${avgCompWordCount} words.${contentWin ? '' : ' — competitors have deeper content'}`,
    !contentWin && yourSnapshot.wordCount > avgCompWordCount * 0.7));

  // Compare internal linking
  const avgCompLinks = Math.round(successfulComps.reduce((s, c) => s + c.internalLinks, 0) / successfulComps.length);
  const linkWin = yourSnapshot.internalLinks >= avgCompLinks;
  checks.push(check('Internal linking vs competitors', linkWin,
    `Your internal links: ${yourSnapshot.internalLinks}. Competitor avg: ${avgCompLinks}.`,
    !linkWin && yourSnapshot.internalLinks > avgCompLinks * 0.5));

  // Compare AI readiness
  const compsWithLlms = successfulComps.filter(c => c.hasLlmsTxt);
  if (compsWithLlms.length > 0 && !yourSnapshot.hasLlmsTxt) {
    checks.push(check('AI readiness vs competitors', false,
      `${compsWithLlms.length} competitor(s) have llms.txt — they're optimized for AI search, you're not`));
  }

  // Compare social signals
  const compsWithOg = successfulComps.filter(c => c.ogImage);
  const compsWithTwitter = successfulComps.filter(c => c.twitterCard);
  checks.push(check('Social sharing vs competitors', true,
    `OG images: ${compsWithOg.length}/${successfulComps.length} competitors. Twitter cards: ${compsWithTwitter.length}/${successfulComps.length} competitors.`, true));

  // Build comparison table
  const comparison = [
    {
      metric: 'Homepage Word Count',
      yours: String(yourSnapshot.wordCount),
      competitors: successfulComps.map(c => ({ domain: c.domain, value: String(c.wordCount) })),
    },
    {
      metric: 'Schema Types',
      yours: yourSnapshot.schemaTypes.join(', ') || 'None',
      competitors: successfulComps.map(c => ({ domain: c.domain, value: c.schemaTypes.join(', ') || 'None' })),
    },
    {
      metric: 'Internal Links',
      yours: String(yourSnapshot.internalLinks),
      competitors: successfulComps.map(c => ({ domain: c.domain, value: String(c.internalLinks) })),
    },
    {
      metric: 'H2 Headings',
      yours: String(yourSnapshot.h2Count),
      competitors: successfulComps.map(c => ({ domain: c.domain, value: String(c.h2Count) })),
    },
    {
      metric: 'Images',
      yours: String(yourSnapshot.imageCount),
      competitors: successfulComps.map(c => ({ domain: c.domain, value: String(c.imageCount) })),
    },
    {
      metric: 'Hreflang',
      yours: yourSnapshot.hasHreflang ? 'Yes' : 'No',
      competitors: successfulComps.map(c => ({ domain: c.domain, value: c.hasHreflang ? 'Yes' : 'No' })),
    },
    {
      metric: 'Response Time',
      yours: 'N/A',
      competitors: successfulComps.map(c => ({ domain: c.domain, value: `${c.responseTime}ms` })),
    },
  ];

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, competitors, comparison };
}
