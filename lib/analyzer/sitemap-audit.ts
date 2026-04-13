import { Check } from './types';

export interface SitemapAuditResult {
  score: number;
  checks: Check[];
  totalUrls: number;
  subsitemaps: number;
  hasLastmod: boolean;
  staleUrls: number;
}

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

/** Extract all matches of a tag's text content from XML using regex. */
function extractTagValues(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    values.push(match[1].trim());
  }
  return values;
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'WhatSEO/1.0' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function analyzeSitemap(sitemapUrl: string): Promise<SitemapAuditResult> {
  const checks: Check[] = [];
  let totalUrls = 0;
  let subsitemaps = 0;
  let staleUrls = 0;
  let lastmodCount = 0;
  let allUrlLocs: string[] = [];
  let allLastmods: string[] = [];
  let hasChangefreq = false;
  let hasPriority = false;
  let emptySitemapCount = 0;

  // --- 1. Fetch root sitemap ---
  const xml = await fetchXml(sitemapUrl);

  if (!xml) {
    checks.push(check('Sitemap accessible', false, `Could not fetch or parse sitemap at ${sitemapUrl}`));
    return {
      score: 0,
      checks,
      totalUrls: 0,
      subsitemaps: 0,
      hasLastmod: false,
      staleUrls: 0,
    };
  }

  checks.push(check('Sitemap accessible', true, `Sitemap fetched successfully from ${sitemapUrl}`));

  // --- 2. Detect sitemap index vs regular sitemap ---
  const isSitemapIndex =
    /<sitemapindex[\s>]/i.test(xml) && /<sitemap[\s>]/i.test(xml);

  if (isSitemapIndex) {
    // Extract sub-sitemap URLs
    const sitemapLocs = extractTagValues(xml, 'loc');
    // Filter to only those inside <sitemap> blocks (all <loc> in a sitemapindex are sub-sitemaps)
    subsitemaps = sitemapLocs.length;

    checks.push(
      check(
        'Sitemap index structure',
        true,
        `Sitemap index with ${subsitemaps} sub-sitemap(s) — good organization for large sites`,
      ),
    );

    // Sample first 3 sub-sitemaps
    const sampled = sitemapLocs.slice(0, 3);
    for (const subUrl of sampled) {
      const subXml = await fetchXml(subUrl);
      if (!subXml) continue;

      const locs = extractTagValues(subXml, 'loc');
      const lastmods = extractTagValues(subXml, 'lastmod');

      if (locs.length === 0) {
        emptySitemapCount++;
      }

      allUrlLocs.push(...locs);
      allLastmods.push(...lastmods);

      if (!hasChangefreq && /<changefreq[\s>]/i.test(subXml)) hasChangefreq = true;
      if (!hasPriority && /<priority[\s>]/i.test(subXml)) hasPriority = true;
    }
  } else {
    // Regular sitemap
    checks.push(
      check(
        'Sitemap index structure',
        false,
        'Single flat sitemap — consider using a sitemap index for better organization',
        true, // warn, not fail
      ),
    );

    const locs = extractTagValues(xml, 'loc');
    const lastmods = extractTagValues(xml, 'lastmod');

    allUrlLocs = locs;
    allLastmods = lastmods;

    if (/<changefreq[\s>]/i.test(xml)) hasChangefreq = true;
    if (/<priority[\s>]/i.test(xml)) hasPriority = true;
  }

  totalUrls = allUrlLocs.length;
  lastmodCount = allLastmods.length;

  // --- 3. Lastmod presence ---
  const lastmodPct = totalUrls > 0 ? lastmodCount / totalUrls : 0;
  const hasLastmod = lastmodPct > 0.5;

  if (lastmodPct >= 0.8) {
    checks.push(
      check('Lastmod present', true, `${Math.round(lastmodPct * 100)}% of URLs have <lastmod> dates`),
    );
  } else if (lastmodPct >= 0.5) {
    checks.push(
      check(
        'Lastmod present',
        false,
        `Only ${Math.round(lastmodPct * 100)}% of URLs have <lastmod> — aim for >80%`,
        true,
      ),
    );
  } else {
    checks.push(
      check(
        'Lastmod present',
        false,
        totalUrls > 0
          ? `Only ${Math.round(lastmodPct * 100)}% of URLs have <lastmod> — search engines rely on this for crawl prioritization`
          : 'No URLs found to check for <lastmod>',
      ),
    );
  }

  // --- 4. Stale content (lastmod > 1 year ago) ---
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const dateStr of allLastmods) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d < oneYearAgo) {
      staleUrls++;
    }
  }

  const stalePct = lastmodCount > 0 ? staleUrls / lastmodCount : 0;
  if (stalePct < 0.2) {
    checks.push(
      check(
        'Fresh content',
        true,
        lastmodCount > 0
          ? `${Math.round(stalePct * 100)}% of dated URLs are older than 1 year — content appears fresh`
          : 'No lastmod dates to evaluate freshness',
      ),
    );
  } else {
    checks.push(
      check(
        'Fresh content',
        false,
        `${Math.round(stalePct * 100)}% of dated URLs have lastmod older than 1 year — consider updating or removing stale content`,
        true,
      ),
    );
  }

  // --- 5. URL count per file ---
  if (totalUrls === 0) {
    checks.push(check('URL count reasonable', false, 'Sitemap contains 0 URLs'));
  } else if (totalUrls > 50000) {
    checks.push(
      check(
        'URL count reasonable',
        false,
        `Sitemap contains ${totalUrls.toLocaleString()} URLs — exceeds the 50,000 per-file limit`,
      ),
    );
  } else {
    checks.push(
      check(
        'URL count reasonable',
        true,
        `${totalUrls.toLocaleString()} URL(s) found${isSitemapIndex ? ' (sampled from first 3 sub-sitemaps)' : ''}`,
      ),
    );
  }

  // --- 6. HTTPS URLs ---
  const nonHttps = allUrlLocs.filter((u) => !u.startsWith('https://'));
  if (nonHttps.length === 0) {
    checks.push(
      check('HTTPS URLs', true, totalUrls > 0 ? 'All sitemap URLs use HTTPS' : 'No URLs to check'),
    );
  } else {
    checks.push(
      check(
        'HTTPS URLs',
        false,
        `${nonHttps.length} URL(s) do not use HTTPS — search engines prefer HTTPS`,
      ),
    );
  }

  // --- 7. No empty sitemaps (only relevant for sitemap index) ---
  if (isSitemapIndex) {
    if (emptySitemapCount === 0) {
      checks.push(check('No empty sitemaps', true, 'All sampled sub-sitemaps contain at least 1 URL'));
    } else {
      checks.push(
        check(
          'No empty sitemaps',
          false,
          `${emptySitemapCount} sub-sitemap(s) are empty — remove or populate them`,
        ),
      );
    }
  }

  // --- Score ---
  const score =
    checks.length > 0
      ? Math.round(
          (checks.reduce(
            (s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0),
            0,
          ) /
            checks.length) *
            100,
        )
      : 0;

  return {
    score,
    checks,
    totalUrls,
    subsitemaps,
    hasLastmod,
    staleUrls,
  };
}
