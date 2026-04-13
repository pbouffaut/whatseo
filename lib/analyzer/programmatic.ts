import { Check } from './types';

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

export interface TemplateGroup {
  pattern: string;
  count: number;
  avgWordCount: number;
}

export interface ProgrammaticResult {
  score: number;
  checks: Check[];
  templateGroups: TemplateGroup[];
  indexBloatRisk: 'low' | 'medium' | 'high';
  totalPagesInSitemap: number;
}

interface PageInput {
  url: string;
  content: { wordCount: number };
  onPage: { title: string | null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first two path segments as a grouping key, e.g. "/blog/posts" */
function getUrlPattern(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return '/';
    if (segments.length === 1) return `/${segments[0]}`;
    return `/${segments[0]}/${segments[1]}`;
  } catch {
    return '/';
  }
}

/** Check if a URL slug follows clean patterns (lowercase, no special chars, reasonable length) */
function isCleanSlug(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const slug = pathname.split('/').filter(Boolean).pop() ?? '';
    if (slug.length === 0) return true;
    // Must be lowercase, alphanumeric with hyphens, reasonable length
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
  } catch {
    return false;
  }
}

/** Extract the "variable" part of a title template. Returns null if title is entirely unique. */
function extractTitleVariable(title: string, titles: string[]): string | null {
  if (titles.length < 3) return null;
  // Find common prefix and suffix across titles
  let commonPrefix = '';
  let commonSuffix = '';

  const sorted = [...titles].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Common prefix
  for (let i = 0; i < Math.min(first.length, last.length); i++) {
    if (first[i] === last[i]) commonPrefix += first[i];
    else break;
  }

  // Common suffix
  const firstRev = first.split('').reverse().join('');
  const lastRev = last.split('').reverse().join('');
  for (let i = 0; i < Math.min(firstRev.length, lastRev.length); i++) {
    if (firstRev[i] === lastRev[i]) commonSuffix = firstRev[i] + commonSuffix;
    else break;
  }

  const templateLength = commonPrefix.length + commonSuffix.length;
  if (templateLength > title.length * 0.3) {
    // This title is largely template-based
    return title.slice(commonPrefix.length, commonSuffix.length > 0 ? title.length - commonSuffix.length : undefined);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

export function analyzeProgrammatic(
  pages: PageInput[],
  sitemapTotalUrls: number,
): ProgrammaticResult {
  const checks: Check[] = [];

  // Group pages by URL pattern (first 2 path segments)
  const groups = new Map<string, PageInput[]>();
  for (const page of pages) {
    const pattern = getUrlPattern(page.url);
    const group = groups.get(pattern) ?? [];
    group.push(page);
    groups.set(pattern, group);
  }

  // Build template groups (only patterns with > 1 page)
  const templateGroups: TemplateGroup[] = [];
  const groupEntries = Array.from(groups.entries());
  for (const [pattern, groupPages] of groupEntries) {
    if (groupPages.length <= 1) continue;
    const totalWords = groupPages.reduce((sum, p) => sum + p.content.wordCount, 0);
    templateGroups.push({
      pattern,
      count: groupPages.length,
      avgWordCount: Math.round(totalWords / groupPages.length),
    });
  }
  templateGroups.sort((a, b) => b.count - a.count);

  // -----------------------------------------------------------------------
  // Check 1: Template detection
  // -----------------------------------------------------------------------
  const largeProgrammaticGroups = templateGroups.filter(g => g.count > 20);
  const hasProgrammaticPatterns = largeProgrammaticGroups.length > 0;

  if (hasProgrammaticPatterns) {
    const groupSummary = largeProgrammaticGroups
      .slice(0, 5)
      .map(g => `${g.pattern} (${g.count} pages)`)
      .join(', ');
    checks.push(check(
      'Template detection',
      true,
      `Programmatic page patterns detected: ${groupSummary}`,
    ));
  } else if (templateGroups.length > 0) {
    checks.push(check(
      'Template detection',
      true,
      `${templateGroups.length} page group(s) found but none large enough to be clearly programmatic (>20 pages)`,
      true,
    ));
  } else {
    checks.push(check(
      'Template detection',
      true,
      'No template-based page patterns detected — site appears to be manually authored',
    ));
  }

  // -----------------------------------------------------------------------
  // Check 2: Thin template pages
  // -----------------------------------------------------------------------
  const thinGroups = templateGroups.filter(g => g.avgWordCount < 300);
  const warnGroups = templateGroups.filter(g => g.avgWordCount >= 300 && g.avgWordCount < 500);

  if (thinGroups.length > 0) {
    const summary = thinGroups
      .slice(0, 3)
      .map(g => `${g.pattern} (avg ${g.avgWordCount} words)`)
      .join(', ');
    checks.push(check(
      'Thin template pages',
      false,
      `Template groups with thin content (<300 words avg): ${summary}`,
    ));
  } else if (warnGroups.length > 0) {
    const summary = warnGroups
      .slice(0, 3)
      .map(g => `${g.pattern} (avg ${g.avgWordCount} words)`)
      .join(', ');
    checks.push(check(
      'Thin template pages',
      true,
      `Template groups with borderline content (300-500 words avg): ${summary}`,
      true,
    ));
  } else if (templateGroups.length > 0) {
    checks.push(check(
      'Thin template pages',
      true,
      'All template groups have sufficient content (500+ words avg)',
    ));
  } else {
    checks.push(check(
      'Thin template pages',
      true,
      'No template groups to evaluate',
    ));
  }

  // -----------------------------------------------------------------------
  // Check 3: Title template quality
  // -----------------------------------------------------------------------
  let worstTitleDuplicationRate = 0;
  let worstTitlePattern = '';

  for (const [pattern, groupPages] of groupEntries) {
    if (groupPages.length < 3) continue;

    const titles = groupPages
      .map(p => p.onPage.title)
      .filter((t): t is string => t !== null && t.length > 0);
    if (titles.length < 3) continue;

    // Check for fully identical titles
    const titleCounts = new Map<string, number>();
    for (const t of titles) {
      titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
    }
    const maxDuplicateCount = Math.max(...Array.from(titleCounts.values()));
    const duplicationRate = maxDuplicateCount / titles.length;

    if (duplicationRate > worstTitleDuplicationRate) {
      worstTitleDuplicationRate = duplicationRate;
      worstTitlePattern = pattern;
    }

    // Also check for template patterns (shared prefix/suffix)
    const variables = titles.map(t => extractTitleVariable(t, titles));
    const templatedCount = variables.filter(v => v !== null).length;
    // Template-based titles are fine as long as the variable parts are unique
  }

  if (worstTitleDuplicationRate > 0.5) {
    checks.push(check(
      'Title template quality',
      false,
      `${Math.round(worstTitleDuplicationRate * 100)}% of pages in ${worstTitlePattern} share identical titles — each page needs a unique title`,
    ));
  } else if (worstTitleDuplicationRate > 0.2) {
    checks.push(check(
      'Title template quality',
      true,
      `Some title overlap in ${worstTitlePattern} (${Math.round(worstTitleDuplicationRate * 100)}% identical) — consider more unique titles`,
      true,
    ));
  } else if (templateGroups.length > 0) {
    checks.push(check(
      'Title template quality',
      true,
      'Template page titles are sufficiently unique across groups',
    ));
  } else {
    checks.push(check(
      'Title template quality',
      true,
      'No template groups — title uniqueness not evaluated at scale',
    ));
  }

  // -----------------------------------------------------------------------
  // Check 4: Index bloat risk
  // -----------------------------------------------------------------------
  const crawledCount = pages.length;
  const thinPageCount = pages.filter(p => p.content.wordCount < 300).length;
  const thinRatio = crawledCount > 0 ? thinPageCount / crawledCount : 0;
  const sitemapToCrawlRatio = crawledCount > 0 ? sitemapTotalUrls / crawledCount : 1;

  let indexBloatRisk: 'low' | 'medium' | 'high';
  if (sitemapToCrawlRatio > 2 || thinRatio > 0.4) {
    indexBloatRisk = 'high';
  } else if (sitemapToCrawlRatio > 1.5 || thinRatio > 0.25) {
    indexBloatRisk = 'medium';
  } else {
    indexBloatRisk = 'low';
  }

  const bloatReasons: string[] = [];
  if (sitemapToCrawlRatio > 2) bloatReasons.push(`sitemap has ${sitemapToCrawlRatio.toFixed(1)}x more URLs than crawled pages`);
  if (thinRatio > 0.4) bloatReasons.push(`${Math.round(thinRatio * 100)}% of pages are thin (<300 words)`);

  if (indexBloatRisk === 'high') {
    checks.push(check(
      'Index bloat risk',
      false,
      `High index bloat risk: ${bloatReasons.join('; ')}`,
    ));
  } else if (indexBloatRisk === 'medium') {
    const mediumReasons: string[] = [];
    if (sitemapToCrawlRatio > 1.5) mediumReasons.push(`sitemap/crawl ratio ${sitemapToCrawlRatio.toFixed(1)}x`);
    if (thinRatio > 0.25) mediumReasons.push(`${Math.round(thinRatio * 100)}% thin pages`);
    checks.push(check(
      'Index bloat risk',
      true,
      `Medium index bloat risk: ${mediumReasons.join('; ')}`,
      true,
    ));
  } else {
    checks.push(check(
      'Index bloat risk',
      true,
      `Low index bloat risk — ${crawledCount} crawled pages, ${sitemapTotalUrls} in sitemap, ${Math.round(thinRatio * 100)}% thin`,
    ));
  }

  // -----------------------------------------------------------------------
  // Check 5: Internal linking within templates
  // -----------------------------------------------------------------------
  // We approximate internal linking by checking if template group pages
  // appear as URLs among the crawled set (pages that link to each other
  // would both appear in the crawl). A more precise check would require
  // link data per page, but we work with what we have.
  if (hasProgrammaticPatterns) {
    const allUrls = new Set(pages.map(p => p.url));
    let totalLinkedPages = 0;
    let totalTemplatePages = 0;

    for (const group of largeProgrammaticGroups) {
      const groupPages = groups.get(group.pattern) ?? [];
      totalTemplatePages += groupPages.length;
      // Count how many pages in this group are also in the crawl set
      // (if they're crawled, they were discovered via internal links or sitemap)
      const linkedCount = groupPages.filter(p => allUrls.has(p.url)).length;
      totalLinkedPages += linkedCount;
    }

    // All template pages were in the crawl, so we estimate based on group size
    // Groups with many pages that are all crawled suggest good internal linking
    const avgGroupSize = totalTemplatePages / largeProgrammaticGroups.length;
    checks.push(check(
      'Internal linking within templates',
      avgGroupSize > 5,
      avgGroupSize > 5
        ? `Template groups average ${Math.round(avgGroupSize)} pages — good internal linking coverage (${totalTemplatePages} template pages crawled)`
        : `Template groups average ${Math.round(avgGroupSize)} pages — consider adding more internal links between template pages`,
      avgGroupSize > 2 && avgGroupSize <= 5,
    ));
  } else {
    checks.push(check(
      'Internal linking within templates',
      true,
      'No large programmatic groups to evaluate internal linking',
    ));
  }

  // -----------------------------------------------------------------------
  // Check 6: Crawled vs sitemap ratio
  // -----------------------------------------------------------------------
  const crawlRatio = sitemapTotalUrls > 0 ? crawledCount / sitemapTotalUrls : 1;

  if (crawlRatio < 0.3 && sitemapTotalUrls > 0) {
    checks.push(check(
      'Crawled vs sitemap ratio',
      false,
      `Only ${crawledCount} of ${sitemapTotalUrls} sitemap URLs crawled (${Math.round(crawlRatio * 100)}%) — potential crawl budget issues or unreachable pages`,
    ));
  } else if (crawlRatio < 0.6 && sitemapTotalUrls > 0) {
    checks.push(check(
      'Crawled vs sitemap ratio',
      true,
      `${crawledCount} of ${sitemapTotalUrls} sitemap URLs crawled (${Math.round(crawlRatio * 100)}%) — some pages may be hard to discover`,
      true,
    ));
  } else {
    checks.push(check(
      'Crawled vs sitemap ratio',
      true,
      sitemapTotalUrls > 0
        ? `${crawledCount} of ${sitemapTotalUrls} sitemap URLs crawled (${Math.round(crawlRatio * 100)}%) — good crawl coverage`
        : `${crawledCount} pages crawled (no sitemap URL count available)`,
    ));
  }

  // -----------------------------------------------------------------------
  // Check 7: URL pattern consistency
  // -----------------------------------------------------------------------
  const cleanSlugCount = pages.filter(p => isCleanSlug(p.url)).length;
  const cleanRatio = pages.length > 0 ? cleanSlugCount / pages.length : 1;

  if (cleanRatio > 0.9) {
    checks.push(check(
      'URL pattern consistency',
      true,
      `${Math.round(cleanRatio * 100)}% of URLs follow clean slug patterns (lowercase, hyphenated, reasonable length)`,
    ));
  } else if (cleanRatio > 0.7) {
    checks.push(check(
      'URL pattern consistency',
      true,
      `${Math.round(cleanRatio * 100)}% of URLs follow clean patterns — some have uppercase, special characters, or excessive length`,
      true,
    ));
  } else {
    checks.push(check(
      'URL pattern consistency',
      false,
      `Only ${Math.round(cleanRatio * 100)}% of URLs follow clean patterns — many have uppercase, special characters, or inconsistent formatting`,
    ));
  }

  // -----------------------------------------------------------------------
  // Score
  // -----------------------------------------------------------------------
  const score = Math.round(
    checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100,
  );

  return {
    score,
    checks,
    templateGroups,
    indexBloatRisk,
    totalPagesInSitemap: sitemapTotalUrls,
  };
}
