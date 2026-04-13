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

  checks.push(check('X-Content-Type-Options', headers['x-content-type-options'] === 'nosniff', headers['x-content-type-options'] ? 'X-Content-Type-Options set' : 'X-Content-Type-Options missing'));
  checks.push(check('X-Frame-Options', !!headers['x-frame-options'], headers['x-frame-options'] ? 'X-Frame-Options set' : 'X-Frame-Options missing'));
  checks.push(check('Referrer-Policy', !!headers['referrer-policy'], headers['referrer-policy'] ? 'Referrer-Policy set' : 'Referrer-Policy missing'));
  checks.push(check('Content-Security-Policy', !!headers['content-security-policy'], headers['content-security-policy'] ? 'CSP header set' : 'CSP header missing'));

  const hops = redirectChain.length;
  checks.push(check('Redirect chain', hops <= 1, hops === 0 ? 'No redirects' : `${hops} redirect(s)`, hops > 1));

  const fast = responseTime < 500;
  const ok = responseTime < 1500;
  checks.push(check('Response time', fast, `${responseTime}ms`, !fast && ok));

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks };
}
