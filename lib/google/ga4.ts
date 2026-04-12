export interface Ga4LandingPage {
  page: string;
  sessions: number;
  users: number;
  engagedSessions: number;
}

export interface Ga4Data {
  organicSessions: number;
  totalSessions: number;
  organicPercentage: number;
  engagementRate: number;
  topLandingPages: Ga4LandingPage[];
}

export async function fetchGa4Data(propertyId: string, accessToken: string): Promise<Ga4Data | null> {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Channel breakdown
    const channelRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'engagedSessions' },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    // Top organic landing pages
    const landingRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'landingPage' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'engagedSessions' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionDefaultChannelGroup',
              stringFilter: { value: 'Organic Search' },
            },
          },
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 20,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!channelRes.ok) {
      const err = await channelRes.text();
      console.error('GA4 channel API failed:', channelRes.status, err, 'Property:', propertyId);
      return null;
    }
    const channelData = await channelRes.json();

    let organicSessions = 0;
    let totalSessions = 0;
    let organicEngaged = 0;

    for (const row of channelData.rows || []) {
      const channel = row.dimensionValues[0].value;
      const sessions = parseInt(row.metricValues[0].value) || 0;
      const engaged = parseInt(row.metricValues[2].value) || 0;
      totalSessions += sessions;
      if (channel === 'Organic Search') {
        organicSessions = sessions;
        organicEngaged = engaged;
      }
    }

    const topLandingPages: Ga4LandingPage[] = [];
    if (landingRes.ok) {
      const landingData = await landingRes.json();
      for (const row of (landingData.rows || []).slice(0, 20)) {
        const page = row.dimensionValues[0].value;
        if (page === '(not set)') continue;
        topLandingPages.push({
          page,
          sessions: parseInt(row.metricValues[0].value) || 0,
          users: parseInt(row.metricValues[1].value) || 0,
          engagedSessions: parseInt(row.metricValues[2].value) || 0,
        });
      }
    }

    return {
      organicSessions,
      totalSessions,
      organicPercentage: totalSessions > 0 ? (organicSessions / totalSessions) * 100 : 0,
      engagementRate: organicSessions > 0 ? (organicEngaged / organicSessions) * 100 : 0,
      topLandingPages,
    };
  } catch {
    return null;
  }
}
