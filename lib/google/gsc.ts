export interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscData {
  topQueries: GscQuery[];
  topPages: GscPage[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

export async function fetchGscData(siteUrl: string, accessToken: string): Promise<GscData | null> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Encode siteUrl for the API path
    const encodedSite = encodeURIComponent(siteUrl);

    // Top queries
    const queryRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 50,
          dataState: 'all',
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    // Top pages
    const pageRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 50,
          dataState: 'all',
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!queryRes.ok || !pageRes.ok) return null;

    const queryData = await queryRes.json();
    const pageData = await pageRes.json();

    const topQueries: GscQuery[] = (queryData.rows || []).map((r: Record<string, unknown>) => ({
      query: (r.keys as string[])[0],
      clicks: r.clicks as number,
      impressions: r.impressions as number,
      ctr: r.ctr as number,
      position: r.position as number,
    }));

    const topPages: GscPage[] = (pageData.rows || []).map((r: Record<string, unknown>) => ({
      page: (r.keys as string[])[0],
      clicks: r.clicks as number,
      impressions: r.impressions as number,
      ctr: r.ctr as number,
      position: r.position as number,
    }));

    const totalClicks = topQueries.reduce((s, q) => s + q.clicks, 0);
    const totalImpressions = topQueries.reduce((s, q) => s + q.impressions, 0);

    return {
      topQueries,
      topPages,
      totalClicks,
      totalImpressions,
      avgCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      avgPosition: topQueries.length > 0
        ? topQueries.reduce((s, q) => s + q.position, 0) / topQueries.length
        : 0,
    };
  } catch {
    return null;
  }
}
