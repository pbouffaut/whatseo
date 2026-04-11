import { FetchResult } from './types';

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
