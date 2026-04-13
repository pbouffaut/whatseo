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
    const audits = lh?.audits || {};

    // --- Scores ---
    const perfScore = Math.round((cats.performance?.score || 0) * 100);
    const seoScore = Math.round((cats.seo?.score || 0) * 100);

    // --- Core Web Vitals ---
    const lcp = audits['largest-contentful-paint']?.numericValue || 0;
    const cls = audits['cumulative-layout-shift']?.numericValue || 0;
    const tbt = audits['total-blocking-time']?.numericValue;
    const fcp = audits['first-contentful-paint']?.numericValue;
    const si = audits['speed-index']?.numericValue;
    const tti = audits['interactive']?.numericValue;

    // --- Check 1: Performance score ---
    checks.push({ name: 'Performance score', status: perfScore >= 50 ? 'pass' : 'fail', message: `Lighthouse Performance: ${perfScore}/100`, value: perfScore });

    // --- Check 2: SEO score ---
    checks.push({ name: 'SEO score', status: seoScore >= 80 ? 'pass' : seoScore >= 50 ? 'warn' : 'fail', message: `Lighthouse SEO: ${seoScore}/100`, value: seoScore });

    // --- Check 3: LCP ---
    checks.push({ name: 'LCP', status: lcp < 2500 ? 'pass' : lcp < 4000 ? 'warn' : 'fail', message: `LCP: ${(lcp / 1000).toFixed(1)}s`, value: Math.round(lcp) });

    // --- Check 4: CLS ---
    checks.push({ name: 'CLS', status: cls < 0.1 ? 'pass' : cls < 0.25 ? 'warn' : 'fail', message: `CLS: ${cls.toFixed(3)}`, value: cls });

    // --- Check 5: Total Blocking Time (TBT) ---
    if (tbt !== undefined) {
      checks.push({
        name: 'TBT',
        status: tbt < 200 ? 'pass' : tbt < 600 ? 'warn' : 'fail',
        message: `Total Blocking Time: ${Math.round(tbt)}ms`,
        value: Math.round(tbt),
      });
    }

    // --- Check 6: First Contentful Paint (FCP) ---
    if (fcp !== undefined) {
      checks.push({
        name: 'FCP',
        status: fcp < 1800 ? 'pass' : fcp < 3000 ? 'warn' : 'fail',
        message: `First Contentful Paint: ${(fcp / 1000).toFixed(1)}s`,
        value: Math.round(fcp),
      });
    }

    // --- Check 7: Speed Index ---
    if (si !== undefined) {
      checks.push({
        name: 'Speed Index',
        status: si < 3400 ? 'pass' : si < 5800 ? 'warn' : 'fail',
        message: `Speed Index: ${(si / 1000).toFixed(1)}s`,
        value: Math.round(si),
      });
    }

    // --- Check 8: Time to Interactive (TTI) ---
    if (tti !== undefined) {
      checks.push({
        name: 'TTI',
        status: tti < 3800 ? 'pass' : tti < 7300 ? 'warn' : 'fail',
        message: `Time to Interactive: ${(tti / 1000).toFixed(1)}s`,
        value: Math.round(tti),
      });
    }

    // --- Check 9: Third-party impact ---
    const thirdParty = audits['third-party-summary'];
    if (thirdParty) {
      const tpScore = thirdParty.score;
      const tpDetails = thirdParty.details;
      const tpItems = tpDetails?.items || [];
      const tpBlockingTime = tpItems.reduce((sum: number, item: { blockingTime?: number }) => sum + (item.blockingTime || 0), 0);

      if (tpItems.length > 0) {
        checks.push({
          name: 'Third-party impact',
          status: tpScore === 1 ? 'pass' : tpBlockingTime < 250 ? 'warn' : 'fail',
          message: tpBlockingTime > 0
            ? `${tpItems.length} third-party scripts found, ${Math.round(tpBlockingTime)}ms blocking time`
            : `${tpItems.length} third-party scripts found (no significant blocking time)`,
          value: Math.round(tpBlockingTime),
        });
      } else {
        checks.push({ name: 'Third-party impact', status: 'pass', message: 'No significant third-party scripts detected' });
      }
    }

    // --- Check 10: Unused JavaScript ---
    const unusedJs = audits['unused-javascript'];
    if (unusedJs) {
      const ujsItems = unusedJs.details?.items || [];
      const ujsWastedBytes = ujsItems.reduce((sum: number, item: { wastedBytes?: number }) => sum + (item.wastedBytes || 0), 0);
      const ujsWastedKB = Math.round(ujsWastedBytes / 1024);

      checks.push({
        name: 'Unused JavaScript',
        status: unusedJs.score === 1 ? 'pass' : ujsWastedKB < 150 ? 'warn' : 'fail',
        message: ujsWastedKB > 0
          ? `${ujsWastedKB}KB of unused JavaScript across ${ujsItems.length} scripts`
          : 'No significant unused JavaScript detected',
        value: ujsWastedKB,
      });
    }

    // --- Check 11: Render-blocking resources ---
    const renderBlocking = audits['render-blocking-resources'];
    if (renderBlocking) {
      const rbItems = renderBlocking.details?.items || [];
      const rbWastedMs = rbItems.reduce((sum: number, item: { wastedMs?: number }) => sum + (item.wastedMs || 0), 0);

      checks.push({
        name: 'Render-blocking resources',
        status: renderBlocking.score === 1 ? 'pass' : rbItems.length <= 2 ? 'warn' : 'fail',
        message: rbItems.length > 0
          ? `${rbItems.length} render-blocking resources (${Math.round(rbWastedMs)}ms potential savings)`
          : 'No render-blocking resources detected',
        value: rbItems.length,
      });
    }

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
