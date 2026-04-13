import { Check } from './types';
import { resolve } from 'dns/promises';

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

export interface BacklinksResult {
  score: number;
  checks: Check[];
  referringDomains: number | null;
  domainAuthority: number | null;
  backlinks: number | null;
  source: 'moz' | 'commoncrawl' | 'dns_only';
}

// ---------------------------------------------------------------------------
// Moz Free API
// ---------------------------------------------------------------------------

interface MozData {
  referringDomains: number;
  domainAuthority: number;
  backlinks: number;
}

async function fetchMoz(domain: string): Promise<MozData | null> {
  const apiKey = process.env.MOZ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://lsapi.seomoz.com/v2/url_metrics', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`mozscape-${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targets: [domain] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = Array.isArray(data.results) ? data.results[0] : data;
    return {
      referringDomains: result.root_domains_to_root_domain ?? 0,
      domainAuthority: result.domain_authority ?? 0,
      backlinks: result.external_links_to_root_domain ?? 0,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Common Crawl (free, no API key)
// ---------------------------------------------------------------------------

interface CommonCrawlEntry {
  url: string;
  [key: string]: unknown;
}

async function fetchCommonCrawl(domain: string): Promise<{ referringDomains: number; backlinks: number } | null> {
  try {
    const ccUrl = `https://index.commoncrawl.org/CC-MAIN-2025-13-index?url=*.${domain}&output=json&limit=100`;
    const res = await fetch(ccUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'WhatSEO/1.0' },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

    const uniqueDomains = new Set<string>();
    let totalBacklinks = 0;

    for (const line of lines) {
      try {
        const entry: CommonCrawlEntry = JSON.parse(line);
        if (entry.url) {
          totalBacklinks++;
          const hostname = new URL(entry.url).hostname.replace(/^www\./, '');
          if (hostname !== domain.replace(/^www\./, '')) {
            uniqueDomains.add(hostname);
          }
        }
      } catch {
        // skip malformed lines
      }
    }

    return {
      referringDomains: uniqueDomains.size,
      backlinks: totalBacklinks,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DNS signals fallback
// ---------------------------------------------------------------------------

async function checkDnsRecord(hostname: string): Promise<boolean> {
  try {
    const records = await resolve(hostname, 'TXT');
    return records.length > 0;
  } catch {
    return false;
  }
}

async function fetchRdap(domain: string): Promise<{ registered: boolean; age?: string } | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/rdap+json' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    // Look for the registration event
    const events: { eventAction: string; eventDate: string }[] = data.events ?? [];
    const registration = events.find(e => e.eventAction === 'registration');
    if (registration) {
      return { registered: true, age: registration.eventDate };
    }
    return { registered: true };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

export async function analyzeBacklinks(domain: string): Promise<BacklinksResult> {
  // Strip protocol and www if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const checks: Check[] = [];

  // Try Moz first
  const moz = await fetchMoz(cleanDomain);
  if (moz) {
    // Check 1: Referring domains count
    const rdCount = moz.referringDomains;
    checks.push(check(
      'Referring domains count',
      rdCount > 100,
      rdCount > 100
        ? `${rdCount} referring domains — strong backlink profile`
        : rdCount > 20
          ? `${rdCount} referring domains — moderate backlink profile`
          : `${rdCount} referring domains — weak backlink profile, link building needed`,
      rdCount > 20 && rdCount <= 100,
    ));

    // Check 2: Domain authority (Moz only)
    const da = moz.domainAuthority;
    checks.push(check(
      'Domain authority',
      da > 40,
      da > 40
        ? `Domain Authority ${da} — strong domain`
        : da > 20
          ? `Domain Authority ${da} — moderate, room for improvement`
          : `Domain Authority ${da} — low authority, needs link building`,
      da > 20 && da <= 40,
    ));

    // Check 3: Backlink diversity
    const ratio = moz.backlinks > 0 ? moz.referringDomains / moz.backlinks : 0;
    checks.push(check(
      'Backlink diversity',
      ratio > 0.3,
      ratio > 0.3
        ? `Diversity ratio ${ratio.toFixed(2)} — healthy link distribution`
        : `Diversity ratio ${ratio.toFixed(2)} — too many links from few domains`,
      ratio > 0.15 && ratio <= 0.3,
    ));

    // Check 4 & 5: DNS signals (always check these)
    const [hasDmarc, hasSpf] = await Promise.all([
      checkDnsRecord(`_dmarc.${cleanDomain}`),
      checkDnsRecord(cleanDomain), // SPF is a TXT record on the root domain
    ]);

    checks.push(check(
      'DMARC record',
      hasDmarc,
      hasDmarc ? 'DMARC record found — domain trust signal present' : 'No DMARC record — missing domain trust signal',
    ));

    checks.push(check(
      'SPF record',
      hasSpf,
      hasSpf ? 'SPF record found — legitimate domain signal' : 'No SPF record found',
      !hasSpf,
    ));

    const score = Math.round(
      checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100,
    );

    return {
      score,
      checks,
      referringDomains: moz.referringDomains,
      domainAuthority: moz.domainAuthority,
      backlinks: moz.backlinks,
      source: 'moz',
    };
  }

  // Try Common Crawl
  const cc = await fetchCommonCrawl(cleanDomain);
  if (cc) {
    // Check 1: Referring domains count
    const rdCount = cc.referringDomains;
    checks.push(check(
      'Referring domains count',
      rdCount > 100,
      rdCount > 100
        ? `${rdCount} referring domains found via Common Crawl — strong backlink profile`
        : rdCount > 20
          ? `${rdCount} referring domains found via Common Crawl — moderate backlink profile`
          : `${rdCount} referring domains found via Common Crawl — limited backlink data (sample only)`,
      rdCount > 20 && rdCount <= 100,
    ));

    // Check 2: Domain authority — skip (Moz only)

    // Check 3: Backlink diversity
    const ratio = cc.backlinks > 0 ? cc.referringDomains / cc.backlinks : 0;
    checks.push(check(
      'Backlink diversity',
      ratio > 0.3,
      ratio > 0.3
        ? `Diversity ratio ${ratio.toFixed(2)} — healthy link distribution`
        : `Diversity ratio ${ratio.toFixed(2)} — concentrated link sources`,
      ratio > 0.15 && ratio <= 0.3,
    ));

    // Check 4 & 5: DNS signals
    const [hasDmarc, hasSpf] = await Promise.all([
      checkDnsRecord(`_dmarc.${cleanDomain}`),
      checkDnsRecord(cleanDomain),
    ]);

    checks.push(check(
      'DMARC record',
      hasDmarc,
      hasDmarc ? 'DMARC record found — domain trust signal present' : 'No DMARC record — missing domain trust signal',
    ));

    checks.push(check(
      'SPF record',
      hasSpf,
      hasSpf ? 'SPF record found — legitimate domain signal' : 'No SPF record found',
      !hasSpf,
    ));

    const score = Math.round(
      checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100,
    );

    return {
      score,
      checks,
      referringDomains: cc.referringDomains,
      domainAuthority: null,
      backlinks: cc.backlinks,
      source: 'commoncrawl',
    };
  }

  // DNS-only fallback
  const [hasDmarc, hasSpf, rdap] = await Promise.all([
    checkDnsRecord(`_dmarc.${cleanDomain}`),
    checkDnsRecord(cleanDomain),
    fetchRdap(cleanDomain),
  ]);

  // Check 1: Referring domains — no data
  checks.push(check(
    'Referring domains count',
    false,
    'Could not retrieve backlink data — no API key configured and Common Crawl unavailable',
  ));

  // Check 4: DMARC
  checks.push(check(
    'DMARC record',
    hasDmarc,
    hasDmarc ? 'DMARC record found — domain trust signal present' : 'No DMARC record — missing domain trust signal',
  ));

  // Check 5: SPF
  checks.push(check(
    'SPF record',
    hasSpf,
    hasSpf ? 'SPF record found — legitimate domain signal' : 'No SPF record found',
    !hasSpf,
  ));

  // Bonus: Domain age from RDAP
  if (rdap?.age) {
    const regDate = new Date(rdap.age);
    const ageYears = (Date.now() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    checks.push(check(
      'Domain age',
      ageYears > 2,
      ageYears > 2
        ? `Domain registered ${regDate.toISOString().split('T')[0]} (${Math.round(ageYears)} years) — established domain`
        : `Domain registered ${regDate.toISOString().split('T')[0]} (${Math.round(ageYears * 10) / 10} years) — relatively new`,
      ageYears > 1 && ageYears <= 2,
    ));
  } else if (rdap?.registered) {
    checks.push(check(
      'Domain age',
      true,
      'Domain is registered (RDAP confirmed) but registration date not available',
      true,
    ));
  }

  const score = Math.round(
    checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100,
  );

  return {
    score,
    checks,
    referringDomains: null,
    domainAuthority: null,
    backlinks: null,
    source: 'dns_only',
  };
}
