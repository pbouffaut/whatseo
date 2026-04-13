import * as cheerio from 'cheerio';
import { Check, OnPageResult } from './types';

export function analyzeOnPage(html: string, url: string): OnPageResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];

  // --- Title Tag ---
  const title = $('title').first().text().trim() || null;
  const titleLen = title?.length || 0;
  checks.push({ name: 'Title tag present', status: title ? 'pass' : 'fail', message: title ? `Title: "${title}"` : 'No title tag found' });
  checks.push({ name: 'Title length', status: titleLen >= 30 && titleLen <= 60 ? 'pass' : titleLen > 0 ? 'warn' : 'fail', message: `Title is ${titleLen} characters (ideal: 30-60)`, value: titleLen });

  // Title uniqueness signal — check if title looks generic/template-like
  const titleGeneric = title && (
    /^home$/i.test(title) ||
    /untitled/i.test(title) ||
    /page \d/i.test(title) ||
    /^\s*$/.test(title)
  );
  if (title) {
    checks.push({ name: 'Title quality', status: titleGeneric ? 'fail' : 'pass', message: titleGeneric ? 'Title appears generic or template-like' : 'Title is descriptive' });
  }

  // --- Meta Description ---
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  const descLen = metaDescription?.length || 0;
  checks.push({ name: 'Meta description', status: metaDescription ? 'pass' : 'fail', message: metaDescription ? `Description: ${descLen} chars` : 'No meta description' });
  checks.push({ name: 'Description length', status: descLen >= 120 && descLen <= 155 ? 'pass' : descLen > 0 ? 'warn' : 'fail', message: `Description is ${descLen} characters (ideal: 120-155)`, value: descLen });

  // --- Heading Hierarchy ---
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  checks.push({ name: 'H1 tag count', status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn', message: `${h1s.length} H1 tag(s) found (ideal: exactly 1)`, value: h1s.length });
  checks.push({ name: 'H1 not empty', status: h1s.length > 0 && h1s[0].length > 0 ? 'pass' : 'fail', message: h1s.length > 0 ? `H1: "${h1s[0]}"` : 'No H1 content' });

  // H1 text quality — check for broken rendering (common SSR bug)
  if (h1s.length > 0) {
    const h1Text = h1s[0];
    const h1Broken = /icon|menu|button|toggle|hamburger/i.test(h1Text) || h1Text.length < 3;
    const h1NoSpaces = h1Text.length > 15 && !/\s/.test(h1Text); // "Thebestworkplace" with no spaces
    if (h1Broken) {
      checks.push({ name: 'H1 quality', status: 'fail', message: `H1 appears broken: "${h1Text.substring(0, 50)}"` });
    } else if (h1NoSpaces) {
      checks.push({ name: 'H1 quality', status: 'warn', message: `H1 may have spacing issue: "${h1Text.substring(0, 50)}"` });
    }
  }

  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 5);
  checks.push({ name: 'H2 tags present', status: h2s.length >= 2 ? 'pass' : h2s.length > 0 ? 'warn' : 'fail', message: `${h2s.length} H2 tag(s) found`, value: h2s.length });

  // Check heading hierarchy — H2 should come after H1, not H3 before H2
  const allHeadings = $('h1, h2, h3, h4, h5, h6').map((_, el) => parseInt(el.tagName.replace('h', ''))).get();
  let hierarchyBroken = false;
  for (let i = 1; i < allHeadings.length; i++) {
    if (allHeadings[i] > allHeadings[i - 1] + 1) {
      hierarchyBroken = true;
      break;
    }
  }
  checks.push({ name: 'Heading hierarchy', status: hierarchyBroken ? 'warn' : 'pass', message: hierarchyBroken ? 'Heading levels skip (e.g., H1 → H3) — poor document structure' : 'Heading hierarchy is well-structured' });

  // --- Internal & External Links ---
  const links = $('a[href]');
  let internal = 0, external = 0;
  const hostname = new URL(url).hostname;
  links.each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('/') || href.includes(hostname)) internal++;
    else if (href.startsWith('http')) external++;
  });
  checks.push({ name: 'Internal links', status: internal >= 10 ? 'pass' : internal >= 3 ? 'warn' : 'fail', message: `${internal} internal links (target: 10+)`, value: internal });
  checks.push({ name: 'External links', status: external >= 1 ? 'pass' : 'warn', message: external > 0 ? `${external} external links (good for authority signals)` : 'No external links — add references to authoritative sources', value: external });

  // --- Anchor text quality ---
  const genericAnchors = ['click here', 'read more', 'learn more', 'here', 'link', 'more'];
  let genericAnchorCount = 0;
  links.each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (genericAnchors.includes(text)) genericAnchorCount++;
  });
  if (links.length > 0) {
    const genericPct = genericAnchorCount / links.length;
    checks.push({ name: 'Anchor text quality', status: genericPct < 0.1 ? 'pass' : genericPct < 0.3 ? 'warn' : 'fail', message: `${genericAnchorCount} generic anchor texts ("click here", "read more") out of ${links.length} links` });
  }

  // --- Open Graph ---
  const ogTitle = $('meta[property="og:title"]').attr('content');
  checks.push({ name: 'Open Graph title', status: ogTitle ? 'pass' : 'fail', message: ogTitle ? 'OG title present' : 'No og:title tag — poor social sharing preview' });

  const ogImage = $('meta[property="og:image"]').attr('content');
  checks.push({ name: 'Open Graph image', status: ogImage ? 'pass' : 'fail', message: ogImage ? 'OG image present' : 'No og:image tag — no image when shared on social media' });

  const ogDescription = $('meta[property="og:description"]').attr('content');
  checks.push({ name: 'Open Graph description', status: ogDescription ? 'pass' : 'fail', message: ogDescription ? 'OG description present' : 'No og:description — generic text when shared on social media' });

  // --- Structured content signals ---
  const hasTables = $('table').length > 0;
  const hasLists = $('ul, ol').length > 0;
  const hasDefinitions = $('dl').length > 0;
  const structuredContent = hasTables || hasLists || hasDefinitions;
  checks.push({ name: 'Structured content', status: structuredContent ? 'pass' : 'warn', message: structuredContent ? 'Page uses structured content elements (lists, tables)' : 'No structured content — add lists/tables for better readability and AI parsing' });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, title, metaDescription, h1s, h2s, internalLinks: internal, externalLinks: external };
}
