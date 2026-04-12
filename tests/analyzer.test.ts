import { describe, it, expect } from 'vitest';
import { analyzeOnPage } from '../lib/analyzer/onpage';
import { analyzeSchema } from '../lib/analyzer/schema';
import { analyzeImages } from '../lib/analyzer/images';
import { analyzeContent } from '../lib/analyzer/content';
import { calculateScore } from '../lib/analyzer/scorer';

// --- On-Page Analyzer ---
describe('On-Page Analyzer', () => {
  it('detects missing title tag', () => {
    const html = '<html><head></head><body><h1>Hello</h1></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.title).toBeNull();
    const titleCheck = result.checks.find(c => c.name === 'Title tag present');
    expect(titleCheck?.status).toBe('fail');
  });

  it('detects present title tag', () => {
    const html = '<html><head><title>My Page Title</title></head><body><h1>Hello</h1></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.title).toBe('My Page Title');
    const titleCheck = result.checks.find(c => c.name === 'Title tag present');
    expect(titleCheck?.status).toBe('pass');
  });

  it('warns on title length outside optimal range', () => {
    const html = '<html><head><title>Hi</title></head><body><h1>Hello</h1></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    const lenCheck = result.checks.find(c => c.name === 'Title length');
    expect(lenCheck?.status).not.toBe('pass'); // Too short
  });

  it('detects missing H1', () => {
    const html = '<html><head><title>Test</title></head><body><h2>Sub</h2></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.h1s).toHaveLength(0);
    const h1Check = result.checks.find(c => c.name === 'H1 tag count');
    expect(h1Check?.status).toBe('fail');
  });

  it('detects multiple H1 tags', () => {
    const html = '<html><head><title>Test</title></head><body><h1>First</h1><h1>Second</h1></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.h1s).toHaveLength(2);
    const h1Check = result.checks.find(c => c.name === 'H1 tag count');
    expect(h1Check?.status).toBe('warn');
  });

  it('counts internal and external links', () => {
    const html = `<html><head><title>Test Page Title Here Now</title></head><body>
      <h1>Hello</h1>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="https://example.com/page">Internal</a>
      <a href="https://other.com">External</a>
    </body></html>`;
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.internalLinks).toBeGreaterThanOrEqual(2);
    expect(result.externalLinks).toBeGreaterThanOrEqual(1);
  });

  it('detects meta description', () => {
    const html = '<html><head><title>Test Page</title><meta name="description" content="This is a test description that is long enough to pass the length check for meta descriptions."></head><body><h1>Hi</h1></body></html>';
    const result = analyzeOnPage(html, 'https://example.com');
    expect(result.metaDescription).toBeTruthy();
  });
});

// --- Schema Analyzer ---
describe('Schema Analyzer', () => {
  it('detects JSON-LD blocks', () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Test"}</script>
    </head><body></body></html>`;
    const result = analyzeSchema(html);
    expect(result.jsonLdBlocks).toBe(1);
    expect(result.schemasFound).toContain('Organization');
  });

  it('handles no schema', () => {
    const html = '<html><head></head><body><p>No schema here</p></body></html>';
    const result = analyzeSchema(html);
    expect(result.jsonLdBlocks).toBe(0);
    expect(result.schemasFound).toHaveLength(0);
    const check = result.checks.find(c => c.name === 'JSON-LD present');
    expect(check?.status).toBe('fail');
  });

  it('detects BreadcrumbList', () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>
    </head><body></body></html>`;
    const result = analyzeSchema(html);
    expect(result.schemasFound).toContain('BreadcrumbList');
  });

  it('handles invalid JSON gracefully', () => {
    const html = `<html><head>
      <script type="application/ld+json">{invalid json here}</script>
    </head><body></body></html>`;
    const result = analyzeSchema(html);
    expect(result.jsonLdBlocks).toBe(1);
    const validCheck = result.checks.find(c => c.name === 'Valid JSON-LD');
    expect(validCheck?.status).toBe('fail');
  });
});

