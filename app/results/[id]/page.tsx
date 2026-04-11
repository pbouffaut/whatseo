import { supabase } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ScoreGauge from '@/components/ScoreGauge';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  content: 'Content Quality',
  onPage: 'On-Page SEO',
  schema: 'Schema Markup',
  performance: 'Performance',
  aiReadiness: 'AI Search Ready',
  images: 'Images',
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: audit } = await supabase.from('Audit').select('*').eq('id', id).single();

  if (!audit) notFound();
  if (audit.status !== 'complete') redirect(`/analyze?id=${id}`);

  const results = JSON.parse(audit.results || '{}');
  const categories = Object.entries(results.score?.categories || {}).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    score: (val as { score: number }).score,
    weight: (val as { weight: number }).weight,
  }));

  const allChecks: { name: string; status: string; message: string; category: string }[] = [];
  for (const [cat, data] of Object.entries(results)) {
    if (data && typeof data === 'object' && 'checks' in data) {
      for (const check of (data as { checks: { name: string; status: string; message: string }[] }).checks) {
        allChecks.push({ ...check, category: CATEGORY_LABELS[cat] || cat });
      }
    }
  }

  const issues = allChecks.filter((c) => c.status === 'fail').slice(0, 5);
  const wins = allChecks.filter((c) => c.status === 'pass').slice(0, 5);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">SEO Audit Results</h1>
          <p className="text-gray-500">{audit.url}</p>
          <p className="text-xs text-gray-600 mt-1">
            Analyzed {new Date(audit.createdAt).toLocaleDateString()} in {Math.round((results.duration || 0) / 1000)}s
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <ScoreGauge score={audit.score || 0} />
        </div>

        <div className="flex justify-center mb-16">
          <ScoreBreakdown categories={categories} />
        </div>

        {issues.length > 0 && (
          <div className="bg-navy-light rounded-xl border border-white/5 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-red-400">Top Issues</h2>
            <ul className="space-y-3">
              {issues.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {wins.length > 0 && (
          <div className="bg-navy-light rounded-xl border border-white/5 p-6 mb-12">
            <h2 className="text-lg font-semibold mb-4 text-green-400">What&apos;s Working</h2>
            <ul className="space-y-3">
              {wins.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button disabled className="px-6 py-3 bg-white/5 text-gray-500 rounded-lg font-semibold cursor-not-allowed">
            Download PDF (Coming Soon)
          </button>
          <Link href="/" className="px-6 py-3 bg-gold text-navy rounded-lg font-semibold text-center hover:bg-gold-light transition-colors">
            Run Another Audit
          </Link>
        </div>
      </div>
    </div>
  );
}
