import * as cheerio from 'cheerio';
import { Check, ContentResult } from './types';

export function analyzeContent(html: string): ContentResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];

  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const level = wordCount < 100 ? 'thin' : wordCount < 300 ? 'light' : wordCount < 800 ? 'adequate' : 'thorough';
  checks.push({ name: 'Word count', status: wordCount >= 300 ? 'pass' : wordCount >= 100 ? 'warn' : 'fail', message: `${wordCount} words (${level})`, value: wordCount });

  const h2Count = $('h2').length;
  checks.push({ name: 'Content structure', status: h2Count >= 2 ? 'pass' : h2Count >= 1 ? 'warn' : 'fail', message: `${h2Count} H2 headings for content structure` });

  const hasAuthor = $('[rel="author"], [class*="author"], [itemprop="author"]').length > 0 || /\bby\s+[A-Z][a-z]+/i.test(text);
  checks.push({ name: 'Author attribution', status: hasAuthor ? 'pass' : 'fail', message: hasAuthor ? 'Author/byline detected' : 'No author attribution found' });

  const hasDate = $('time, [datetime], meta[property="article:published_time"]').length > 0;
  checks.push({ name: 'Publication date', status: hasDate ? 'pass' : 'warn', message: hasDate ? 'Publication date found' : 'No publication date detected' });

  const hasAbout = $('a[href*="/about"], a[href*="/contact"]').length > 0;
  checks.push({ name: 'About/contact link', status: hasAbout ? 'pass' : 'warn', message: hasAbout ? 'About or contact page linked' : 'No about/contact link found' });

  const hasPrivacy = $('a[href*="/privacy"], a[href*="/terms"]').length > 0;
  checks.push({ name: 'Privacy/terms link', status: hasPrivacy ? 'pass' : 'warn', message: hasPrivacy ? 'Privacy/terms page linked' : 'No privacy or terms link found' });

  const hostname = $('base').attr('href') || '';
  const extLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return !href.includes(hostname) && href.startsWith('http');
  }).length;
  checks.push({ name: 'External references', status: extLinks > 0 ? 'pass' : 'warn', message: `${extLinks} external link(s)` });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / checks.length * 100);
  return { score, checks, wordCount, readabilityLevel: level };
}