// --- Image Analyzer ---
describe('Image Analyzer', () => {
  it('handles page with no images', () => {
    const html = '<html><body><p>No images</p></body></html>';
    const result = analyzeImages(html);
    expect(result.totalImages).toBe(0);
    expect(result.score).toBe(80); // No images = pass (text-based site)
  });

  it('detects missing alt text', () => {
    const html = '<html><body><img src="test.jpg"><img src="test2.jpg" alt="Has alt"></body></html>';
    const result = analyzeImages(html);
    expect(result.totalImages).toBe(2);
    expect(result.missingAlt).toBe(1);
  });

  it('detects WebP images', () => {
    const html = '<html><body><img src="test.webp" alt="WebP image"></body></html>';
    const result = analyzeImages(html);
    expect(result.webpImages).toBeGreaterThanOrEqual(1);
  });

  it('detects lazy loading', () => {
    const html = '<html><body><img src="test.jpg" alt="Lazy" loading="lazy"></body></html>';
    const result = analyzeImages(html);
    expect(result.lazyLoaded).toBe(1);
  });
});

// --- Content Analyzer ---
describe('Content Analyzer', () => {
  it('detects thin content', () => {
    const html = '<html><body><p>Short page.</p></body></html>';
    const result = analyzeContent(html);
    expect(result.wordCount).toBeLessThan(100);
    expect(result.readabilityLevel).toBe('thin');
  });

  it('detects adequate content', () => {
    const words = Array(400).fill('word').join(' ');
    const html = `<html><body><h1>Title</h1><h2>Section</h2><p>${words}</p></body></html>`;
    const result = analyzeContent(html);
    expect(result.wordCount).toBeGreaterThan(300);
    expect(result.readabilityLevel).toBe('adequate');
  });

  it('detects privacy/terms links', () => {
    const html = '<html><body><p>Some content</p><a href="/privacy">Privacy</a><a href="/terms">Terms</a></body></html>';
    const result = analyzeContent(html);
    const check = result.checks.find(c => c.name === 'Privacy/terms link');
    expect(check?.status).toBe('pass');
  });
});

// --- Scorer ---
describe('Scorer', () => {
  it('calculates weighted score correctly', () => {
    const mockResults = {
      technical: { score: 80, checks: [] },
      content: { score: 60, checks: [], wordCount: 500, readabilityLevel: 'adequate' },
      onPage: { score: 70, checks: [], title: 'Test', metaDescription: 'Desc', h1s: ['H1'], h2s: ['H2'], internalLinks: 10, externalLinks: 2 },
      schema: { score: 50, checks: [], schemasFound: [], jsonLdBlocks: 0 },
      performance: { score: 90, checks: [] },
      aiReadiness: { score: 40, checks: [] },
      images: { score: 75, checks: [], totalImages: 5, missingAlt: 0, lazyLoaded: 3, webpImages: 2 },
    };
    const score = calculateScore(mockResults);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    // Verify weighted: 80*0.22 + 60*0.23 + 70*0.20 + 50*0.10 + 90*0.10 + 40*0.10 + 75*0.05
    // = 17.6 + 13.8 + 14 + 5 + 9 + 4 + 3.75 = 67.15 ≈ 67
    expect(score.overall).toBeCloseTo(67, 0);
  });

  it('returns 0 for all-zero scores', () => {
    const mockResults = {
      technical: { score: 0, checks: [] },
      content: { score: 0, checks: [], wordCount: 0, readabilityLevel: 'thin' },
      onPage: { score: 0, checks: [], title: null, metaDescription: null, h1s: [], h2s: [], internalLinks: 0, externalLinks: 0 },
      schema: { score: 0, checks: [], schemasFound: [], jsonLdBlocks: 0 },
      performance: { score: 0, checks: [] },
      aiReadiness: { score: 0, checks: [] },
      images: { score: 0, checks: [], totalImages: 0, missingAlt: 0, lazyLoaded: 0, webpImages: 0 },
    };
    const score = calculateScore(mockResults);
    expect(score.overall).toBe(0);
  });
});
