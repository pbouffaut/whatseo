import Anthropic from '@anthropic-ai/sdk';
import type { FullAuditResult } from '../analyzer/types';

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
