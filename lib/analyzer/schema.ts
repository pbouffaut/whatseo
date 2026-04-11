import * as cheerio from 'cheerio';
import { Check, SchemaResult } from './types';

export function analyzeSchema(html: string): SchemaResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];
  const schemasFound: string[] = [];
  let jsonLdBlocks = 0;
  let parseErrors = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLdBlocks++;
    try {
      const data = JSON.parse($(el).html() || '');
      const extract = (d: Record<string, unknown>) => {
        if (d['@type']) {
          const types = Array.isArray(d['@type']) ? d['@type'] : [d['@type']];
          types.forEach((t) => { if (!schemasFound.includes(String(t))) schemasFound.push(String(t)); });
        }
        if (d['@graph'] && Array.isArray(d['@graph'])) {
          d['@graph'].forEach((item: Record<string, unknown>) => extract(item));
        }
      };
      if (Array.isArray(data)) data.forEach(extract); else extract(data);
    } catch { parseErrors++; }
  });

  checks.push({ name: 'JSON-LD present', status: jsonLdBlocks > 0 ? 'pass' : 'fail', message: jsonLdBlocks > 0 ? `${jsonLdBlocks} JSON-LD block(s)` : 'No JSON-LD structured data' });
  checks.push({ name: 'Organization schema', status: schemasFound.includes('Organization') ? 'pass' : 'fail', message: schemasFound.includes('Organization') ? 'Organization schema found' : 'No Organization schema' });
  checks.push({ name: 'BreadcrumbList', status: schemasFound.includes('BreadcrumbList') ? 'pass' : 'fail', message: schemasFound.includes('BreadcrumbList') ? 'BreadcrumbList found' : 'No BreadcrumbList schema' });
  checks.push({ name: 'Multiple schema types', status: schemasFound.length >= 3 ? 'pass' : schemasFound.length >= 1 ? 'warn' : 'fail', message: `${schemasFound.length} schema type(s): ${schemasFound.join(', ') || 'none'}` });
  checks.push({ name: 'Valid JSON-LD', status: parseErrors === 0 && jsonLdBlocks > 0 ? 'pass' : parseErrors > 0 ? 'fail' : 'warn', message: parseErrors > 0 ? `${parseErrors} JSON-LD parse error(s)` : 'All JSON-LD blocks valid' });

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  checks.push({ name: 'Open Graph fallback', status: ogTitle && ogDesc ? 'pass' : ogTitle || ogDesc ? 'warn' : 'fail', message: ogTitle ? 'OG tags present as fallback structured data' : 'No OG tags for fallback' });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / checks.length * 100);
  return { score, checks, schemasFound, jsonLdBlocks };
}
