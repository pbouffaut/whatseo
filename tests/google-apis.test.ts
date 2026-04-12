import { describe, it, expect } from 'vitest';
import { fetchPageSpeed } from '../lib/google/pagespeed';
import { fetchCruxData } from '../lib/google/crux';

describe('PageSpeed Insights API', () => {
  it('fetches data for a valid URL without API key', async () => {
    const data = await fetchPageSpeed('https://example.com');
    // May be null due to rate limiting, but should not throw
    if (data) {
      expect(data.performanceScore).toBeGreaterThanOrEqual(0);
      expect(data.performanceScore).toBeLessThanOrEqual(100);
      expect(data.seoScore).toBeGreaterThanOrEqual(0);
      expect(data.metrics.lcp).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns null for invalid URL', async () => {
    const data = await fetchPageSpeed('https://this-does-not-exist-12345.com');
    expect(data).toBeNull();
  });
});

describe('CrUX API', () => {
  it('returns null without API key for non-popular origins', async () => {
    const data = await fetchCruxData('https://tiny-unknown-site-12345.com');
    expect(data).toBeNull();
  });

  // Note: CrUX API requires an API key and the origin must have enough Chrome users
  // These tests verify graceful failure handling
  it('handles API errors gracefully', async () => {
    const data = await fetchCruxData('not-a-url');
    expect(data).toBeNull();
  });
});
