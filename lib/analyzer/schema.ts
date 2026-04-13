import * as cheerio from 'cheerio';
import { Check, SchemaResult } from './types';

export function analyzeSchema(html: string): SchemaResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];
  const schemasFound: string[] = [];
  let jsonLdBlocks = 0;
  let parseErrors = 0;

  // Collect all parsed JSON-LD data for deeper validation
  const parsedSchemas: Record<string, Record<string, unknown>[]> = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLdBlocks++;
    try {
      const data = JSON.parse($(el).html() || '');
      const extract = (d: Record<string, unknown>) => {
        if (d['@type']) {
          const types = Array.isArray(d['@type']) ? d['@type'] : [d['@type']];
          types.forEach((t) => {
            const typeName = String(t);
            if (!schemasFound.includes(typeName)) schemasFound.push(typeName);
            if (!parsedSchemas[typeName]) parsedSchemas[typeName] = [];
            parsedSchemas[typeName].push(d);
          });
        }
        if (d['@graph'] && Array.isArray(d['@graph'])) {
          d['@graph'].forEach((item: Record<string, unknown>) => extract(item));
        }
      };
      if (Array.isArray(data)) data.forEach(extract); else extract(data);
    } catch { parseErrors++; }
  });

  // --- Existing checks ---

  checks.push({ name: 'JSON-LD present', status: jsonLdBlocks > 0 ? 'pass' : 'fail', message: jsonLdBlocks > 0 ? `${jsonLdBlocks} JSON-LD block(s)` : 'No JSON-LD structured data' });
  checks.push({ name: 'Organization schema', status: schemasFound.includes('Organization') ? 'pass' : 'fail', message: schemasFound.includes('Organization') ? 'Organization schema found' : 'No Organization schema' });
  checks.push({ name: 'BreadcrumbList', status: schemasFound.includes('BreadcrumbList') ? 'pass' : 'fail', message: schemasFound.includes('BreadcrumbList') ? 'BreadcrumbList found' : 'No BreadcrumbList schema' });
  checks.push({ name: 'Multiple schema types', status: schemasFound.length >= 3 ? 'pass' : schemasFound.length >= 1 ? 'warn' : 'fail', message: `${schemasFound.length} schema type(s): ${schemasFound.join(', ') || 'none'}` });
  checks.push({ name: 'Valid JSON-LD', status: parseErrors === 0 && jsonLdBlocks > 0 ? 'pass' : parseErrors > 0 ? 'fail' : 'warn', message: parseErrors > 0 ? `${parseErrors} JSON-LD parse error(s)` : 'All JSON-LD blocks valid' });

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  checks.push({ name: 'Open Graph fallback', status: ogTitle && ogDesc ? 'pass' : ogTitle || ogDesc ? 'warn' : 'fail', message: ogTitle ? 'OG tags present as fallback structured data' : 'No OG tags for fallback' });

  // --- New checks ---

  // LocalBusiness schema
  const localBusinessTypes = ['LocalBusiness', 'CoworkingSpace', 'Restaurant', 'Store', 'BarOrPub', 'CafeOrCoffeeShop', 'Dentist', 'AutoRepair', 'BeautySalon', 'LodgingBusiness', 'Hotel'];
  const hasLocalBusiness = localBusinessTypes.some((t) => schemasFound.includes(t));
  checks.push({ name: 'LocalBusiness schema', status: hasLocalBusiness ? 'pass' : 'warn', message: hasLocalBusiness ? `LocalBusiness type found: ${localBusinessTypes.filter((t) => schemasFound.includes(t)).join(', ')}` : 'No LocalBusiness schema (recommended for physical businesses)' });

  // FAQPage schema
  const hasFAQ = schemasFound.includes('FAQPage');
  checks.push({ name: 'FAQPage schema', status: hasFAQ ? 'pass' : 'warn', message: hasFAQ ? 'FAQPage schema found (eligible for rich results)' : 'No FAQPage schema' });

  // Article / BlogPosting schema
  const articleTypes = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'ScholarlyArticle'];
  const hasArticle = articleTypes.some((t) => schemasFound.includes(t));
  checks.push({ name: 'Article schema', status: hasArticle ? 'pass' : 'warn', message: hasArticle ? `Article type found: ${articleTypes.filter((t) => schemasFound.includes(t)).join(', ')}` : 'No Article/BlogPosting schema' });

  // Review / AggregateRating schema
  const hasReview = schemasFound.includes('Review') || schemasFound.includes('AggregateRating');
  checks.push({ name: 'Review/AggregateRating', status: hasReview ? 'pass' : 'warn', message: hasReview ? 'Review or AggregateRating schema found' : 'No Review or AggregateRating schema' });

  // Product schema
  const hasProduct = schemasFound.includes('Product');
  checks.push({ name: 'Product schema', status: hasProduct ? 'pass' : 'warn', message: hasProduct ? 'Product schema found' : 'No Product schema' });

  // Event schema
  const hasEvent = schemasFound.includes('Event');
  checks.push({ name: 'Event schema', status: hasEvent ? 'pass' : 'warn', message: hasEvent ? 'Event schema found' : 'No Event schema' });

  // WebSite schema with SearchAction (sitelinks search box)
  const hasWebSite = schemasFound.includes('WebSite');
  let hasSearchAction = false;
  if (hasWebSite && parsedSchemas['WebSite']) {
    hasSearchAction = parsedSchemas['WebSite'].some((ws) => {
      const potentialAction = ws['potentialAction'];
      if (Array.isArray(potentialAction)) {
        return potentialAction.some((a: Record<string, unknown>) => a['@type'] === 'SearchAction');
      }
      if (potentialAction && typeof potentialAction === 'object') {
        return (potentialAction as Record<string, unknown>)['@type'] === 'SearchAction';
      }
      return false;
    });
  }
  checks.push({
    name: 'WebSite + SearchAction',
    status: hasWebSite && hasSearchAction ? 'pass' : hasWebSite ? 'warn' : 'fail',
    message: hasWebSite && hasSearchAction
      ? 'WebSite schema with SearchAction found (enables sitelinks search box)'
      : hasWebSite
        ? 'WebSite schema found but no SearchAction for sitelinks search box'
        : 'No WebSite schema (add with SearchAction for sitelinks search box)',
  });

  // Schema validation depth - check required properties
  const validationIssues: string[] = [];

  if (parsedSchemas['Organization']) {
    parsedSchemas['Organization'].forEach((org) => {
      if (!org['name']) validationIssues.push('Organization missing "name"');
      if (!org['url']) validationIssues.push('Organization missing "url"');
    });
  }

  localBusinessTypes.forEach((lbType) => {
    if (parsedSchemas[lbType]) {
      parsedSchemas[lbType].forEach((lb) => {
        if (!lb['name']) validationIssues.push(`${lbType} missing "name"`);
        if (!lb['address']) validationIssues.push(`${lbType} missing "address"`);
      });
    }
  });

  if (parsedSchemas['Product']) {
    parsedSchemas['Product'].forEach((p) => {
      if (!p['name']) validationIssues.push('Product missing "name"');
      if (!p['offers'] && !p['review']) validationIssues.push('Product missing "offers" or "review"');
    });
  }

  if (parsedSchemas['Event']) {
    parsedSchemas['Event'].forEach((e) => {
      if (!e['name'] && !e['summary']) validationIssues.push('Event missing "name"');
      if (!e['startDate']) validationIssues.push('Event missing "startDate"');
    });
  }

  articleTypes.forEach((aType) => {
    if (parsedSchemas[aType]) {
      parsedSchemas[aType].forEach((a) => {
        if (!a['headline'] && !a['name']) validationIssues.push(`${aType} missing "headline"`);
        if (!a['author']) validationIssues.push(`${aType} missing "author"`);
      });
    }
  });

  const schemasWithRequiredProps = ['Organization', ...localBusinessTypes, 'Product', 'Event', ...articleTypes].filter(
    (t) => parsedSchemas[t] && parsedSchemas[t].length > 0
  );
  checks.push({
    name: 'Schema validation depth',
    status: schemasWithRequiredProps.length === 0
      ? 'warn'
      : validationIssues.length === 0
        ? 'pass'
        : 'fail',
    message: schemasWithRequiredProps.length === 0
      ? 'No schemas with required properties to validate'
      : validationIssues.length === 0
        ? `All ${schemasWithRequiredProps.length} schema type(s) have required properties`
        : `Missing required properties: ${validationIssues.join('; ')}`,
  });

  // Rich snippet eligibility
  const richSnippetEligible = hasFAQ || hasReview || hasProduct || hasEvent || hasArticle;
  checks.push({
    name: 'Rich snippet eligibility',
    status: richSnippetEligible ? 'pass' : 'fail',
    message: richSnippetEligible
      ? `Eligible for rich snippets via: ${[hasFAQ && 'FAQ', hasReview && 'Review', hasProduct && 'Product', hasEvent && 'Event', hasArticle && 'Article'].filter(Boolean).join(', ')}`
      : 'No schemas found that enable rich snippets (add FAQ, Review, Product, Event, or Article)',
  });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, schemasFound, jsonLdBlocks };
}
