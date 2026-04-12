export interface ServiceCheck {
  title: string;
  description: string;
}

export interface ServiceFinding {
  issue: string;
  impact: string;
}

export interface ServiceData {
  slug: string;
  name: string;
  headline: string;
  description: string;
  whyItMatters: string;
  checks: ServiceCheck[];
  findings: ServiceFinding[];
}

export const services: ServiceData[] = [
  {
    slug: 'seo-audit',
    name: 'SEO Audit',
    headline: 'Comprehensive SEO Audit',
    description: 'A complete analysis of your website across every dimension that affects organic search performance. We crawl up to 500 pages, connect to your Google data, and deliver a prioritized roadmap your team can execute immediately.',
    whyItMatters: 'Most businesses lose 30-60% of their potential organic traffic to fixable issues they don\'t know about. A comprehensive audit surfaces these hidden problems and quantifies the opportunity cost of leaving them unfixed. Our clients typically see a 50-150% increase in organic traffic within 90 days of implementing audit recommendations.',
    checks: [
      { title: 'Full Site Crawl', description: 'We analyze up to 500 pages, not just your homepage. Broken links, redirect chains, orphan pages, and crawl traps are identified across your entire site architecture.' },
      { title: 'Google Search Console Integration', description: 'With your permission, we pull real click, impression, and ranking data to identify which pages are underperforming and where the biggest opportunities lie.' },
      { title: 'Competitive Gap Analysis', description: 'We compare your SEO profile against competitors to find the queries and content gaps where you\'re losing market share.' },
      { title: 'Prioritized Action Plan', description: 'Every finding is ranked by impact and effort, so your team knows exactly what to fix first for maximum ROI.' },
      { title: 'Professional PDF Report', description: 'A presentation-ready document with executive summary, data visualizations, and detailed recommendations your team can share with stakeholders.' },
      { title: 'Dev-Ready Deliverables', description: 'Schema components, config files, and Jira-ready tickets — not just recommendations, but the actual code and specs to implement them.' },
    ],
    findings: [
      { issue: 'Broken title tags rendering React component text instead of page titles', impact: 'Caused 38,000-69,000 lost clicks per quarter on a site with 1.5M impressions' },
      { issue: 'Zero schema markup across 222 location pages', impact: 'No rich results in Google, missing map pack opportunities for "near me" queries' },
      { issue: '1,566 thin content pages with only 153 words each indexed by Google', impact: 'Wasting crawl budget and diluting domain quality signals' },
    ],
  },
  {
    slug: 'technical-analysis',
    name: 'Technical Analysis',
    headline: 'Technical SEO Analysis',
    description: 'The invisible infrastructure that determines whether search engines can find, crawl, and index your content. We examine the technical foundation that everything else depends on.',
    whyItMatters: 'Technical SEO issues are the most common reason websites underperform in search. A single misconfigured robots.txt can hide your entire site from Google. Missing security headers erode trust signals. Slow server response times push you down in rankings. These are often quick fixes with outsized impact — the highest-ROI work in SEO.',
    checks: [
      { title: 'Crawlability', description: 'robots.txt configuration, XML sitemap presence and validity, crawl budget efficiency, and internal link structure.' },
      { title: 'Indexability', description: 'Canonical tags, noindex directives, redirect chains, and duplicate content detection across your site.' },
      { title: 'Security Headers', description: 'HTTPS enforcement, HSTS preloading, Content-Security-Policy, X-Frame-Options, Referrer-Policy, and Permissions-Policy.' },
      { title: 'Server Performance', description: 'Time to First Byte (TTFB), server response codes, redirect efficiency, and cache-control configuration.' },
      { title: 'International SEO', description: 'Hreflang implementation, language tags, regional targeting, and cross-locale canonical management.' },
    ],
    findings: [
      { issue: 'HTTP to HTTPS redirect chain requiring 3 hops instead of 1', impact: 'Added 400ms latency to every first visit and diluted link equity across redirect chain' },
      { issue: 'Missing X-Frame-Options and Referrer-Policy headers', impact: 'Reduced trust signals to search engines and left site vulnerable to clickjacking' },
      { issue: 'Sitemap missing lastmod dates on 2,400+ URLs', impact: 'Google couldn\'t prioritize which pages to re-crawl, delaying indexation of updates' },
    ],
  },
  {
    slug: 'content-review',
    name: 'Content Review',
    headline: 'Content & E-E-A-T Analysis',
    description: 'Google\'s quality guidelines emphasize Experience, Expertise, Authoritativeness, and Trustworthiness. We evaluate whether your content meets these standards and identify gaps that suppress your rankings.',
    whyItMatters: 'Google\'s helpful content system can demote entire sites that produce low-quality or unoriginal content. E-E-A-T signals are especially critical for YMYL (Your Money, Your Life) topics like finance, health, and professional services. Even high-quality content underperforms without proper author attribution, freshness signals, and structural readability.',
    checks: [
      { title: 'Content Depth & Quality', description: 'Word count analysis, thin content detection, duplicate content identification, and content uniqueness scoring across all indexed pages.' },
      { title: 'Author Attribution', description: 'Author bios, credentials, author pages, and proper schema markup that demonstrates real expertise behind your content.' },
      { title: 'Freshness Signals', description: 'Publication dates, last-modified timestamps, content update frequency, and staleness detection for time-sensitive content.' },
      { title: 'Readability & Structure', description: 'Heading hierarchy, paragraph length, list usage, table formatting, and reading level analysis.' },
      { title: 'Authority Indicators', description: 'External citations, press mentions, about page completeness, contact information visibility, and privacy policy presence.' },
    ],
    findings: [
      { issue: 'Blog posts attributed to "System Admin" instead of real authors', impact: 'Zero E-E-A-T signal for 498 blog posts, undermining content authority in Google\'s quality assessment' },
      { issue: '73% of blog content unchanged since 2020-2022', impact: 'Stale content loses ranking priority as Google favors fresh, updated information' },
      { issue: 'Blog on subdomain isolating link equity from main domain', impact: 'Content authority not flowing to commercial pages, weakening overall domain strength' },
    ],
  },
  {
    slug: 'schema-markup',
    name: 'Schema Markup',
    headline: 'Structured Data & Schema',
    description: 'Schema markup tells search engines exactly what your content means, not just what it says. Proper structured data unlocks rich results — star ratings, FAQ dropdowns, breadcrumbs, and business information directly in search results.',
    whyItMatters: 'Pages with rich results get 20-30% higher click-through rates than standard listings. For multi-location businesses, LocalBusiness schema is essential for appearing in map packs and "near me" searches. Missing schema is like having a beautifully designed store with no signage — Google can see your content but can\'t categorize it properly.',
    checks: [
      { title: 'JSON-LD Detection', description: 'We scan every page for existing structured data in JSON-LD, Microdata, and RDFa formats, and validate each block against Schema.org specifications.' },
      { title: 'Organization Schema', description: 'Your homepage should declare your business entity with name, logo, social profiles, and contact information for Google\'s Knowledge Panel.' },
      { title: 'LocalBusiness / Location Schema', description: 'Each physical location needs address, phone, hours, geo-coordinates, and service area markup for local search and map results.' },
      { title: 'BreadcrumbList Schema', description: 'Breadcrumb markup enhances your SERP listing with a navigational path, improving CTR and helping Google understand site hierarchy.' },
      { title: 'FAQPage Schema', description: 'FAQ markup can expand your SERP listing with question-and-answer dropdowns, dramatically increasing your visibility on the results page.' },
      { title: 'Code Generation', description: 'We don\'t just recommend schema — we generate production-ready JSON-LD components your developers can drop directly into your codebase.' },
    ],
    findings: [
      { issue: 'Zero JSON-LD markup on a 222-location coworking business', impact: 'No rich results for any location, invisible in "coworking space near me" map packs' },
      { issue: 'Missing BreadcrumbList on all pages', impact: 'SERP listings show raw URLs instead of clean navigational paths, reducing CTR by 10-15%' },
      { issue: 'Blog using generic Article type instead of BlogPosting', impact: 'Missing out on article-specific rich results and Google Discover eligibility' },
    ],
  },
  {
    slug: 'performance',
    name: 'Performance',
    headline: 'Speed & Core Web Vitals',
    description: 'Google uses Core Web Vitals as a direct ranking factor. We measure your real-user performance using Chrome UX Report field data — not just lab tests — and identify exactly what\'s slowing you down.',
    whyItMatters: 'Since 2021, Core Web Vitals (LCP, INP, CLS) are confirmed Google ranking factors. Sites that fail these thresholds can be demoted in search results. But lab tests don\'t tell the full story — what matters is how real users on real devices experience your site. We pull actual Chrome user data to show your true performance profile.',
    checks: [
      { title: 'Largest Contentful Paint (LCP)', description: 'How quickly your main content loads. Target: under 2.5 seconds. We break down LCP into its 4 sub-parts to pinpoint exactly where the delay occurs.' },
      { title: 'Interaction to Next Paint (INP)', description: 'How responsive your page is to user interactions. Target: under 200ms. Critical for JavaScript-heavy sites and single-page applications.' },
      { title: 'Cumulative Layout Shift (CLS)', description: 'How much your page layout shifts while loading. Target: under 0.1. Layout shifts frustrate users and signal poor page quality.' },
      { title: 'Resource Optimization', description: 'Unused JavaScript analysis, image format optimization (WebP/AVIF), lazy loading strategy, and preload hint configuration.' },
      { title: 'Server Performance', description: 'Time to First Byte, cache-control headers, CDN configuration, and compression analysis.' },
    ],
    findings: [
      { issue: 'Hero image set to lazy loading instead of eager, delaying LCP', impact: 'Adding priority={true} to the Next.js Image component reduced LCP by 800ms' },
      { issue: 'Cache-Control set to no-cache on all pages including static marketing pages', impact: 'Every visit triggers a full server render, adding 500ms+ to page loads unnecessarily' },
      { issue: '501 KiB of unused JavaScript shipped to mobile users', impact: 'Increasing Total Blocking Time and degrading INP scores on mid-range devices' },
    ],
  },
  {
    slug: 'ai-readiness',
    name: 'AI Readiness',
    headline: 'AI Search Readiness',
    description: 'Search is changing. Google AI Overviews, ChatGPT web search, Perplexity, and Bing Copilot are reshaping how users discover information. We analyze whether your content is structured to be cited by AI systems.',
    whyItMatters: 'By 2026, an estimated 30% of search queries involve AI-generated responses. If your content isn\'t structured for AI extraction, you\'re invisible to a growing segment of your audience. AI systems favor content with clear facts, quotable statistics, structured data, and explicit entity definitions. This is a new frontier — and most competitors haven\'t optimized for it yet.',
    checks: [
      { title: 'llms.txt Compliance', description: 'Does your site have a /llms.txt file that helps AI systems understand your business, services, and content? We check for presence and quality.' },
      { title: 'AI Crawler Access', description: 'Is your robots.txt blocking GPTBot, ClaudeBot, or PerplexityBot? We verify that AI crawlers can access your content.' },
      { title: 'Citability Score', description: 'Does your content contain quotable facts, statistics, definitions, and authoritative claims that AI systems can extract and cite?' },
      { title: 'Structural Readability', description: 'Tables, lists, FAQ sections, and definition-style content that AI systems can parse more effectively than prose.' },
      { title: 'Entity Clarity', description: 'Are your brand, products, and services clearly defined with structured data so AI systems can accurately represent you?' },
    ],
    findings: [
      { issue: '/llms.txt URL returns an HTML page instead of plain text', impact: 'AI crawlers can\'t understand the site\'s purpose, reducing chances of being cited in AI responses' },
      { issue: 'robots.txt blocks GPTBot and ClaudeBot', impact: 'Site is completely invisible to ChatGPT and Claude web search, missing AI-driven discovery traffic' },
      { issue: 'No FAQ content or structured Q&A on any page', impact: 'Missing the primary content format that AI systems extract for featured answers' },
    ],
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return services.find((s) => s.slug === slug);
}
