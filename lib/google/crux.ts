export interface CruxMetric {
  p75: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

export interface CruxData {
  lcp: CruxMetric | null;
  inp: CruxMetric | null;
  cls: CruxMetric | null;
  fcp: CruxMetric | null;
  ttfb: CruxMetric | null;
  overallCategory: string;
}

function parseMetric(metric: Record<string, unknown> | undefined): CruxMetric | null {
  if (!metric) return null;
  const p75 = (metric.percentiles as Record<string, number>)?.p75;
  const hist = metric.histogram as { density: number }[];
  if (p75 === undefined || !hist) return null;
  return {
    p75,
    good: Math.round((hist[0]?.density || 0) * 100),
    needsImprovement: Math.round((hist[1]?.density || 0) * 100),
    poor: Math.round((hist[2]?.density || 0) * 100),
  };
}

export async function fetchCruxData(origin: string, apiKey?: string): Promise<CruxData | null> {
  try {
    const params = apiKey ? `?key=${apiKey}` : '';
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const metrics = data.record?.metrics;
    if (!metrics) return null;

    return {
      lcp: parseMetric(metrics.largest_contentful_paint),
      inp: parseMetric(metrics.interaction_to_next_paint),
      cls: parseMetric(metrics.cumulative_layout_shift),
      fcp: parseMetric(metrics.first_contentful_paint),
      ttfb: parseMetric(metrics.experimental_time_to_first_byte),
      overallCategory: data.loadingExperience?.overall_category || 'UNKNOWN',
    };
  } catch {
    return null;
  }
}
