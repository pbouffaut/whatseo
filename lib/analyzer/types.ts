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
