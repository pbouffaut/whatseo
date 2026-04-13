import * as cheerio from 'cheerio';
import { Check, AIReadinessResult } from './types';

export async function analyzeAIReadiness(html: string, url: string): Promise<AIReadinessResult> {
  const $ = cheerio.load(html);
  const checks: Check[] = [];
  const origin = new URL(url).origin;

  // --- Existing checks ---

  // Check llms.txt
  let hasLlmsTxt = false;
  let llmsTxtBody = '';
  try {
    const r = await fetch(`${origin}/llms.txt`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    const ct = r.headers.get('content-type') || '';
    if (r.ok) {
      llmsTxtBody = await r.text();
      hasLlmsTxt = ct.includes('text/plain') || (!llmsTxtBody.includes('<!DOCTYPE') && !llmsTxtBody.includes('<html'));
    }
  } catch { /* ignore */ }
  checks.push({ name: 'llms.txt', status: hasLlmsTxt ? 'pass' : 'fail', message: hasLlmsTxt ? 'llms.txt found and serves plain text' : 'No llms.txt file found' });

  // llms.txt content quality (new)
  if (hasLlmsTxt) {
    const isHtml = llmsTxtBody.includes('<!DOCTYPE') || llmsTxtBody.includes('<html');
    const meaningful = llmsTxtBody.trim().length > 50;
    checks.push({
      name: 'llms.txt content quality',
      status: !isHtml && meaningful ? 'pass' : !isHtml ? 'warn' : 'fail',
      message: isHtml
        ? 'llms.txt returns HTML instead of plain text'
        : meaningful
          ? `llms.txt has meaningful content (${llmsTxtBody.trim().length} chars)`
          : `llms.txt is too short (${llmsTxtBody.trim().length} chars, need >50)`,
    });
  } else {
    checks.push({ name: 'llms.txt content quality', status: 'fail', message: 'No llms.txt to evaluate' });
  }

  // Check robots.txt for AI crawlers
  let robotsTxt = '';
  try {
    const r = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    if (r.ok) robotsTxt = await r.text();
  } catch { /* ignore */ }
  checks.push({ name: 'Robots.txt exists', status: robotsTxt.length > 0 ? 'pass' : 'fail', message: robotsTxt.length > 0 ? 'robots.txt accessible' : 'No robots.txt found' });

  const blocksGPT = /User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//im.test(robotsTxt);
  checks.push({ name: 'GPTBot not blocked', status: !blocksGPT ? 'pass' : 'fail', message: blocksGPT ? 'GPTBot is blocked in robots.txt' : 'GPTBot is not blocked' });

  const blocksClaude = /User-agent:\s*(ClaudeBot|Anthropic)[\s\S]*?Disallow:\s*\//im.test(robotsTxt);
  checks.push({ name: 'ClaudeBot not blocked', status: !blocksClaude ? 'pass' : 'fail', message: blocksClaude ? 'ClaudeBot is blocked in robots.txt' : 'ClaudeBot is not blocked' });

  const hasSchema = $('script[type="application/ld+json"]').length > 0;
  checks.push({ name: 'Schema for AI', status: hasSchema ? 'pass' : 'fail', message: hasSchema ? 'JSON-LD helps AI understand content' : 'No structured data for AI systems' });

  const hasFaq = $('[itemtype*="FAQ"], [class*="faq"], details, summary').length > 0 || /frequently asked|FAQ/i.test(html);
  checks.push({ name: 'FAQ content', status: hasFaq ? 'pass' : 'warn', message: hasFaq ? 'FAQ or Q&A content detected' : 'No FAQ content found' });

  const hasTables = $('table, dl, ol').length > 0;
  checks.push({ name: 'Structured content', status: hasTables ? 'pass' : 'warn', message: hasTables ? 'Structured content found (tables, lists, definitions)' : 'No structured content detected' });

  // --- New checks ---

  // AI plugin manifest
  let hasAiPlugin = false;
  try {
    const r = await fetch(`${origin}/.well-known/ai-plugin.json`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    hasAiPlugin = r.ok && (r.headers.get('content-type') || '').includes('json');
    if (r.ok && !hasAiPlugin) {
      const body = await r.text();
      try { JSON.parse(body); hasAiPlugin = true; } catch { /* not valid JSON */ }
    }
  } catch { /* ignore */ }
  checks.push({
    name: 'AI plugin manifest',
    status: hasAiPlugin ? 'pass' : 'warn',
    message: hasAiPlugin
      ? 'ai-plugin.json found at /.well-known/ai-plugin.json'
      : 'No ai-plugin.json manifest (optional for ChatGPT plugin support)',
  });

  // Bing IndexNow
  let hasIndexNow = false;
  try {
    const r = await fetch(`${origin}/IndexNow`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    hasIndexNow = r.ok;
  } catch { /* ignore */ }
  if (!hasIndexNow) {
    // Also check common IndexNow key file patterns
    try {
      const r = await fetch(`${origin}/indexnow-key.txt`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
      hasIndexNow = r.ok;
    } catch { /* ignore */ }
  }
  checks.push({
    name: 'Bing IndexNow',
    status: hasIndexNow ? 'pass' : 'warn',
    message: hasIndexNow
      ? 'IndexNow protocol endpoint or key file found'
      : 'No IndexNow endpoint detected (helps Bing/Yandex discover content faster)',
  });

  // Answer-ready content: details/summary, definition lists, numbered steps
  const detailsSummaryCount = $('details').length;
  const definitionListCount = $('dl').length;
  const orderedListCount = $('ol').length;
  const answerReadyElements = detailsSummaryCount + definitionListCount + orderedListCount;
  checks.push({
    name: 'Answer-ready content',
    status: answerReadyElements >= 2 ? 'pass' : answerReadyElements >= 1 ? 'warn' : 'fail',
    message: answerReadyElements > 0
      ? `${answerReadyElements} answer-ready element(s): ${detailsSummaryCount} <details>, ${definitionListCount} <dl>, ${orderedListCount} <ol>`
      : 'No answer-ready elements (add <details>, <dl>, or <ol> for AI-friendly formatting)',
  });

  // Citation-friendly format: blockquote, cite, references section
  const blockquoteCount = $('blockquote').length;
  const citeCount = $('cite').length;
  const hasReferencesSection = $('h2, h3, h4').filter((_, el) => /references|sources|citations|bibliography/i.test($(el).text())).length > 0;
  const citationElements = blockquoteCount + citeCount + (hasReferencesSection ? 1 : 0);
  checks.push({
    name: 'Citation-friendly format',
    status: citationElements >= 2 ? 'pass' : citationElements >= 1 ? 'warn' : 'fail',
    message: citationElements > 0
      ? `Citation elements found: ${blockquoteCount} <blockquote>, ${citeCount} <cite>${hasReferencesSection ? ', references section' : ''}`
      : 'No citation-friendly elements (add blockquote, cite, or a references section)',
  });

  // Content structure for AI: heading density (at least 1 heading per 300 words)
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const bodyWordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  if (bodyWordCount >= 100) {
    const wordsPerHeading = headingCount > 0 ? Math.round(bodyWordCount / headingCount) : Infinity;
    checks.push({
      name: 'Content structure for AI',
      status: wordsPerHeading <= 300 ? 'pass' : wordsPerHeading <= 500 ? 'warn' : 'fail',
      message: headingCount > 0
        ? `${headingCount} heading(s) across ${bodyWordCount} words (~${wordsPerHeading} words/heading; ideal: <=300)`
        : `${bodyWordCount} words with no headings (add headings every ~300 words for AI readability)`,
    });
  } else {
    checks.push({ name: 'Content structure for AI', status: 'warn', message: 'Content too short to evaluate heading density' });
  }

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks };
}
