export interface PageSpeedData {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  metrics: {
    lcp: number;
    cls: number;
    tbt: number;
    fcp: number;
    si: number;
    tti: number;
  };
}

export async function fetchPageSpeed(url: string, apiKey?: string): Promise<PageSpeedData | null> {
  try {
    const params = new URLSearchParams({
      url,
      strategy: 'MOBILE',
      category: 'PERFORMANCE',
    });
    params.append('category', 'SEO');
    params.append('category', 'ACCESSIBILITY');
    params.append('category', 'BEST_PRACTICES');
    if (apiKey) params.set('key', apiKey);

    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
      { signal: AbortSignal.timeout(45000) }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const lh = data.lighthouseResult;
    if (!lh) return null;

    const cats = lh.categories || {};
    const audits = lh.audits || {};

    return {
      performanceScore: Math.round((cats.performance?.score || 0) * 100),
      seoScore: Math.round((cats.seo?.score || 0) * 100),
      accessibilityScore: Math.round((cats.accessibility?.score || 0) * 100),
      bestPracticesScore: Math.round((cats['best-practices']?.score || 0) * 100),
      metrics: {
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0,
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        si: audits['speed-index']?.numericValue || 0,
        tti: audits['interactive']?.numericValue || 0,
      },
    };
  } catch {
    return null;
  }
}
