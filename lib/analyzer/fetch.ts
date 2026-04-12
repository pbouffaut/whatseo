import { FetchResult, CrawledPage } from './types';

export async function fetchPage(url: string): Promise<FetchResult> {
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const redirectChain: string[] = [];
  let currentUrl = normalizedUrl;
  let response: Response | null = null;
  const start = Date.now();

  for (let i = 0; i < 5; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'WhatSEO/1.0 (https://whatseo.ai)' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      redirectChain.push(currentUrl);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    break;
  }

  const responseTime = Date.now() - start;

  if (!response) {
    throw new Error(`Failed to fetch ${normalizedUrl}`);
  }

  const html = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => { headers[k] = v; });

  return {
    html,
    finalUrl: currentUrl,
    statusCode: response.status,
    headers,
    redirectChain,
    responseTime,
  };
}

/** Non-throwing variant for the crawler — returns errors as data */
export async function fetchPageSafe(
  url: string,
  depth: number,
  source: CrawledPage['source'],
  timeoutMs = 10000
): Promise<CrawledPage> {
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

  const redirectChain: string[] = [];
  let currentUrl = normalizedUrl;
  let response: Response | null = null;
  const start = Date.now();

  try {
    for (let i = 0; i < 3; i++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'WhatSEO/1.0 (https://whatseo.ai)' },
        });
      } finally {
        clearTimeout(timeout);
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;
        redirectChain.push(currentUrl);
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      break;
    }

    if (!response) throw new Error('No response');

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    return {
      url: normalizedUrl,
      finalUrl: currentUrl,
      html,
      statusCode: response.status,
      headers,
      redirectChain,
      responseTime: Date.now() - start,
      depth,
      source,
    };
  } catch (err) {
    return {
      url: normalizedUrl,
      finalUrl: currentUrl,
      html: '',
      statusCode: 0,
      headers: {},
      redirectChain,
      responseTime: Date.now() - start,
      depth,
      source,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
