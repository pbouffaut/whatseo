export interface ScoreSnapshot {
  overall: number;
  technical?: number;
  onPage?: number;
  schema?: number;
  performance?: number;
  aiReadiness?: number;
  pagesCrawled?: number;
  recordedAt?: string;
}

export interface ScoreDelta {
  overall: number;
  improved: { dimension: string; label: string; from: number; to: number; delta: number }[];
  regressed: { dimension: string; label: string; from: number; to: number; delta: number }[];
  unchanged: string[];
}

const DIMENSION_LABELS: Record<string, string> = {
  technical: 'Technical Foundation',
  onPage: 'On-Page SEO',
  schema: 'Structured Data',
  performance: 'Performance',
  aiReadiness: 'AI Search Readiness',
};

export function computeScoreDelta(previous: ScoreSnapshot, current: ScoreSnapshot): ScoreDelta {
  const dimensions = Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[];
  const improved: ScoreDelta['improved'] = [];
  const regressed: ScoreDelta['regressed'] = [];
  const unchanged: string[] = [];

  for (const dim of dimensions) {
    const prev = previous[dim as keyof ScoreSnapshot] as number | undefined;
    const curr = current[dim as keyof ScoreSnapshot] as number | undefined;
    if (prev == null || curr == null) continue;
    const delta = curr - prev;
    const entry = { dimension: dim, label: DIMENSION_LABELS[dim], from: prev, to: curr, delta };
    if (delta > 0) improved.push(entry);
    else if (delta < 0) regressed.push(entry);
    else unchanged.push(DIMENSION_LABELS[dim]);
  }

  // Sort by magnitude
  improved.sort((a, b) => b.delta - a.delta);
  regressed.sort((a, b) => a.delta - b.delta);

  return { overall: current.overall - (previous.overall ?? current.overall), improved, regressed, unchanged };
}
