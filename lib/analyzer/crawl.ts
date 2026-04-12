import * as cheerio from 'cheerio';
import { CrawledPage, CrawlResult } from './types';
import { fetchPageSafe } from './fetch';

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

function extractInternalLinks(html: string, pageUrl: string, originHostname: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const normalized = normalizeUrl(href, pageUrl);
    if (!normalized) return;
    try {
      const parsed = new URL(normalized);
      if (parsed.hostname === originHostname) {
        // Skip non-page resources
        if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|xml|txt)$/i.test(parsed.pathname)) return;
        links.push(normalized);
      }
    } catch { /* invalid URL */ }
  });

  return links;
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

export async function crawlSite(rootUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const { maxPages, priorityPages = [], concurrency = 5, onProgress } = options;
  const start = Date.now();

  let normalizedRoot = rootUrl.trim();
  if (!/^https?:\/\//i.test(normalizedRoot)) normalizedRoot = `https://${normalizedRoot}`;
  const origin = new URL(normalizedRoot).origin;
  const hostname = new URL(normalizedRoot).hostname;

  // Collect URLs from sitemap
  const sitemapUrls = await fetchSitemapUrls(origin);

  // Build URL queue: priority first, then homepage, then sitemap, then discovered
  const seen = new Set<string>();
  const queue: { url: string; depth: number; source: CrawledPage['source'] }[] = [];

  const enqueue = (url: string, depth: number, source: CrawledPage['source']) => {
    const normalized = normalizeUrl(url, origin);
    if (!normalized || seen.has(normalized)) return;
    try {
      if (new URL(normalized).hostname !== hostname) return;
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

  const pages: CrawledPage[] = [];
  const skippedUrls: string[] = [];
  let queueIndex = 0;

  while (queueIndex < queue.length && pages.length < maxPages) {
    // Determine batch size
    const remaining = maxPages - pages.length;
    const batchSize = Math.min(remaining, concurrency, queue.length - queueIndex);
    const batch = queue.slice(queueIndex, queueIndex + batchSize);
    queueIndex += batchSize;

    await pool(batch, concurrency, async (item) => {
      if (pages.length >= maxPages) return;

      const page = await fetchPageSafe(item.url, item.depth, item.source);

      if (page.error || page.statusCode >= 400) {
        skippedUrls.push(item.url);
        // Track broken links
        if (page.statusCode >= 400) {
          pages.push(page); // Keep for broken link reporting
        }
        return;
      }

      pages.push(page);

      // Discover internal links from this page
      if (page.html && item.depth < 2) {
        const internalLinks = extractInternalLinks(page.html, page.finalUrl, hostname);
        for (const link of internalLinks) {
          enqueue(link, item.depth + 1, 'internal_link');
        }
      }

      onProgress?.(pages.length, Math.min(maxPages, queue.length));
    });
  }

  return {
    pages: pages.filter((p) => p.statusCode < 400 && !p.error),
    sitemapUrls,
    skippedUrls,
    duration: Date.now() - start,
  };
}
