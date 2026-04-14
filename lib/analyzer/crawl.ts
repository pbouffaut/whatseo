import * as cheerio from 'cheerio';
import { CrawledPage, CrawlResult } from './types';
import { fetchPageSafe } from './fetch';

/** Extended CrawledPage with JS rendering detection */
interface CrawledPageExtended extends CrawledPage {
  jsRendered?: boolean;
}

/** Extended CrawlResult with orphan page tracking */
interface CrawlResultExtended extends CrawlResult {
  orphanPages?: string[];
  hitMaxPages?: boolean;  // true when the crawl was stopped by the maxPages cap
}

interface CrawlOptions {
  maxPages: number;
  priorityPages?: string[];
  concurrency?: number;
  onProgress?: (crawled: number, total: number) => void;
}

function normalizeUrl(url: string, base: string): string | null {
  try {
    const parsed = new URL(url, base);
    // Strip hash and trailing slash
    parsed.hash = '';
    let path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    // Try sitemap.xml
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'WhatSEO/1.0' },
    });
    if (!res.ok) return urls;
    const xml = await res.text();

    // Check if it's a sitemap index
    if (xml.includes('<sitemapindex')) {
      const $ = cheerio.load(xml, { xml: true });
      const sitemapLocs = $('sitemap > loc').map((_, el) => $(el).text().trim()).get();
      // Fetch up to 3 child sitemaps
      for (const loc of sitemapLocs.slice(0, 3)) {
        try {
          const childRes = await fetch(loc, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'WhatSEO/1.0' },
          });
          if (childRes.ok) {
            const childXml = await childRes.text();
            const $c = cheerio.load(childXml, { xml: true });
            $c('url > loc').each((_, el) => {
              const u = $c(el).text().trim();
              if (u) urls.push(u);
            });
          }
        } catch { /* skip child sitemap */ }
      }
    } else {
      // Regular sitemap
      const $ = cheerio.load(xml, { xml: true });
      $('url > loc').each((_, el) => {
        const u = $(el).text().trim();
        if (u) urls.push(u);
      });
    }
  } catch { /* no sitemap */ }

  return urls;
}

function extractInternalLinks(html: string, pageUrl: string, acceptedHostnames: Set<string>): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const normalized = normalizeUrl(href, pageUrl);
    if (!normalized) return;
    try {
      const parsed = new URL(normalized);
      if (acceptedHostnames.has(parsed.hostname)) {
        // Skip non-page resources
        if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|xml|txt)$/i.test(parsed.pathname)) return;
        links.push(normalized);
      }
    } catch { /* invalid URL */ }
  });

  return links;
}

/**
 * Detect if a page is likely JS-rendered by checking the ratio of
 * visible text content to total HTML size.
 * Returns true if text content is less than 10% of total HTML and
 * there are multiple script tags.
 */
function detectJsRendered(html: string): boolean {
  if (!html || html.length < 100) return false;

  const $ = cheerio.load(html);
  // Remove script and style tags to get actual text content
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const textLength = bodyText.length;
  const htmlLength = html.length;

  // Count script tags from original HTML
  const $orig = cheerio.load(html);
  const scriptCount = $orig('script').length;

  // If text content is less than 10% of HTML and there are script tags, likely JS-rendered
  const textRatio = textLength / htmlLength;
  return textRatio < 0.10 && scriptCount > 3;
}

/** Runs promises with concurrency limiting */
async function pool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
}

