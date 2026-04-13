import Anthropic from '@anthropic-ai/sdk';
import type { FullAuditResult, PremiumInsights, PageTypeGroup } from '../analyzer/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const lines: string[] = ['PAGE TYPE GROUPS:'];
  for (const g of groups) {
    lines.push(`  ${g.label} (${g.count} pages) — pattern: ${g.urlPattern}`);
    lines.push(`    Avg word count: ${g.avgWordCount}, Avg response time: ${g.avgResponseTime}ms`);
    lines.push(`    Schema present: ${g.schemaPresent}/${g.count} (${Math.round(g.schemaPresent / g.count * 100)}%)`);
    lines.push(`    Missing titles: ${g.missingTitles}, Missing descriptions: ${g.missingDescriptions}`);
    lines.push(`    Thin content (<300 words): ${g.thinContentCount}`);
    lines.push(`    Sample URLs: ${g.sampleUrls.join(', ')}`);
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
  const baseSummary = buildAuditSummary(result);
  const pageTypesSummary = buildPageTypesSummary(result.pageTypeGroups || []);
  const googleDeep = buildExtendedGoogleSummary(result);

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

  // --- CALL A: Strategy ---
  const callA = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are a senior SEO strategist writing a boardroom-ready report for ${result.url}. Your audience is a CEO, CMO, or VP of Marketing who doesn't know SEO jargon but needs to understand what to invest in and why.

AUDIT DATA:
${baseSummary}

${pageTypesSummary}

Return a JSON object with these keys:

{
  "executive": "4-5 paragraphs. Start with the score and what it means. Highlight top 3 wins and top 3 problems with specific numbers. End with projected ROI if top issues are fixed. Write as if briefing a CEO in 2 minutes.",

  "topPriority": "The single most impactful action to take. Be very specific — which pages, what to change, expected outcome in clicks/traffic. Not a list, just one thing.",

  "criticalIssues": ["5 strings, each describing a critical issue with impact. E.g., '487 pages lack schema markup — missing rich snippets in Google, estimated -15% click-through rate'"],

  "quickWins": ["5 strings, each describing an easy fix with impact. E.g., 'Add meta descriptions to 32 pages — 2 hours of work, +5% CTR on those pages'"],

  "actionPlan": [
    {
      "phase": "critical",
      "title": "Critical Foundation (Week 1-2)",
      "timeline": "Week 1-2",
      "items": [{"title": "Fix X", "description": "Do Y because Z", "effort": "4-8 hours", "impact": "+5 score points, +2000 clicks/month", "category": "On-Page SEO"}],
      "projectedScore": 78
    },
    {"phase": "high", "title": "High Impact (Week 3-4)", "timeline": "Week 3-4", "items": [...], "projectedScore": 83},
    {"phase": "medium", "title": "Growth Phase (Month 2-3)", "timeline": "Month 2-3", "items": [...], "projectedScore": 88},
    {"phase": "backlog", "title": "Optimization Backlog", "timeline": "Ongoing", "items": [...], "projectedScore": 92}
  ]
}

The current score is ${result.score.overall}/100. Make projected scores realistic — each phase should add 4-8 points. The total projected improvement should be reasonable (reaching 85-95 range).

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // --- CALL B: Analysis ---
  const callB = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 10000,
    messages: [{
      role: 'user',
      content: `You are an SEO analyst writing deep-dive findings for ${result.url}. Use specific data from the audit. Your audience is a marketing manager who needs to understand what's happening on their site.

AUDIT DATA:
${baseSummary}

${pageTypesSummary}

${googleDeep}

Return a JSON object with these keys:

{
  "deepDive": "Write 2-3 paragraphs for EACH page type group. For each group, analyze: word count adequacy, schema adoption, title/description quality, content depth. Identify the biggest opportunity in each group. Use section headers like '### Location Pages (222 pages)' for each group.",

  "googleDataDeep": "3-4 paragraphs analyzing the Google data. Split queries into branded vs non-branded. Identify the top non-branded opportunities. Estimate revenue impact using: clicks × estimated conversion rate (2-5%) × average deal value. Identify pages ranking position 4-10 that could move to top 3.",

  "technical": "2-3 paragraphs about technical foundation in plain language. What does it mean for customers?",
  "content": "2-3 paragraphs about content quality. Thin pages, duplicate content, E-E-A-T signals.",
  "onPage": "2-3 paragraphs about titles, descriptions, headings. Click-through rate impact.",
  "schema": "2 paragraphs about structured data. What rich results are they missing?",
  "performance": "2 paragraphs about speed. LCP, CLS in human terms with actual numbers.",
  "aiReadiness": "2 paragraphs about AI search visibility.",
  "images": "1-2 paragraphs about image optimization.",
  "googleData": "2-3 paragraphs summarizing Google data for executives."
}

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // --- CALL C: Implementation ---
  const callC = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    messages: [{
      role: 'user',
      content: `You are a senior developer writing implementation deliverables for ${result.url}. The audience is a development team that needs copy-paste ready code and tickets.

SITE DATA:
- URL: ${result.url}
- Pages crawled: ${result.pagesCrawled}
- Currently detected schema types: ${Array.from(allSchemas).join(', ') || 'NONE'}
- Homepage title: ${result.pages[0]?.onPage.title || 'MISSING'}

FAILING CHECKS:
${failingChecks.slice(0, 20).join('\n')}

RECOMMENDATIONS:
${result.recommendations.map(r => `[${r.impact}/${r.effort}] ${r.title}: ${r.description} (${r.affectedUrls.length} URLs)`).join('\n')}

${pageTypesSummary}

Return a JSON object with these keys:

{
  "schemaTemplates": [
    {
      "type": "Organization",
      "description": "Add to all pages. Establishes brand entity in Google Knowledge Graph.",
      "jsonLd": "{ full valid JSON-LD here, customized with the actual site name and URL }",
      "applicablePages": "All pages (add to _app.tsx or layout.tsx)"
    },
    ...generate 4-5 more templates appropriate for this site type (LocalBusiness, BreadcrumbList, FAQPage, Article, Service, etc.)
  ],

  "implementationGuide": "Write a developer-ready implementation guide with:\n\n### Phase 1: Quick Fixes (Week 1)\n- Specific file paths and code changes\n- Verification commands (curl, grep, browser console)\n\n### Phase 2: Schema Implementation (Week 2-3)\n- How to add JSON-LD to the site\n- Component code for React/Next.js\n\n### Phase 3: Content & Technical (Month 2)\n- Content improvements needed\n- Technical fixes\n\nInclude actual commands to verify each fix.",

  "tickets": [
    {
      "id": "SEO-001",
      "title": "Add unique title tags to X pages with duplicates",
      "priority": "P0",
      "description": "X pages share identical title tags, causing search engines to compete them against each other.",
      "acceptanceCriteria": ["Each page has a unique <title> tag", "Titles follow pattern: [Page Topic] | [Brand]", "No title exceeds 60 characters"],
      "storyPoints": 3,
      "testingInstructions": "Run: curl -s URL | grep '<title>' for each affected page. Verify each title is unique.",
      "dependencies": [],
      "category": "On-Page SEO"
    },
    ...generate 15 more tickets covering all recommendations plus schema, security headers, performance, content improvements. Use priorities: P0 (critical, fix this week), P1 (high, fix in 2 weeks), P2 (medium, fix in 1-2 months), P3 (backlog). Story points: 1-8 scale.
  ]
}

Make all JSON-LD valid and parseable. Use the actual site's URL and brand name. Schema templates should be realistic and deployable.

Return ONLY the JSON object, no markdown fences.`
    }],
  });

  // Run all 3 in parallel
  const [responseA, responseB, responseC] = await Promise.all([
    callA.catch(err => { console.error('Premium Call A failed:', err); return null; }),
    callB.catch(err => { console.error('Premium Call B failed:', err); return null; }),
    callC.catch(err => { console.error('Premium Call C failed:', err); return null; }),
  ]);

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
