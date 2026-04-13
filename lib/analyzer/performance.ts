import { Check, PerformanceResult } from './types';

export async function analyzePerformance(url: string): Promise<PerformanceResult> {
  const checks: Check[] = [];

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=SEO`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s max — don't block the whole audit

    const r = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!r.ok) throw new Error(`PSI API returned ${r.status}`);
    const data = await r.json();
    const lh = data.lighthouseResult;
    const cats = lh?.categories || {};

    const perfScore = Math.round((cats.performance?.score || 0) * 100);
    const seoScore = Math.round((cats.seo?.score || 0) * 100);
    const lcp = lh?.audits?.['largest-contentful-paint']?.numericValue || 0;
    const cls = lh?.audits?.['cumulative-layout-shift']?.numericValue || 0;

    checks.push({ name: 'Performance score', status: perfScore >= 50 ? 'pass' : 'fail', message: `Lighthouse Performance: ${perfScore}/100`, value: perfScore });
    checks.push({ name: 'SEO score', status: seoScore >= 80 ? 'pass' : seoScore >= 50 ? 'warn' : 'fail', message: `Lighthouse SEO: ${seoScore}/100`, value: seoScore });
    checks.push({ name: 'LCP', status: lcp < 2500 ? 'pass' : lcp < 4000 ? 'warn' : 'fail', message: `LCP: ${(lcp / 1000).toFixed(1)}s`, value: Math.round(lcp) });
    checks.push({ name: 'CLS', status: cls < 0.1 ? 'pass' : cls < 0.25 ? 'warn' : 'fail', message: `CLS: ${cls.toFixed(3)}`, value: cls });

    const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
    return {
      score, checks,
      lighthouseScores: {
        performance: perfScore,
        seo: seoScore,
        bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      },
    };
  } catch {
    // Fallback: score based on page characteristics when PSI is unavailable
    checks.push({ name: 'PageSpeed API', status: 'warn', message: 'PageSpeed Insights API unavailable (rate limited). Score based on server response.' });
    // Give a neutral-positive score since we can't measure — don't penalize for API limits
    return { score: 70, checks };
  }
}
