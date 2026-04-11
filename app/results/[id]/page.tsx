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
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-3">Audit Complete</p>
          <h1 className="font-serif text-3xl md:text-4xl text-warm-white mb-3">Your SEO Audit</h1>
          <p className="text-warm-gray">{audit.url}</p>
          <p className="text-xs text-warm-gray-light mt-2">
            Analyzed {new Date(audit.createdAt).toLocaleDateString()} in {Math.round((results.duration || 0) / 1000)}s
          </p>
        </div>

        {/* Score */}
        <div className="flex justify-center mb-6">
          <ScoreGauge score={audit.score || 0} />
        </div>

        {(audit.score || 0) < 50 && (
          <div className="bg-warm-white/5 rounded-xl px-5 py-3 mb-12 text-center max-w-xl mx-auto">
            <p className="text-xs text-warm-gray">
              <span className="text-gold font-medium">Low score?</span> This is normal for minimal homepages or heavily app-based sites. Large brands often rely on domain authority rather than on-page SEO. The score reflects best practices that matter most for businesses competing for organic rankings.
            </p>
          </div>
        )}

        <div className="flex justify-center mb-16">
          <ScoreBreakdown categories={categories} />
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-[#e05555]">Top Issues</h2>
            <ul className="space-y-3">
              {issues.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#e05555] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-warm-white">{c.name}</div>
                    <div className="text-xs text-warm-gray">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Wins */}
        {wins.length > 0 && (
          <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-12">
            <h2 className="text-lg font-semibold mb-4 text-[#4aab6a]">What&apos;s Working</h2>
            <ul className="space-y-3">
              {wins.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#4aab6a] mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-warm-white">{c.name}</div>
                    <div className="text-xs text-warm-gray">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upsell */}
        <div className="relative bg-gradient-to-br from-dark-card to-dark-warm rounded-2xl border border-gold/20 p-8 md:p-10 mb-12 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />

          <div className="relative">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-3">Go Deeper</p>
            <h2 className="font-serif text-2xl md:text-3xl text-warm-white mb-4">
              This scan checked <span className="text-gold">one page</span>.
              <br />
              Your full site tells a different story.
            </h2>
            <p className="text-warm-gray mb-8 max-w-2xl leading-relaxed">
              The free audit analyzes your homepage against 47 criteria. But the issues costing you the most traffic are often hiding deeper &mdash; in your location pages, blog posts, product pages, and site architecture.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-gold mb-4 uppercase tracking-wider">Free Audit</h3>
                <ul className="space-y-2">
                  {['Homepage title & meta tags', 'Basic schema detection', 'Single-page performance', 'Surface-level content check', 'Basic image audit'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-warm-gray-light">
                      <span className="text-warm-gray-light">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gold mb-4 uppercase tracking-wider">Full Audit</h3>
                <ul className="space-y-2">
                  {[
                    'Up to 500 pages crawled & analyzed',
                    'Real Search Console data (clicks, rankings)',
                    'Google Analytics conversion data',
                    'Real user Core Web Vitals',
                    'Complete schema audit + code',
                    'Thin content & index bloat detection',
                    'Local SEO & Google Business Profile',
                    'AI search readiness analysis',
                    'Prioritized dev tickets (Jira-ready)',
                    'Professional PDF report',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-warm-white">
                      <span className="text-gold">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-dark/50 rounded-xl p-5 mb-8 border border-warm-white/5">
              <p className="text-sm text-warm-gray leading-relaxed">
                <span className="text-gold font-semibold">Real example:</span> A recent full audit on a 200+ location website uncovered that broken title tags were costing <span className="text-warm-white font-semibold">38,000&ndash;69,000 clicks per quarter</span>, and zero schema markup was hiding them from rich results. Total impact: <span className="text-warm-white font-semibold">+$150K&ndash;$250K/quarter</span> in organic traffic value.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-warm-white">$299</span>
                  <span className="text-warm-gray">one-time</span>
                </div>
                <p className="text-xs text-warm-gray-light mt-1">
                  <span className="line-through">$15,000+</span> at a traditional agency
                </p>
              </div>
              <a
                href={`mailto:hello@whatseo.ai?subject=Full%20SEO%20Audit%20Request&body=I%20ran%20a%20free%20audit%20on%20${encodeURIComponent(audit.url)}%20and%20scored%20${audit.score}%2F100.%20I%E2%80%99d%20like%20a%20full%20audit.`}
                className="bg-gold text-dark px-10 py-4 rounded-full font-semibold text-lg hover:bg-gold-light transition-colors text-center"
              >
                Get Your Full Audit &rarr;
              </a>
            </div>
            <p className="text-xs text-warm-gray-light mt-4">
              30-day money-back guarantee. Report delivered within 24 hours.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/" className="px-8 py-3.5 bg-warm-white/5 text-warm-gray rounded-full font-semibold text-center hover:bg-warm-white/10 transition-colors">
            Run Another Free Audit
          </Link>
        </div>
      </div>
    </div>
  );
}
