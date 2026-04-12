export interface Check {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  value?: string | number;
}

export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  redirectChain: string[];
  responseTime: number;
}

export interface TechnicalResult {
  score: number;
  checks: Check[];
}

export interface OnPageResult {
  score: number;
  checks: Check[];
  title: string | null;
  metaDescription: string | null;
  h1s: string[];
  h2s: string[];
  internalLinks: number;
  externalLinks: number;
}

export interface SchemaResult {
  score: number;
  checks: Check[];
  schemasFound: string[];
  jsonLdBlocks: number;
}

export interface ImageResult {
  score: number;
  checks: Check[];
  totalImages: number;
  missingAlt: number;
  lazyLoaded: number;
  webpImages: number;
}

export interface PerformanceResult {
  score: number;
  checks: Check[];
  lighthouseScores?: {
    performance: number;
    seo: number;
    bestPractices: number;
    accessibility: number;
  };
}

export interface ContentResult {
  score: number;
  checks: Check[];
  wordCount: number;
  readabilityLevel: string;
}

export interface AIReadinessResult {
  score: number;
  checks: Check[];
}

export interface CategoryScore {
  score: number;
  weight: number;
  weighted: number;
}

export interface AuditScore {
  overall: number;
  categories: {
    technical: CategoryScore;
    content: CategoryScore;
    onPage: CategoryScore;
    schema: CategoryScore;
    performance: CategoryScore;
    aiReadiness: CategoryScore;
    images: CategoryScore;
  };
}

export interface AuditResult {
  url: string;
  finalUrl: string;
  score: AuditScore;
  technical: TechnicalResult;
  onPage: OnPageResult;
  schema: SchemaResult;
  images: ImageResult;
  performance: PerformanceResult;
  content: ContentResult;
  aiReadiness: AIReadinessResult;
  analyzedAt: string;
  duration: number;
}

// --- Full Audit Types ---

export interface CrawledPage {
  url: string;
  finalUrl: string;
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  redirectChain: string[];
  responseTime: number;
  depth: number;
  source: 'sitemap' | 'internal_link' | 'priority' | 'homepage';
  error?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  sitemapUrls: string[];
  skippedUrls: string[];
  duration: number;
}

export interface PageAuditResult {
  url: string;
  statusCode: number;
  responseTime: number;
  technical: TechnicalResult;
  onPage: OnPageResult;
  schema: SchemaResult;
  images: ImageResult;
  content: ContentResult;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
  affectedUrls: string[];
}

export interface FullAuditResult {
  url: string;
  finalUrl: string;
  auditType: 'full';
  score: AuditScore;
  pagesCrawled: number;
  pagesTotal: number;
  crawlDuration: number;

  // Aggregated scores (averages across all pages)
  technical: TechnicalResult;
  onPage: OnPageResult;
  schema: SchemaResult;
  images: ImageResult;
  content: ContentResult;
  performance: PerformanceResult;
  aiReadiness: AIReadinessResult;

  // Per-page results
  pages: PageAuditResult[];

  // Pattern detection
  thinContentPages: string[];
  missingTitlePages: string[];
  missingMetaDescPages: string[];
  duplicateTitles: { title: string; urls: string[] }[];
  duplicateDescriptions: { description: string; urls: string[] }[];
  missingSchemaPages: string[];
  brokenLinks: { url: string; statusCode: number; foundOn: string }[];
  slowPages: string[];

  // Recommendations
  recommendations: Recommendation[];

  // AI-generated expert insights (optional)
  insights?: {
    executive: string;
    technical: string;
    content: string;
    onPage: string;
    schema: string;
    performance: string;
    aiReadiness: string;
    images: string;
    topPriority: string;
    googleData?: string;
  };

  // Google API data (optional — only if connected)
  googleData?: {
    pageSpeed?: import('../google/pagespeed').PageSpeedData;
    crux?: import('../google/crux').CruxData;
    gsc?: import('../google/gsc').GscData;
    ga4?: import('../google/ga4').Ga4Data;
  };

  analyzedAt: string;
  duration: number;
}
