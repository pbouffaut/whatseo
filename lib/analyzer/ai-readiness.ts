import * as cheerio from 'cheerio';
import { Check, AIReadinessResult } from './types';

export async function analyzeAIReadiness(html: string, url: string): Promise<AIReadinessResult> {
  const $ = cheerio.load(html);
  const checks: Check[] = [];
  const origin = new URL(url).origin;

  // Check llms.txt
  let hasLlmsTxt = false;
  try {
    const r = await fetch(`${origin}/llms.txt`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'WhatSEO/1.0' } });
    const ct = r.headers.get('content-type') || '';
    hasLlmsTxt = r.ok && ct.includes('text/plain');
    if (r.ok && !ct.includes('text/plain')) {
      const body = await r.text();
      hasLlmsTxt = !body.includes('<!DOCTYPE') && !body.includes('<html');
    }
  } catch { /* ignore */ }
  checks.push({ name: 'llms.txt', status: hasLlmsTxt ? 'pass' : 'fail', message: hasLlmsTxt ? 'llms.txt found and serves plain text' : 'No llms.txt file found' });

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

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks };
}
