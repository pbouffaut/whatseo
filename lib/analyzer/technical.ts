import * as cheerio from 'cheerio';
import { Check, TechnicalResult } from './types';

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

export async function analyzeTechnical(
  html: string, url: string, headers: Record<string, string>,
  redirectChain: string[], responseTime: number
): Promise<TechnicalResult> {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;
  const checks: Check[] = [];

  // --- Crawlability & Indexation ---

  // Fetch robots.txt
  let robotsTxt = '';
  try {
    const r = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'WhatSEO/1.0' },
    });
    if (r.ok) robotsTxt = await r.text();
  } catch { /* ignore */ }

  checks.push(check('Robots.txt', robotsTxt.length > 0, robotsTxt.length > 0 ? 'robots.txt is accessible' : 'robots.txt not found'));
  checks.push(check('Sitemap in robots.txt', /sitemap/i.test(robotsTxt), /sitemap/i.test(robotsTxt) ? 'Sitemap referenced in robots.txt' : 'No sitemap reference in robots.txt'));
  checks.push(check('HTTPS', url.startsWith('https'), url.startsWith('https') ? 'Site uses HTTPS' : 'Site does not use HTTPS'));
  checks.push(check('HSTS', !!headers['strict-transport-security'], headers['strict-transport-security'] ? 'HSTS header present' : 'HSTS header missing'));

  const canonical = $('link[rel="canonical"]').attr('href');
  checks.push(check('Canonical tag', !!canonical, canonical ? `Canonical: ${canonical}` : 'No canonical tag found'));

  const lang = $('html').attr('lang');
  checks.push(check('HTML lang', !!lang, lang ? `Language: ${lang}` : 'No lang attribute on <html>'));

  // Meta robots — check for noindex
  const metaRobots = $('meta[name="robots"]').attr('content') || '';
  const hasNoindex = /noindex/i.test(metaRobots);
  checks.push(check('Meta robots', !hasNoindex, hasNoindex ? 'Page has noindex directive — will not appear in search' : metaRobots ? `Meta robots: ${metaRobots}` : 'No meta robots (defaults to index,follow)'));

  // Hreflang
  const hreflangs = $('link[rel="alternate"][hreflang]');
  if (hreflangs.length > 0) {
    checks.push(check('Hreflang tags', true, `${hreflangs.length} hreflang tags found (multi-language support)`));
  }

  // --- Security Headers (stricter — more checks) ---

  checks.push(check('X-Content-Type-Options', headers['x-content-type-options'] === 'nosniff', headers['x-content-type-options'] ? 'X-Content-Type-Options set' : 'X-Content-Type-Options missing'));
  checks.push(check('X-Frame-Options', !!headers['x-frame-options'], headers['x-frame-options'] ? 'X-Frame-Options set' : 'X-Frame-Options missing — vulnerable to clickjacking'));
  checks.push(check('Referrer-Policy', !!headers['referrer-policy'], headers['referrer-policy'] ? 'Referrer-Policy set' : 'Referrer-Policy missing — leaking referrer data'));
  checks.push(check('Content-Security-Policy', !!headers['content-security-policy'], headers['content-security-policy'] ? 'CSP header set' : 'CSP header missing'));
  checks.push(check('X-XSS-Protection', !!headers['x-xss-protection'], headers['x-xss-protection'] ? 'X-XSS-Protection set' : 'X-XSS-Protection missing'));
  checks.push(check('Permissions-Policy', !!headers['permissions-policy'], headers['permissions-policy'] ? 'Permissions-Policy set' : 'Permissions-Policy missing — browser features unrestricted'));

  // --- Redirect & Speed ---

  const hops = redirectChain.length;
  checks.push(check('Redirect chain', hops <= 1, hops === 0 ? 'No redirects' : `${hops} redirect(s)`, hops > 1));

  const fast = responseTime < 500;
  const ok = responseTime < 1500;
  checks.push(check('Response time', fast, `${responseTime}ms`, !fast && ok));

  // --- Title tag quality (technical check — does it render correctly?) ---
  const title = $('title').text().trim();
  // Detect broken title tags (common Next.js SSR bug where UI element text leaks into title)
  const titleBroken = title && (
    /icon|menu|button|nav|toggle|hamburger|close|open menu/i.test(title) ||
    title.length < 5 ||
    /^[^a-zA-Z]*$/.test(title) // No letters
  );
  if (titleBroken) {
    checks.push(check('Title tag rendering', false, `Title appears broken: "${title.substring(0, 50)}" — likely a rendering/SSR bug`));
  }

  // --- Viewport meta tag (mobile-first indexing) ---
  const viewport = $('meta[name="viewport"]').attr('content');
  checks.push(check('Viewport meta', !!viewport, viewport ? 'Viewport meta tag present (mobile-friendly)' : 'Missing viewport meta tag — page may not render correctly on mobile'));

  // --- Charset declaration ---
  const charset = $('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0;
  checks.push(check('Charset declaration', charset, charset ? 'Character encoding declared' : 'Missing charset declaration'));

  // --- Favicon ---
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  checks.push(check('Favicon', favicon, favicon ? 'Favicon present' : 'No favicon found — missing brand icon in browser tabs and bookmarks', !favicon));

  // --- Open Graph / Social ---
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  checks.push(check('Open Graph tags', !!ogTitle, ogTitle ? 'OG tags present for social sharing' : 'Missing Open Graph tags — poor social media previews'));
  checks.push(check('Twitter Card', !!twitterCard, twitterCard ? `Twitter card: ${twitterCard}` : 'Missing Twitter Card meta — no rich preview on X/Twitter'));

  // --- NEW CHECKS ---

  // --- Cache-Control header ---
  const cacheControl = headers['cache-control'] || '';
  if (!cacheControl) {
    checks.push(check('Cache-Control', false, 'Cache-Control header missing — browser caching not configured'));
  } else if (/no-cache|no-store/i.test(cacheControl)) {
    checks.push(check('Cache-Control', false, `Cache-Control: ${cacheControl} — caching disabled, slower repeat visits`, true));
  } else if (/max-age/i.test(cacheControl)) {
    checks.push(check('Cache-Control', true, `Cache-Control: ${cacheControl}`));
  } else {
    checks.push(check('Cache-Control', true, `Cache-Control present: ${cacheControl}`));
  }

  // --- HTTP/2 or HTTP/3 detection ---
  // We can detect HTTP/2+ via alt-svc header (indicates server supports modern protocols)
  // or via the presence of certain headers that imply HTTP/2+ (e.g., :status pseudo-header won't be visible,
  // but alt-svc is a strong signal for HTTP/3 support)
  const altSvc = headers['alt-svc'] || '';
  const hasHttp2Signal = altSvc.includes('h2') || altSvc.includes('h3');
  if (hasHttp2Signal) {
    checks.push(check('HTTP/2+ support', true, `Modern protocol supported — alt-svc: ${altSvc.substring(0, 80)}`));
  } else if (altSvc) {
    checks.push(check('HTTP/2+ support', true, `alt-svc header present: ${altSvc.substring(0, 80)}`, true));
  } else {
    checks.push(check('HTTP/2+ support', false, 'No alt-svc header detected — server may not support HTTP/2 or HTTP/3', true));
  }

  // --- Gzip/Brotli compression ---
  const contentEncoding = (headers['content-encoding'] || '').toLowerCase();
  if (contentEncoding.includes('br')) {
    checks.push(check('Compression', true, 'Brotli compression enabled (optimal)'));
  } else if (contentEncoding.includes('gzip')) {
    checks.push(check('Compression', true, 'Gzip compression enabled'));
  } else if (contentEncoding.includes('deflate')) {
    checks.push(check('Compression', true, 'Deflate compression enabled', true));
  } else {
    checks.push(check('Compression', false, 'No content-encoding header — response not compressed, slower page loads', true));
  }

  // --- Server header leaking ---
  const serverHeader = headers['server'] || '';
  if (!serverHeader) {
    checks.push(check('Server header', true, 'Server header not exposed (good practice)'));
  } else if (/\/[\d.]+/.test(serverHeader)) {
    // Matches patterns like "Apache/2.4.52", "nginx/1.18.0", "Microsoft-IIS/10.0"
    checks.push(check('Server header', false, `Server header leaks version info: "${serverHeader}" — hide version to reduce attack surface`, true));
  } else {
    checks.push(check('Server header', true, `Server header present without version: "${serverHeader}"`));
  }

  // --- Mixed content check ---
  const isHttps = url.startsWith('https');
  if (isHttps) {
    const mixedContentSrcs: string[] = [];
    // Check images, scripts, stylesheets, iframes, video/audio sources for http:// URLs
    $('img[src^="http://"], script[src^="http://"], link[rel="stylesheet"][href^="http://"], iframe[src^="http://"], video[src^="http://"], audio[src^="http://"], source[src^="http://"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href') || '';
      if (src) mixedContentSrcs.push(src);
    });
    if (mixedContentSrcs.length > 0) {
      checks.push(check('Mixed content', false, `${mixedContentSrcs.length} resource(s) loaded over HTTP on HTTPS page — insecure mixed content (e.g. ${mixedContentSrcs[0].substring(0, 60)})`));
    } else {
      checks.push(check('Mixed content', true, 'No mixed content detected — all resources loaded securely'));
    }
  }

  // --- JavaScript rendering dependency ---
  const noscriptContent = $('noscript').text().trim();
  const scriptTags = $('script').length;
  // Get text content outside script tags by cloning, removing scripts, then extracting text
  const $clone = cheerio.load(html);
  $clone('script, style, noscript').remove();
  const bodyText = $clone('body').text().replace(/\s+/g, ' ').trim();
  const bodyTextLength = bodyText.length;
  const htmlLength = html.length;
  const textRatio = htmlLength > 0 ? bodyTextLength / htmlLength : 0;

  if (noscriptContent.length > 50) {
    checks.push(check('JavaScript dependency', true, `<noscript> fallback content provided (${noscriptContent.length} chars) — good for crawlers`));
  } else if (textRatio < 0.05 && scriptTags > 3) {
    checks.push(check('JavaScript dependency', false, `Very low text-to-HTML ratio (${(textRatio * 100).toFixed(1)}%) with ${scriptTags} script tags — page likely relies on JS rendering, poor for SEO crawling`, true));
  } else if (textRatio < 0.10 && scriptTags > 5) {
    checks.push(check('JavaScript dependency', false, `Low text-to-HTML ratio (${(textRatio * 100).toFixed(1)}%) with ${scriptTags} script tags — may depend on client-side rendering`, true));
  } else {
    checks.push(check('JavaScript dependency', true, `Text-to-HTML ratio: ${(textRatio * 100).toFixed(1)}% — content appears server-rendered`));
  }

  // --- DNS prefetch / preconnect ---
  const dnsPrefetch = $('link[rel="dns-prefetch"]').length;
  const preconnect = $('link[rel="preconnect"]').length;
  if (dnsPrefetch > 0 || preconnect > 0) {
    const parts: string[] = [];
    if (preconnect > 0) parts.push(`${preconnect} preconnect`);
    if (dnsPrefetch > 0) parts.push(`${dnsPrefetch} dns-prefetch`);
    checks.push(check('DNS prefetch/preconnect', true, `Performance hints found: ${parts.join(', ')}`));
  } else {
    checks.push(check('DNS prefetch/preconnect', false, 'No <link rel="dns-prefetch"> or <link rel="preconnect"> — add hints for third-party domains to speed up loading', true));
  }

  // --- Mobile-friendly signals ---
  const themeColor = $('meta[name="theme-color"]').attr('content');
  const touchIcon = $('link[rel="apple-touch-icon"]').length > 0;
  // Check for proper text sizing (text-size-adjust in viewport or CSS)
  const hasTextSizeAdjust = viewport ? /text-size-adjust/i.test(html) : false;

  const mobileSignals: string[] = [];
  const missingMobileSignals: string[] = [];

  if (themeColor) {
    mobileSignals.push(`theme-color: ${themeColor}`);
  } else {
    missingMobileSignals.push('theme-color');
  }
  if (touchIcon) {
    mobileSignals.push('apple-touch-icon');
  } else {
    missingMobileSignals.push('apple-touch-icon');
  }
  if (hasTextSizeAdjust) {
    mobileSignals.push('text-size-adjust');
  }

  if (missingMobileSignals.length === 0) {
    checks.push(check('Mobile-friendly signals', true, `Mobile enhancements present: ${mobileSignals.join(', ')}`));
  } else if (mobileSignals.length > 0) {
    checks.push(check('Mobile-friendly signals', false, `Missing mobile signals: ${missingMobileSignals.join(', ')} (has: ${mobileSignals.join(', ')})`, true));
  } else {
    checks.push(check('Mobile-friendly signals', false, `Missing mobile signals: ${missingMobileSignals.join(', ')} — no theme-color or touch icons for mobile browsers`, true));
  }

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks };
}
