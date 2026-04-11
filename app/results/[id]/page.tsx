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

        <div className="flex justify-center mb-6">
          <ScoreGauge score={audit.score || 0} />
        </div>

        {(audit.score || 0) < 50 && (
          <div className="bg-white/5 rounded-lg px-4 py-3 mb-12 text-center max-w-xl mx-auto">
            <p className="text-xs text-gray-500">
              <span className="text-gold font-medium">Low score?</span> This is normal for homepages that are minimal (like search engines) or heavily app-based. Large brands often rely on domain authority rather than on-page SEO. The score reflects technical SEO best practices that matter most for businesses competing for organic rankings.
            </p>
          </div>
        )}

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

        {/* Upsell Section */}
        <div className="relative bg-gradient-to-br from-navy-light to-[#1a2a45] rounded-2xl border-2 border-gold/30 p-8 mb-12 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 rounded-full border border-gold/20">FREE AUDIT LIMITATION</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">
              This scan only checked <span className="text-gold">one page</span>.
              <br />
              Your full site tells a different story.
            </h2>
            <p className="text-gray-400 mb-6 max-w-2xl">
              The free audit analyzes your homepage against 47 criteria. But the issues costing you the most traffic are often hiding deeper &mdash; in your location pages, blog posts, product pages, and site architecture.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wider">What the free audit checks</h3>
                <ul className="space-y-2">
                  {['Homepage title & meta tags', 'Basic schema detection', 'Image alt text on one page', 'Single-page performance', 'Surface-level content check'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="text-gray-600">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wider">What a Full Audit uncovers</h3>
                <ul className="space-y-2">
                  {[
                    'Every page crawled & analyzed (up to 500)',
                    'Real Google Search Console data (your actual clicks, impressions, rankings)',
                    'Google Analytics organic traffic & conversion data',
                    'Real user Core Web Vitals (not just lab tests)',
                    'Schema markup for every page + ready-to-use code',
                    'Thin content & index bloat detection',
                    'Local SEO & Google Business Profile signals',
                    'AI search readiness (ChatGPT, Perplexity, AI Overviews)',
                    'Competitor visibility analysis',
                    'Blog & content strategy audit',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white">
                      <span className="text-gold">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/5">
              <h3 className="text-lg font-semibold mb-4">What you get with a Full Audit</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-gold mb-1">PDF</div>
                  <div className="text-xs text-gray-400">Professional report with executive summary, data visualizations, and methodology</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-gold mb-1">Tickets</div>
                  <div className="text-xs text-gray-400">Prioritized dev tickets with effort estimates, acceptance criteria &mdash; ready for Jira/Linear</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl font-bold text-gold mb-1">Code</div>
                  <div className="text-xs text-gray-400">Production-ready schema components, config files, and implementation guide</div>
                </div>
              </div>
            </div>

            <div className="bg-navy/50 rounded-xl p-5 mb-8 border border-gold/10">
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-gold font-semibold">Real example:</span> A recent full audit on a 200+ location website uncovered that broken title tags were costing <span className="text-white font-semibold">38,000&ndash;69,000 clicks per quarter</span>, zero schema markup was hiding them from rich results, and 1,500+ thin pages were wasting crawl budget. Total estimated impact: <span className="text-white font-semibold">+$150K&ndash;$250K/quarter</span> in organic traffic value. The fixes took 2 weeks of engineering time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$299</span>
                  <span className="text-gray-500">one-time</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="line-through">$15,000+</span> at a traditional SEO agency
                </p>
              </div>
              <a
                href={`mailto:hello@whatseo.ai?subject=Full%20SEO%20Audit%20Request&body=I%20ran%20a%20free%20audit%20on%20${encodeURIComponent(audit.url)}%20and%20scored%20${audit.score}%2F100.%20I%E2%80%99d%20like%20to%20get%20a%20full%20audit%20with%20Google%20Search%20Console%20data%2C%20multi-page%20crawl%2C%20and%20the%20complete%20report.`}
                className="bg-gold text-navy px-8 py-4 rounded-xl font-bold text-lg hover:bg-gold-light transition-colors text-center"
              >
                Get Your Full Audit &rarr;
              </a>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Includes 30-day money-back guarantee. Report delivered within 24 hours.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="px-6 py-3 bg-white/5 text-gray-400 rounded-lg font-semibold text-center hover:bg-white/10 transition-colors">
            Run Another Free Audit
          </Link>
        </div>
      </div>
    </div>
  );
}
