const INDEXED_STATES = new Set([
  'Submitted and indexed',
  'Indexed, not submitted in sitemap',
]);

/**
 * Batch-checks up to 20 URLs against the GSC URL Inspection API.
 * Returns indexed vs not-indexed breakdown.
 */
export async function checkIndexCoverage(params: {
  siteUrl: string;
  urlsToCheck: string[];
  accessToken: string;
}): Promise<{
  indexed: string[];
  notIndexed: string[];
  errors: string[];
}> {
  const { siteUrl, urlsToCheck, accessToken } = params;

  const urls = urlsToCheck.slice(0, 20);

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(
          'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inspectionUrl: url, siteUrl }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!res.ok) {
          console.error(`GSC URL inspection failed for ${url}: ${res.status}`);
          return { url, status: 'error' as const };
        }

        const data = await res.json() as {
          inspectionResult?: {
            indexStatusResult?: {
              coverageState?: string;
            };
          };
        };

        const coverageState = data?.inspectionResult?.indexStatusResult?.coverageState ?? '';

        if (INDEXED_STATES.has(coverageState)) {
          return { url, status: 'indexed' as const };
        } else {
          return { url, status: 'notIndexed' as const };
        }
      } catch (err) {
        console.error(`GSC URL inspection threw for ${url}:`, err);
        return { url, status: 'error' as const };
      }
    })
  );

  const indexed: string[] = [];
  const notIndexed: string[] = [];
  const errors: string[] = [];

  for (const r of results) {
    if (r.status === 'indexed') indexed.push(r.url);
    else if (r.status === 'notIndexed') notIndexed.push(r.url);
    else errors.push(r.url);
  }

  return { indexed, notIndexed, errors };
}

/**
 * Best-effort submission of URLs to the Google Indexing API v3.
 * Processes up to 10 URLs and silently ignores failures.
 */
export async function submitUrlsForIndexing(
  urls: string[],
  accessToken: string
): Promise<void> {
  const batch = urls.slice(0, 10);

  await Promise.all(
    batch.map(async (url) => {
      try {
        await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, type: 'URL_UPDATED' }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        // Best-effort — ignore errors
      }
    })
  );
}
