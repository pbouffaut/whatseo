import * as cheerio from 'cheerio';
import { Check } from './types';

export interface HreflangResult {
  score: number;
  checks: Check[];
  tags: { lang: string; href: string }[];
  hasXDefault: boolean;
  languages: string[];
}

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

const VALID_LANGS = new Set([
  'aa','ab','af','ak','am','an','ar','as','av','ay','az','ba','be','bg','bh','bi','bm','bn','bo','br',
  'bs','ca','ce','ch','co','cr','cs','cu','cv','cy','da','de','dv','dz','ee','el','en','eo','es','et',
  'eu','fa','ff','fi','fj','fo','fr','fy','ga','gd','gl','gn','gu','gv','ha','he','hi','ho','hr','ht',
  'hu','hy','hz','ia','id','ie','ig','ii','ik','in','io','is','it','iu','ja','jv','ka','kg','ki','kj',
  'kk','kl','km','kn','ko','kr','ks','ku','kv','kw','ky','la','lb','lg','li','ln','lo','lt','lu','lv',
  'mg','mh','mi','mk','ml','mn','mo','mr','ms','mt','my','na','nb','nd','ne','ng','nl','nn','no','nr',
  'nv','ny','oc','oj','om','or','os','pa','pi','pl','ps','pt','qu','rm','rn','ro','ru','rw','sa','sc',
  'sd','se','sg','si','sk','sl','sm','sn','so','sq','sr','ss','st','su','sv','sw','ta','te','tg','th',
  'ti','tk','tl','tn','to','tr','ts','tt','tw','ty','ug','uk','ur','uz','ve','vi','vo','wa','wo','xh',
  'yi','yo','za','zh','zu',
]);

export function analyzeHreflang(html: string, url: string): HreflangResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];

  // Extract all hreflang tags
  const tags: { lang: string; href: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr('hreflang')?.trim() || '';
    const href = $(el).attr('href')?.trim() || '';
    if (lang && href) tags.push({ lang, href });
  });

  // 1. Hreflang tags present
  checks.push(check('Hreflang tags present', tags.length > 0, tags.length > 0 ? `${tags.length} hreflang tags found` : 'No hreflang tags — single-language site or missing international SEO'));

  if (tags.length === 0) {
    return { score: Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100), checks, tags, hasXDefault: false, languages: [] };
  }

  // 2. x-default present
  const hasXDefault = tags.some(t => t.lang === 'x-default');
  checks.push(check('x-default tag', hasXDefault, hasXDefault ? 'x-default fallback tag present' : 'Missing hreflang="x-default" — no fallback for unmatched regions'));

  // 3. Self-referencing tag
  const currentUrl = url.replace(/\/$/, '');
  const selfRef = tags.some(t => t.href.replace(/\/$/, '') === currentUrl);
  checks.push(check('Self-referencing hreflang', selfRef, selfRef ? 'Current page is self-referenced in hreflang tags' : 'Current page URL not found in its own hreflang tags — required for proper implementation'));

  // 4. Valid language codes
  const invalidLangs: string[] = [];
  for (const t of tags) {
    if (t.lang === 'x-default') continue;
    const parts = t.lang.toLowerCase().split('-');
    const langCode = parts[0];
    if (!VALID_LANGS.has(langCode)) {
      invalidLangs.push(t.lang);
    }
  }
  checks.push(check('Valid language codes', invalidLangs.length === 0,
    invalidLangs.length === 0 ? 'All language codes are valid ISO 639-1' : `Invalid language codes: ${invalidLangs.join(', ')}`));

  // 5. No duplicate languages
  const langCounts = new Map<string, number>();
  for (const t of tags) {
    langCounts.set(t.lang, (langCounts.get(t.lang) || 0) + 1);
  }
  const duplicates = Array.from(langCounts.entries()).filter(([, count]) => count > 1).map(([lang]) => lang);
  checks.push(check('No duplicate languages', duplicates.length === 0,
    duplicates.length === 0 ? 'No duplicate hreflang values' : `Duplicate hreflang values: ${duplicates.join(', ')} — each language-region should appear only once`));

  // 6. Absolute URLs
  const relativeUrls = tags.filter(t => !t.href.startsWith('http'));
  checks.push(check('Absolute URLs', relativeUrls.length === 0,
    relativeUrls.length === 0 ? 'All hreflang URLs are absolute' : `${relativeUrls.length} hreflang URLs are relative — must be absolute (start with https://)`));

  // 7. Consistent protocol
  const protocols = new Set(tags.filter(t => t.href.startsWith('http')).map(t => t.href.startsWith('https') ? 'https' : 'http'));
  checks.push(check('Consistent protocol', protocols.size <= 1,
    protocols.size <= 1 ? 'All hreflang URLs use the same protocol' : 'Mixed http and https in hreflang URLs — use https consistently'));

  // 8. Return tag verification (advisory)
  checks.push(check('Return tag verification', true,
    `${tags.length} hreflang targets found — verify each target page links back with matching hreflang tags (bidirectional requirement)`, true));

  // 9. Language count
  const uniqueLangs = [...new Set(tags.map(t => t.lang).filter(l => l !== 'x-default'))];
  if (uniqueLangs.length <= 1) {
    checks.push(check('Language diversity', false,
      'Only 1 language in hreflang tags — hreflang is unnecessary for single-language sites', true));
  } else {
    checks.push(check('Language diversity', true, `${uniqueLangs.length} languages supported: ${uniqueLangs.join(', ')}`));
  }

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, tags, hasXDefault, languages: uniqueLangs };
}
