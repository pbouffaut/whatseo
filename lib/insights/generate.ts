import Anthropic from '@anthropic-ai/sdk';
import type { FullAuditResult, PremiumInsights, PageTypeGroup } from '../analyzer/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 5,        // Retry up to 5 times on 429/529
  timeout: 120_000,     // 2 minute timeout per call
});

export interface AuditInsights {
  executive: string;        // 3-4 paragraph CEO-friendly summary
  technical: string;        // Technical SEO explanation
  content: string;          // Content quality explanation
  onPage: string;           // On-page SEO explanation
  schema: string;           // Structured data explanation
  performance: string;      // Performance explanation
  aiReadiness: string;      // AI search readiness explanation
  images: string;           // Image optimization explanation
  topPriority: string;      // Single most impactful action to take
  googleData?: string;      // GSC/GA4 insights (if data available)
}

export async function generateAuditInsights(result: FullAuditResult): Promise<AuditInsights> {
  // Build a concise summary of the audit results for the prompt
  const summary = buildAuditSummary(result);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are a senior SEO consultant writing a report for a small-to-medium business owner who doesn't know SEO terminology. Your tone is warm, confident, and actionable — like a trusted advisor, not a robot.

Here are the SEO audit results for ${result.url}:

${summary}

Write the following sections. Each should be in plain language that a CEO, CMO, or marketing manager can understand and act on. Use specific numbers from the data. Don't use jargon without explaining it. Focus on BUSINESS IMPACT, not technical details.

Return your response as JSON with these exact keys:

{
  "executive": "3-4 paragraphs. Start with the overall health of the site. Highlight the biggest wins and the biggest problems. End with the expected impact if the top issues are fixed. Write as if you're briefing a CEO who has 2 minutes.",

  "technical": "2-3 paragraphs about the site's technical foundation. Explain crawlability, security, and redirects in plain language. What does it mean for their customers? What should they fix?",

  "content": "2-3 paragraphs about content quality. Are pages too thin? Is there duplicate content? What does E-E-A-T mean for them? What should they write or improve?",

  "onPage": "2-3 paragraphs about title tags, meta descriptions, headings. Explain why these matter for click-through rates from Google. Cite specific pages with issues.",

  "schema": "2 paragraphs about structured data. Explain what rich results are (star ratings, FAQs, breadcrumbs in Google) and whether the site is getting them. Keep it visual — describe what users see.",

  "performance": "2 paragraphs about page speed and Core Web Vitals. Explain what LCP, CLS mean in human terms (how fast the page loads, does it jump around). Reference the actual numbers.",

  "aiReadiness": "2 paragraphs about AI search. Explain that Google AI Overviews, ChatGPT, and Perplexity are changing how people find information. Is this site visible to AI? What can they do?",

  "images": "1-2 paragraphs about image optimization. Alt text, file formats, lazy loading — explain why they matter for both SEO and accessibility.",

  "topPriority": "One clear, specific action they should take FIRST. Not a list — just the single most impactful thing. Include the expected outcome."${result.googleData?.gsc || result.googleData?.ga4 ? `,

  "googleData": "2-3 paragraphs interpreting the real Google data. What are their top queries? Are they getting clicks? What's their organic traffic share? Where are the biggest opportunities?"` : ''}
}

Return ONLY the JSON object, no markdown code fences.`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // Try to parse JSON from the response
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const insights = JSON.parse(cleaned) as AuditInsights;
    return insights;
  } catch {
    // If JSON parsing fails, return a basic structure
    return {
      executive: text,
      technical: '',
      content: '',
      onPage: '',
      schema: '',
      performance: '',
      aiReadiness: '',
      images: '',
      topPriority: '',
    };
  }
}

function buildAuditSummary(result: FullAuditResult): string {
  const s = result.score;
  const lines: string[] = [];

  lines.push(`OVERALL SCORE: ${s.overall}/100`);
  lines.push(`Pages crawled: ${result.pagesCrawled}`);
  lines.push(`Duration: ${Math.round(result.duration / 1000)}s`);
  lines.push('');

  lines.push('CATEGORY SCORES:');
  for (const [key, val] of Object.entries(s.categories)) {
    const labels: Record<string, string> = {
      technical: 'Technical SEO', content: 'Content Quality', onPage: 'On-Page SEO',
      schema: 'Schema Markup', performance: 'Performance', aiReadiness: 'AI Search Ready', images: 'Images',
    };
    lines.push(`  ${labels[key] || key}: ${val.score}/100 (weight: ${val.weight}%)`);
  }
  lines.push('');

  lines.push('PATTERNS DETECTED:');
  if (result.thinContentPages.length > 0) lines.push(`  - ${result.thinContentPages.length} pages with thin content (<300 words)`);
  if (result.missingTitlePages.length > 0) lines.push(`  - ${result.missingTitlePages.length} pages missing title tags`);
  if (result.missingMetaDescPages.length > 0) lines.push(`  - ${result.missingMetaDescPages.length} pages missing meta descriptions`);
  if (result.missingSchemaPages.length > 0) lines.push(`  - ${result.missingSchemaPages.length} pages without schema markup`);
  if (result.duplicateTitles.length > 0) lines.push(`  - ${result.duplicateTitles.length} sets of duplicate title tags`);
  if (result.slowPages.length > 0) lines.push(`  - ${result.slowPages.length} slow pages (>2s response time)`);
  if (result.brokenLinks.length > 0) lines.push(`  - ${result.brokenLinks.length} broken links`);
  lines.push('');

  lines.push('RECOMMENDATIONS:');
  for (const rec of result.recommendations.slice(0, 10)) {
    lines.push(`  [${rec.impact} impact / ${rec.effort} effort] ${rec.title}`);
    lines.push(`    ${rec.description}`);
    lines.push(`    Affects ${rec.affectedUrls.length} URLs`);
  }
  lines.push('');

  // Top issues from checks
  const allChecks: { name: string; status: string; message: string }[] = [];
  for (const [, data] of Object.entries(result)) {
    if (data && typeof data === 'object' && 'checks' in (data as Record<string, unknown>)) {
      const checks = (data as { checks: { name: string; status: string; message: string }[] }).checks;
      for (const c of checks) {
        if (c.status === 'fail') allChecks.push(c);
      }
    }
  }
  if (allChecks.length > 0) {
    lines.push('FAILING CHECKS:');
    for (const c of allChecks.slice(0, 15)) {
      lines.push(`  FAIL: ${c.name} - ${c.message}`);
    }
    lines.push('');
  }

  // Google data if available
  if (result.googleData?.gsc) {
    const gsc = result.googleData.gsc;
    lines.push('GOOGLE SEARCH CONSOLE (90 days):');
    lines.push(`  Total clicks: ${gsc.totalClicks}`);
    lines.push(`  Total impressions: ${gsc.totalImpressions}`);
    lines.push(`  Average CTR: ${(gsc.avgCtr * 100).toFixed(1)}%`);
    lines.push(`  Average position: ${gsc.avgPosition.toFixed(1)}`);
    lines.push('  Top queries:');
    for (const q of gsc.topQueries.slice(0, 10)) {
      lines.push(`    "${q.query}" - ${q.clicks} clicks, pos ${q.position.toFixed(1)}`);
    }
    lines.push('');
  }

  if (result.googleData?.ga4) {
    const ga4 = result.googleData.ga4;
    lines.push('GOOGLE ANALYTICS (90 days):');
    lines.push(`  Organic sessions: ${ga4.organicSessions}`);
    lines.push(`  Total sessions: ${ga4.totalSessions}`);
    lines.push(`  Organic share: ${ga4.organicPercentage.toFixed(1)}%`);
    lines.push(`  Engagement rate: ${ga4.engagementRate.toFixed(1)}%`);
    lines.push('');
  }

  if (result.googleData?.crux) {
    const crux = result.googleData.crux;
    lines.push('CORE WEB VITALS (real users):');
    if (crux.lcp) lines.push(`  LCP: ${crux.lcp.p75}ms (${crux.lcp.good}% good) - target <2500ms`);
    if (crux.inp) lines.push(`  INP: ${crux.inp.p75}ms (${crux.inp.good}% good) - target <200ms`);
    if (crux.cls) lines.push(`  CLS: ${crux.cls.p75} (${crux.cls.good}% good) - target <0.1`);
    lines.push('');
  }

  if (result.googleData?.pageSpeed) {
    const psi = result.googleData.pageSpeed;
    lines.push('LIGHTHOUSE SCORES:');
    lines.push(`  Performance: ${psi.performanceScore}/100`);
    lines.push(`  SEO: ${psi.seoScore}/100`);
    lines.push(`  Accessibility: ${psi.accessibilityScore}/100`);
    lines.push('');
  }

  // Local SEO data
  if (result.localSeo) {
    const local = result.localSeo;
    lines.push('LOCAL SEO:');
    lines.push(`  Score: ${local.score}/100`);
    lines.push(`  NAP detected: ${local.napDetected ? 'Yes' : 'No'}`);
    lines.push(`  Location pages found: ${local.locationPageCount}`);
    lines.push(`  Local schema present: ${local.hasLocalSchema ? 'Yes' : 'No'}`);
    for (const c of local.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Sitemap audit data
  if (result.sitemapAudit) {
    const sm = result.sitemapAudit;
    lines.push('SITEMAP AUDIT:');
    lines.push(`  Score: ${sm.score}/100`);
    lines.push(`  Total URLs in sitemaps: ${sm.totalUrls}`);
    lines.push(`  Sub-sitemaps: ${sm.subsitemaps}`);
    lines.push(`  Has lastmod dates: ${sm.hasLastmod ? 'Yes' : 'No'}`);
    lines.push(`  Stale URLs (>1 year): ${sm.staleUrls}`);
    for (const c of sm.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Hreflang data
  if (result.hreflang) {
    const h = result.hreflang;
    lines.push('HREFLANG / INTERNATIONAL SEO:');
    lines.push(`  Score: ${h.score}/100`);
    lines.push(`  Tags found: ${h.tags.length}`);
    lines.push(`  Languages: ${h.languages.join(', ') || 'None'}`);
    lines.push(`  Has x-default: ${h.hasXDefault ? 'Yes' : 'No'}`);
    for (const c of h.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Backlinks data
  if (result.backlinks) {
    const b = result.backlinks;
    lines.push('BACKLINK PROFILE:');
    lines.push(`  Score: ${b.score}/100`);
    lines.push(`  Data source: ${b.source}`);
    if (b.referringDomains !== null) lines.push(`  Referring domains: ${b.referringDomains}`);
    if (b.domainAuthority !== null) lines.push(`  Domain authority: ${b.domainAuthority}`);
    if (b.backlinks !== null) lines.push(`  Total backlinks: ${b.backlinks}`);
    for (const c of b.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Programmatic SEO data
  if (result.programmatic) {
    const p = result.programmatic;
    lines.push('PROGRAMMATIC SEO:');
    lines.push(`  Score: ${p.score}/100`);
    lines.push(`  Index bloat risk: ${p.indexBloatRisk}`);
    lines.push(`  Total pages in sitemap: ${p.totalPagesInSitemap}`);
    lines.push(`  Template groups detected:`);
    for (const g of p.templateGroups.slice(0, 10)) {
      lines.push(`    ${g.pattern}: ${g.count} pages, avg ${g.avgWordCount} words`);
    }
    for (const c of p.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Competitor analysis data
  if (result.competitors && result.competitors.competitors.length > 0) {
    lines.push('COMPETITOR ANALYSIS:');
    lines.push(`  Score: ${result.competitors.score}/100`);
    for (const comp of result.competitors.competitors) {
      if (comp.error) {
        lines.push(`  ${comp.domain}: Failed to fetch — ${comp.error}`);
      } else {
        lines.push(`  ${comp.domain}:`);
        lines.push(`    Title: ${comp.title || 'MISSING'}`);
        lines.push(`    Word count: ${comp.wordCount}`);
        lines.push(`    Schema types: ${comp.schemaTypes.join(', ') || 'NONE'}`);
        lines.push(`    Local schema: ${comp.hasLocalSchema ? 'Yes' : 'No'}`);
        lines.push(`    FAQ schema: ${comp.hasFaqSchema ? 'Yes' : 'No'}`);
        lines.push(`    Review schema: ${comp.hasReviewSchema ? 'Yes' : 'No'}`);
        lines.push(`    Internal links: ${comp.internalLinks}`);
        lines.push(`    H2 headings: ${comp.h2Count}`);
        lines.push(`    Images: ${comp.imageCount} (${comp.imagesWithAlt} with alt)`);
        lines.push(`    Hreflang: ${comp.hasHreflang ? 'Yes' : 'No'}`);
        lines.push(`    llms.txt: ${comp.hasLlmsTxt ? 'Yes' : 'No'}`);
        lines.push(`    Response time: ${comp.responseTime}ms`);
      }
    }
    if (result.competitors.comparison.length > 0) {
      lines.push('  COMPARISON TABLE:');
      for (const row of result.competitors.comparison) {
        const compValues = row.competitors.map(c => `${c.domain}: ${c.value}`).join(', ');
        lines.push(`    ${row.metric}: You=${row.yours} | ${compValues}`);
      }
    }
    for (const c of result.competitors.checks.filter(c => c.status !== 'pass')) {
      lines.push(`  ${c.status.toUpperCase()}: ${c.name} — ${c.message}`);
    }
    lines.push('');
  }

  // Sample page data
  if (result.pages.length > 0) {
    const homepage = result.pages[0];
    lines.push('HOMEPAGE DETAILS:');
    lines.push(`  Title: ${homepage.onPage.title || 'MISSING'}`);
    lines.push(`  Meta description: ${homepage.onPage.metaDescription ? 'Present' : 'MISSING'}`);
    lines.push(`  H1 tags: ${homepage.onPage.h1s.length}`);
    lines.push(`  Word count: ${homepage.content.wordCount}`);
    lines.push(`  Schema types: ${homepage.schema.schemasFound.join(', ') || 'NONE'}`);
    lines.push(`  Internal links: ${homepage.onPage.internalLinks}`);
  }

  return lines.join('\n');
}

// ============================================================
// PREMIUM INSIGHTS — 3 parallel Claude calls for agency-quality report
// ============================================================

function buildPageTypesSummary(groups: PageTypeGroup[]): string {
  if (!groups || groups.length === 0) return 'PAGE TYPE GROUPS: None detected';
  const lines: string[] = ['PAGE TYPE GROUPS:'];
  for (const g of groups) {
    try {
      const schemaPct = g.count > 0 ? Math.round(g.schemaPresent / g.count * 100) : 0;
      lines.push(`  ${g.label} (${g.count} pages) — pattern: ${g.urlPattern}`);
      lines.push(`    Avg word count: ${g.avgWordCount}, Avg response time: ${g.avgResponseTime}ms`);
      lines.push(`    Schema present: ${g.schemaPresent}/${g.count} (${schemaPct}%)`);
      lines.push(`    Missing titles: ${g.missingTitles}, Missing descriptions: ${g.missingDescriptions}`);
      lines.push(`    Thin content (<300 words): ${g.thinContentCount}`);
      lines.push(`    Sample URLs: ${g.sampleUrls.join(', ')}`);
    } catch { /* skip broken group */ }
  }
  return lines.join('\n');
}

function buildExtendedGoogleSummary(result: FullAuditResult): string {
  const lines: string[] = [];
  if (result.googleData?.gsc) {
    const gsc = result.googleData.gsc;
    lines.push('GOOGLE SEARCH CONSOLE (90 days):');
    lines.push(`  Total clicks: ${gsc.totalClicks}`);
    lines.push(`  Total impressions: ${gsc.totalImpressions}`);
    lines.push(`  Average CTR: ${(gsc.avgCtr * 100).toFixed(1)}%`);
    lines.push(`  Average position: ${gsc.avgPosition.toFixed(1)}`);
    lines.push('  ALL TOP QUERIES:');
    for (const q of gsc.topQueries.slice(0, 30)) {
      lines.push(`    "${q.query}" — ${q.clicks} clicks, ${q.impressions} impressions, CTR ${(q.ctr * 100).toFixed(1)}%, pos ${q.position.toFixed(1)}`);
    }
    lines.push('  TOP PAGES BY CLICKS:');
    for (const p of gsc.topPages.slice(0, 20)) {
      lines.push(`    ${p.page} — ${p.clicks} clicks, CTR ${(p.ctr * 100).toFixed(1)}%, pos ${p.position.toFixed(1)}`);
    }
  }
  if (result.googleData?.ga4) {
    const ga4 = result.googleData.ga4;
    lines.push('GOOGLE ANALYTICS (90 days):');
    lines.push(`  Organic sessions: ${ga4.organicSessions}`);
    lines.push(`  Total sessions: ${ga4.totalSessions}`);
    lines.push(`  Organic share: ${ga4.organicPercentage.toFixed(1)}%`);
    lines.push(`  Engagement rate: ${ga4.engagementRate.toFixed(1)}%`);
    if (ga4.topLandingPages?.length > 0) {
      lines.push('  TOP ORGANIC LANDING PAGES:');
      for (const p of ga4.topLandingPages.slice(0, 15)) {
        lines.push(`    ${p.page} — ${p.sessions} sessions, ${p.users} users`);
      }
    }
  }
  if (result.googleData?.crux) {
    const crux = result.googleData.crux;
    lines.push('CORE WEB VITALS (real users):');
    if (crux.lcp) lines.push(`  LCP: ${crux.lcp.p75}ms (${crux.lcp.good}% good, ${crux.lcp.needsImprovement}% needs improvement, ${crux.lcp.poor}% poor)`);
    if (crux.inp) lines.push(`  INP: ${crux.inp.p75}ms (${crux.inp.good}% good)`);
    if (crux.cls) lines.push(`  CLS: ${crux.cls.p75} (${crux.cls.good}% good)`);
    if (crux.fcp) lines.push(`  FCP: ${crux.fcp.p75}ms (${crux.fcp.good}% good)`);
    if (crux.ttfb) lines.push(`  TTFB: ${crux.ttfb.p75}ms (${crux.ttfb.good}% good)`);
  }
  if (result.googleData?.pageSpeed) {
    const psi = result.googleData.pageSpeed;
    lines.push('LIGHTHOUSE SCORES (mobile):');
    lines.push(`  Performance: ${psi.performanceScore}/100, SEO: ${psi.seoScore}/100`);
    lines.push(`  Accessibility: ${psi.accessibilityScore}/100, Best Practices: ${psi.bestPracticesScore}/100`);
  }
  return lines.join('\n');
}

function parseJsonSafely<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract JSON from surrounding text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}

export async function generatePremiumInsights(result: FullAuditResult): Promise<PremiumInsights> {
  console.log(`[PremiumInsights] Starting. Pages: ${result.pagesCrawled}, Score: ${result.score.overall}`);

  let baseSummary: string, pageTypesSummary: string, googleDeep: string;
  try {
    baseSummary = buildAuditSummary(result);
    console.log(`[PremiumInsights] baseSummary: ${baseSummary.length} chars`);
  } catch (e) { console.error('[PremiumInsights] baseSummary failed:', e); baseSummary = `OVERALL SCORE: ${result.score.overall}/100\nPages: ${result.pagesCrawled}`; }
  try {
    pageTypesSummary = buildPageTypesSummary(result.pageTypeGroups || []);
    console.log(`[PremiumInsights] pageTypesSummary: ${pageTypesSummary.length} chars`);
  } catch (e) { console.error('[PremiumInsights] pageTypesSummary failed:', e); pageTypesSummary = 'PAGE TYPE GROUPS: Error building summary'; }
  try {
    googleDeep = buildExtendedGoogleSummary(result);
    console.log(`[PremiumInsights] googleDeep: ${googleDeep.length} chars`);
  } catch (e) { console.error('[PremiumInsights] googleDeep failed:', e); googleDeep = ''; }

  // Build failing checks list
  const failingChecks: string[] = [];
  for (const [, data] of Object.entries(result)) {
    if (data && typeof data === 'object' && 'checks' in (data as Record<string, unknown>)) {
      for (const c of (data as { checks: { name: string; status: string; message: string }[] }).checks) {
        if (c.status === 'fail') failingChecks.push(`${c.name}: ${c.message}`);
      }
    }
  }

  // Detected schema types from all pages
  const allSchemas = new Set<string>();
  for (const page of result.pages) {
    for (const s of page.schema.schemasFound) allSchemas.add(s);
  }

  // Detect likely competitors from URL/industry
  const domain = new URL(result.url).hostname.replace('www.', '');
  const competitorContext = `The site is ${domain}. Based on the site content and page types, identify their likely top 3 competitors in their industry. For each competitor, note what they do better in SEO (schema, content depth, local SEO, etc.). Use real competitor names.`;

  // --- CALL A: Strategy ---
  const makeCallA = () => anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    messages: [{
      role: 'user',
      content: `You are a senior SEO strategist at a top agency writing a comprehensive boardroom-ready report for ${result.url}. Your audience is a CEO, CMO, or VP of Marketing. Write with the depth and authority of a $15,000 agency report. Be specific, use numbers, and explain business impact.

${competitorContext}

AUDIT DATA:
${baseSummary}

${pageTypesSummary}

Return a JSON object with these keys:

{
  "executive": "Write 6-8 detailed paragraphs (at least 800 words total). Start with the overall score and what it means in their industry context. Compare to competitors. Detail the top 3 strengths with specific data. Detail the top 5 weaknesses with impact estimates. Include a section on competitive positioning — how they compare to key competitors in SEO. End with ROI projections: estimated additional clicks, conversion value, and annual revenue impact if recommendations are implemented. This should feel like a $15K consultant briefing.",

  "topPriority": "3-4 sentences. The single most impactful action with very specific instructions (which pages, what exactly to change, expected outcome in clicks/month, estimated revenue impact).",

  "criticalIssues": ["5 strings, each 2-3 sentences describing a critical issue with specific impact numbers and competitive context. E.g., '487 pages (100% of site) lack schema markup — competitors like WeWork and Regus have rich snippets showing star ratings, prices, and reviews in Google results, while this site shows plain blue links. Estimated impact: -15-25% click-through rate, costing approximately 3,000-5,000 clicks per month.'"],

  "quickWins": ["5 strings, each 2-3 sentences with specific effort estimate and expected ROI. E.g., 'Add Organization schema to homepage and all pages (4 hours of developer time) — immediately enables brand Knowledge Panel in Google, matching competitor visibility. Expected impact: +500-1,000 branded clicks/month.'"],

  "actionPlan": [
    {
      "phase": "critical",
      "title": "Critical Foundation (Week 1-2)",
      "timeline": "Week 1-2",
      "items": [{"title": "Fix X", "description": "Detailed 2-3 sentence description of what to do, why it matters, and what competitors are doing differently", "effort": "4-8 hours", "impact": "+5 score points, +2000 clicks/month, ~$X revenue", "category": "On-Page SEO"}],
      "projectedScore": 0
    },
    {"phase": "high", "title": "High Impact (Week 3-4)", "timeline": "Week 3-4", "items": [3-5 items], "projectedScore": 0},
    {"phase": "medium", "title": "Growth Phase (Month 2-3)", "timeline": "Month 2-3", "items": [3-5 items], "projectedScore": 0},
    {"phase": "backlog", "title": "Optimization Backlog", "timeline": "Quarter 2+", "items": [3-5 items], "projectedScore": 0}
  ]
}

Each action plan phase should have 3-5 items with detailed descriptions. The current score is ${result.score.overall}/100. Set realistic projected scores — each phase should add 5-10 points. Target score: 80-90 range.

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // --- CALL B: Analysis ---
  const makeCallB = () => anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a senior SEO analyst writing comprehensive deep-dive findings for ${result.url}. Write with the depth of a $15,000 agency report. Every section should have specific numbers, competitive context, and actionable recommendations. Be thorough — this is the analytical core of a premium report.

${competitorContext}

AUDIT DATA:
${baseSummary}

${pageTypesSummary}

${googleDeep}

Return a JSON object with these keys:

{
  "deepDive": "Write a thorough analysis — AT LEAST 4-5 paragraphs for EACH page type group (aim for 2000+ words total). For each group use a ### header like '### Location Pages (222 pages)'. Analyze: word count vs industry standards, schema adoption vs competitors, title/description patterns and missed CTR opportunity, content depth and E-E-A-T signals, internal linking structure, conversion optimization opportunities. Compare to what competitors typically do for similar page types. End each group with a specific recommendation and estimated impact.",

  "googleDataDeep": "Write 5-6 detailed paragraphs (800+ words). Split queries into branded vs non-branded with a table-like breakdown. For non-branded queries, identify the top 5 opportunities where position is 4-20 (striking distance). Estimate revenue: clicks × conversion rate (use industry-appropriate rate) × average deal value (estimate from business type). Identify which competitor pages are outranking this site for key terms. Highlight pages with high impressions but low CTR — these are title/description optimization goldmines.",

  "technical": "3-4 detailed paragraphs about technical SEO. Cover: crawlability (robots.txt, sitemaps, redirect chains), security headers (what's missing and why it matters), page speed impact on rankings, mobile-first indexing readiness. Mention what competitors typically have that this site doesn't. Include specific header recommendations.",

  "content": "3-4 detailed paragraphs. Analyze thin content problem with specific page counts and word count distributions. Discuss duplicate content patterns. Evaluate E-E-A-T: author attribution, publication dates, external references, about/contact pages. Compare content depth to industry competitors. Recommend content strategy.",

  "onPage": "3-4 detailed paragraphs. Analyze title tag patterns (length distribution, keyword usage, duplicates). Meta description coverage and quality. H1/H2 heading structure issues. Internal linking density. Estimate CTR impact of fixing title/description issues using CTR curve data (position 1 ~28% CTR, position 2 ~15%, etc.).",

  "schema": "3-4 detailed paragraphs. List every schema type that should be implemented for this business type. Explain what rich results each enables (star ratings, FAQs, breadcrumbs, local pack, knowledge panel). Compare to competitors — do they have schema? What rich results do they get? Estimate traffic impact of schema implementation.",

  "performance": "3-4 detailed paragraphs. Explain each Core Web Vital in human terms with the actual numbers. Compare to Google's thresholds. Discuss mobile vs desktop differences. Explain the ranking impact (Google uses CWV as a ranking signal). Recommend specific optimizations with expected improvement.",

  "aiReadiness": "3-4 detailed paragraphs. Discuss AI Overviews (Google), ChatGPT search, Perplexity, Bing Copilot. Is this site being cited? What makes content citable? Analyze llms.txt presence, FAQ content, structured data for AI. Discuss what competitors are doing for AI search. Recommend specific changes.",

  "images": "2-3 detailed paragraphs. Cover alt text coverage and quality, image formats (WebP/AVIF adoption), lazy loading strategy, responsive images. Discuss impact on accessibility, SEO, and Core Web Vitals (LCP). Estimate improvement from fixing hero image loading.",

  "googleData": "3-4 detailed paragraphs summarizing all Google data for executives. Key metrics, trends, competitive positioning, biggest opportunities. This is the executive-level data summary."
}

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // --- CALL C: Implementation ---
  const makeCallC = () => anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a senior frontend developer and SEO engineer writing premium implementation deliverables for ${result.url}. The audience is a development team that needs production-ready code, detailed tickets, and a comprehensive implementation guide. Write with the thoroughness of a senior consultant delivering a $15K engagement.

SITE DATA:
- URL: ${result.url}
- Domain: ${domain}
- Pages crawled: ${result.pagesCrawled}
- Currently detected schema types: ${Array.from(allSchemas).join(', ') || 'NONE'}
- Homepage title: ${result.pages[0]?.onPage.title || 'MISSING'}
- Homepage H1s: ${result.pages[0]?.onPage.h1s.join(', ') || 'NONE'}
- Homepage internal links: ${result.pages[0]?.onPage.internalLinks || 0}
- Homepage word count: ${result.pages[0]?.content.wordCount || 0}

FAILING CHECKS:
${failingChecks.slice(0, 25).join('\n')}

RECOMMENDATIONS:
${result.recommendations.map(r => `[${r.impact}/${r.effort}] ${r.title}: ${r.description} (${r.affectedUrls.length} URLs, first: ${r.affectedUrls[0] || 'n/a'})`).join('\n')}

${pageTypesSummary}

Return a JSON object with these keys:

{
  "schemaTemplates": [
    {
      "type": "Organization",
      "description": "2-3 sentences explaining when to use this, what rich results it enables, and which Google features it powers.",
      "jsonLd": "Complete, valid JSON-LD customized with the actual site name (${domain}), URL, and realistic data. Include all recommended properties. This should be copy-paste deployable.",
      "applicablePages": "All pages (add to layout component)"
    }
    ...generate 5-6 templates total, appropriate for this specific business type. Each JSON-LD must be complete, valid, and use the actual site's URL and brand name. Include template variables like {{LOCATION_NAME}} where page-specific data is needed. Templates should include: Organization, LocalBusiness/CoworkingSpace (if applicable), BreadcrumbList, FAQPage, Service, and one more appropriate for the business.
  ],

  "implementationGuide": "Write a comprehensive developer guide (1500+ words) structured as:\n\n### Phase 1: Critical Fixes (Week 1)\nFor each fix: what file to edit, what code to change, exact curl/grep command to verify. Include security header configurations (exact header values). Include Next.js/React specific patterns if detected.\n\n### Phase 2: Schema Implementation (Week 2-3)\nStep-by-step: create a JSON-LD component, add to layout, template for dynamic pages. Include a React/Next.js component example. Explain how to validate with Google Rich Results Test.\n\n### Phase 3: Content Optimization (Month 2)\nWhich pages to expand, target word counts, heading structure templates, internal linking strategy.\n\n### Phase 4: Performance & Monitoring (Month 3)\nImage optimization steps, lazy loading fixes, CWV monitoring setup. Include verification commands for every step.\n\n### Verification Checklist\nA final checklist of curl/grep commands to verify all changes are live.",

  "tickets": [
    {
      "id": "SEO-001",
      "title": "Clear, specific ticket title",
      "priority": "P0",
      "description": "3-4 sentences. What's wrong, why it matters, what the business impact is. Reference specific URLs and page counts.",
      "acceptanceCriteria": ["4-6 specific, testable criteria"],
      "storyPoints": 3,
      "testingInstructions": "2-3 specific test commands (curl, grep, Lighthouse, Google Rich Results Test). Include expected output.",
      "dependencies": [],
      "category": "On-Page SEO"
    }
    ...generate 16 total tickets covering ALL findings: schema implementation (3-4 tickets), on-page fixes (3-4 tickets), content improvements (2-3 tickets), technical/security (2-3 tickets), performance (1-2 tickets), AI readiness (1 ticket), monitoring setup (1 ticket). Priorities: P0 (4 tickets), P1 (5 tickets), P2 (5 tickets), P3 (2 tickets). Story points 1-8 scale. Every ticket should have realistic dependencies mapped.
  ]
}

CRITICAL: All JSON-LD must be syntactically valid JSON. Use the actual site URL (${result.url}) and brand name. Every ticket must have 4+ acceptance criteria and specific testing commands.

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // Run calls SEQUENTIALLY to avoid 529 rate limit saturation
  // Each call has maxRetries=5 with exponential backoff built into the SDK
  // Sequential is fine — customers perceive longer generation = deeper analysis
  console.log('[PremiumInsights] Running 3 Claude calls sequentially (maxRetries=5 each)...');

  console.log('[PremiumInsights] Starting Call A (Strategy + Action Plan)...');
  const responseA = await makeCallA().catch(err => { console.error('Premium Call A failed:', err?.message || err); return null; });
  console.log(`[PremiumInsights] Call A: ${responseA ? 'OK' : 'FAILED'}`);

  console.log('[PremiumInsights] Starting Call B (Analysis + Deep-Dive)...');
  const responseB = await makeCallB().catch(err => { console.error('Premium Call B failed:', err?.message || err); return null; });
  console.log(`[PremiumInsights] Call B: ${responseB ? 'OK' : 'FAILED'}`);

  console.log('[PremiumInsights] Starting Call C (Implementation + Tickets)...');
  const responseC = await makeCallC().catch(err => { console.error('Premium Call C failed:', err?.message || err); return null; });
  console.log(`[PremiumInsights] Call C: ${responseC ? 'OK' : 'FAILED'}`);

  // Parse responses
  const textA = responseA?.content[0]?.type === 'text' ? responseA.content[0].text : '';
  const textB = responseB?.content[0]?.type === 'text' ? responseB.content[0].text : '';
  const textC = responseC?.content[0]?.type === 'text' ? responseC.content[0].text : '';

  const dataA = parseJsonSafely<Record<string, unknown>>(textA) || {};
  const dataB = parseJsonSafely<Record<string, unknown>>(textB) || {};
  const dataC = parseJsonSafely<Record<string, unknown>>(textC) || {};

  return {
    // Call A — Strategy
    executive: (dataA.executive as string) || '',
    topPriority: (dataA.topPriority as string) || '',
    criticalIssues: (dataA.criticalIssues as string[]) || [],
    quickWins: (dataA.quickWins as string[]) || [],
    actionPlan: (dataA.actionPlan as PremiumInsights['actionPlan']) || [],

    // Call B — Analysis
    technical: (dataB.technical as string) || '',
    content: (dataB.content as string) || '',
    onPage: (dataB.onPage as string) || '',
    schema: (dataB.schema as string) || '',
    performance: (dataB.performance as string) || '',
    aiReadiness: (dataB.aiReadiness as string) || '',
    images: (dataB.images as string) || '',
    googleData: (dataB.googleData as string) || undefined,
    deepDive: (dataB.deepDive as string) || '',
    googleDataDeep: (dataB.googleDataDeep as string) || undefined,

    // Call C — Implementation
    schemaTemplates: (dataC.schemaTemplates as PremiumInsights['schemaTemplates']) || [],
    implementationGuide: (dataC.implementationGuide as string) || '',
    tickets: (dataC.tickets as PremiumInsights['tickets']) || [],
  };
}