export async function crawlSite(rootUrl: string, options: CrawlOptions): Promise<CrawlResultExtended> {
  const { maxPages, priorityPages = [], concurrency = 5, onProgress } = options;
  const start = Date.now();

  let normalizedRoot = rootUrl.trim();
  if (!/^https?:\/\//i.test(normalizedRoot)) normalizedRoot = `https://${normalizedRoot}`;

  // Follow redirects to get the real origin (e.g., industriousoffice.com → www.industriousoffice.com)
  let realOrigin: string;
  let realHostname: string;
  try {
    const probe = await fetch(normalizedRoot, { redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    const finalUrl = probe.url;
    realOrigin = new URL(finalUrl).origin;
    realHostname = new URL(finalUrl).hostname;
  } catch {
    realOrigin = new URL(normalizedRoot).origin;
    realHostname = new URL(normalizedRoot).hostname;
  }

  // Accept both the original and final hostname (handles www vs non-www)
  const originalHostname = new URL(normalizedRoot).hostname;
  const acceptedHostnames = new Set([originalHostname, realHostname]);
  const origin = realOrigin;
  const hostname = realHostname;

  // Collect URLs from sitemap
  const sitemapUrls = await fetchSitemapUrls(origin);

  // Build URL queue: priority first, then homepage, then sitemap, then discovered
  const seen = new Set<string>();
  const queue: { url: string; depth: number; source: CrawledPage['source'] }[] = [];

  const enqueue = (url: string, depth: number, source: CrawledPage['source']) => {
    const normalized = normalizeUrl(url, origin);
    if (!normalized || seen.has(normalized)) return;
    try {
      if (!acceptedHostnames.has(new URL(normalized).hostname)) return;
    } catch { return; }
    seen.add(normalized);
    queue.push({ url: normalized, depth, source });
  };

  // Priority pages first
  for (const p of priorityPages) {
    const full = p.startsWith('http') ? p : `${origin}${p.startsWith('/') ? '' : '/'}${p}`;
    enqueue(full, 0, 'priority');
  }

  // Homepage
  enqueue(normalizedRoot, 0, 'homepage');

  // Sitemap URLs
  for (const u of sitemapUrls) {
    enqueue(u, 1, 'sitemap');
  }

  const pages: CrawledPageExtended[] = [];
  const skippedUrls: string[] = [];
  // Track which pages are linked from other crawled pages (for orphan detection)
  const linkedUrls = new Set<string>();
  // Track final URLs (after redirects) to avoid analyzing the same page twice
  const seenFinalUrls = new Set<string>();
  let queueIndex = 0;

  while (queueIndex < queue.length && pages.length < maxPages) {
    // Determine batch size
    const remaining = maxPages - pages.length;
    const batchSize = Math.min(remaining, concurrency, queue.length - queueIndex);
    const batch = queue.slice(queueIndex, queueIndex + batchSize);
    queueIndex += batchSize;

    await pool(batch, concurrency, async (item) => {
      if (pages.length >= maxPages) return;

      const page: CrawledPageExtended = await fetchPageSafe(item.url, item.depth, item.source);

      if (page.error || page.statusCode >= 400) {
        skippedUrls.push(item.url);
        // Track broken links
        if (page.statusCode >= 400) {
          pages.push(page); // Keep for broken link reporting
        }
        return;
      }

      // Dedup by final URL — prevents counting the same page twice when multiple
      // enqueued URLs (e.g. www vs non-www, or sitemap + internal link) redirect
      // to the same destination.
      const normalizedFinal = normalizeUrl(page.finalUrl, origin) || page.finalUrl;
      if (seenFinalUrls.has(normalizedFinal)) return;
      seenFinalUrls.add(normalizedFinal);

      // Detect JS rendering
      if (page.html) {
        page.jsRendered = detectJsRendered(page.html);
      }

      pages.push(page);

      // Discover internal links from this page
      if (page.html && item.depth < 2) {
        const internalLinks = extractInternalLinks(page.html, page.finalUrl, acceptedHostnames);
        for (const link of internalLinks) {
          // Track that this URL is linked from another page
          const normalizedLink = normalizeUrl(link, origin);
          if (normalizedLink) {
            linkedUrls.add(normalizedLink);
          }
          enqueue(link, item.depth + 1, 'internal_link');
        }
      }

      onProgress?.(pages.length, Math.min(maxPages, queue.length));
    });
  }

  // Detect orphan pages: pages from sitemap that were crawled but never linked from any other page
  const sitemapUrlsNormalized = new Set<string>();
  for (const u of sitemapUrls) {
    const normalized = normalizeUrl(u, origin);
    if (normalized) sitemapUrlsNormalized.add(normalized);
  }

  const orphanPages: string[] = [];
  for (const page of pages) {
    if (page.statusCode >= 400 || page.error) continue;
    const normalizedPageUrl = normalizeUrl(page.finalUrl, origin) || page.finalUrl;
    // A page is orphan if it was found in the sitemap but no other page links to it
    // Exclude the homepage — it's never orphan
    if (
      sitemapUrlsNormalized.has(normalizedPageUrl) &&
      !linkedUrls.has(normalizedPageUrl) &&
      page.source !== 'homepage'
    ) {
      orphanPages.push(page.finalUrl);
    }
  }

  const goodPages = pages.filter((p) => p.statusCode < 400 && !p.error);
  return {
    pages: goodPages,
    sitemapUrls,
    skippedUrls,
    orphanPages: orphanPages.length > 0 ? orphanPages : undefined,
    hitMaxPages: goodPages.length >= maxPages,
    duration: Date.now() - start,
  };
}
