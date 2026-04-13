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

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks };
}
