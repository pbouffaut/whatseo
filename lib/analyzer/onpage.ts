import * as cheerio from 'cheerio';
import { Check, OnPageResult } from './types';

export function analyzeOnPage(html: string, url: string): OnPageResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];

  const title = $('title').first().text().trim() || null;
  const titleLen = title?.length || 0;
  checks.push({ name: 'Title tag present', status: title ? 'pass' : 'fail', message: title ? `Title: "${title}"` : 'No title tag found' });
  checks.push({ name: 'Title length', status: titleLen >= 30 && titleLen <= 60 ? 'pass' : titleLen > 0 ? 'warn' : 'fail', message: `Title is ${titleLen} characters (ideal: 30-60)`, value: titleLen });

  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  const descLen = metaDescription?.length || 0;
  checks.push({ name: 'Meta description', status: metaDescription ? 'pass' : 'fail', message: metaDescription ? `Description: ${descLen} chars` : 'No meta description' });
  checks.push({ name: 'Description length', status: descLen >= 120 && descLen <= 155 ? 'pass' : descLen > 0 ? 'warn' : 'fail', message: `Description is ${descLen} characters (ideal: 120-155)`, value: descLen });

  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  checks.push({ name: 'H1 tag count', status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn', message: `${h1s.length} H1 tag(s) found (ideal: exactly 1)`, value: h1s.length });
  checks.push({ name: 'H1 not empty', status: h1s.length > 0 && h1s[0].length > 0 ? 'pass' : 'fail', message: h1s.length > 0 ? `H1: "${h1s[0]}"` : 'No H1 content' });

  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 5);
  checks.push({ name: 'H2 tags present', status: h2s.length >= 2 ? 'pass' : h2s.length > 0 ? 'warn' : 'fail', message: `${h2s.length} H2 tag(s) found`, value: h2s.length });

  const links = $('a[href]');
  let internal = 0, external = 0;
  const hostname = new URL(url).hostname;
  links.each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('/') || href.includes(hostname)) internal++;
    else if (href.startsWith('http')) external++;
  });
  checks.push({ name: 'Internal links', status: internal >= 5 ? 'pass' : internal >= 1 ? 'warn' : 'fail', message: `${internal} internal links`, value: internal });

  const ogTitle = $('meta[property="og:title"]').attr('content');
  checks.push({ name: 'Open Graph title', status: ogTitle ? 'pass' : 'fail', message: ogTitle ? 'OG title present' : 'No og:title tag' });

  const ogImage = $('meta[property="og:image"]').attr('content');
  checks.push({ name: 'Open Graph image', status: ogImage ? 'pass' : 'fail', message: ogImage ? 'OG image present' : 'No og:image tag' });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, title, metaDescription, h1s, h2s, internalLinks: internal, externalLinks: external };
}
