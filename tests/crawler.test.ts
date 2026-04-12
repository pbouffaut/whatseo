import { describe, it, expect } from 'vitest';
import { fetchPage, fetchPageSafe } from '../lib/analyzer/fetch';

describe('Page Fetcher', () => {
  it('fetches a real page successfully', async () => {
    const result = await fetchPage('https://example.com');
    expect(result.statusCode).toBe(200);
    expect(result.html).toContain('Example Domain');
    expect(result.responseTime).toBeGreaterThan(0);
  });

  it('follows redirects (www to non-www)', async () => {
    const result = await fetchPage('https://industriousoffice.com');
    expect(result.finalUrl).toContain('www.industriousoffice.com');
    expect(result.statusCode).toBe(200);
    expect(result.redirectChain.length).toBeGreaterThanOrEqual(1);
  });

  it('adds https:// if missing', async () => {
    const result = await fetchPage('example.com');
    expect(result.finalUrl).toContain('https://');
    expect(result.statusCode).toBe(200);
  });

  it('handles invalid URLs gracefully via fetchPageSafe', async () => {
    const result = await fetchPageSafe('https://this-domain-definitely-does-not-exist-12345.com', 0, 'homepage');
    expect(result.error).toBeTruthy();
    expect(result.statusCode).toBe(0);
  });

  it('returns error data instead of throwing via fetchPageSafe', async () => {
    const result = await fetchPageSafe('https://httpstat.us/404', 0, 'homepage');
    // May get 404 or connection error (0) — both are valid non-throwing responses
    expect(result.error || result.statusCode >= 400 || result.statusCode === 0).toBeTruthy();
  });
});

describe('URL Normalization', () => {
  it('handles www vs non-www', async () => {
    // industriousoffice.com redirects to www.industriousoffice.com
    const result = await fetchPage('https://industriousoffice.com');
    expect(result.finalUrl).toContain('www.industriousoffice.com');
    expect(result.redirectChain.length).toBeGreaterThanOrEqual(1);
  });
});
