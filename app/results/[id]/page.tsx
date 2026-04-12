import { supabase } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ScoreGauge from '@/components/ScoreGauge';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import FullAuditResults from '@/components/FullAuditResults';
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

  // Handle non-complete audits
  if (audit.status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#e05555]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#e05555] text-2xl">!</span>
          </div>
          <h2 className="font-serif text-2xl text-warm-white mb-3">Audit Failed</h2>
          <p className="text-warm-gray text-sm mb-2">{audit.url}</p>
          <p className="text-warm-gray-light text-xs mb-8">{audit.error || 'An unexpected error occurred during the audit.'}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="px-8 py-3.5 bg-gold text-dark rounded-full font-semibold hover:bg-gold-light transition-colors">
              Back to Dashboard
            </Link>
            <Link href="/" className="px-8 py-3.5 bg-warm-white/5 text-warm-gray rounded-full font-semibold hover:bg-warm-white/10 transition-colors">
              Run Free Scan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (audit.status === 'running') {
    // Full audits go to progress page, free scans go to analyze page
    if (audit.audit_type === 'full') {
      redirect(`/audit-progress/${id}`);
    } else {
      redirect(`/analyze?id=${id}`);
    }
  }

  if (audit.status !== 'complete') redirect(`/analyze?id=${id}`);

  const results = JSON.parse(audit.results || '{}');

  // Full audits get the rich tabbed interface
  if (audit.audit_type === 'full') {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <FullAuditResults audit={audit} results={results} />
        </div>
      </div>
    );
  }
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

        {/* Upsell — only show for free scans, not paid full audits */}
        {(!audit.audit_type || audit.audit_type === 'free') && <div className="relative bg-gradient-to-br from-dark-card to-dark-warm rounded-2xl border border-gold/20 p-8 md:p-10 mb-12 overflow-hidden">
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

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <a href="/checkout/professional" className="bg-dark/40 rounded-xl p-5 border border-warm-white/8 text-center hover:border-gold/30 transition-colors block">
                <h4 className="text-warm-white font-semibold mb-1">Professional Audit</h4>
                <div className="text-2xl font-bold text-gold mb-1">$499</div>
                <p className="text-xs text-warm-gray">one-time</p>
                <p className="text-xs text-warm-gray-light mt-2">Full audit + PDF + action plan</p>
              </a>
              <a href="/checkout/monthly" className="bg-dark/40 rounded-xl p-5 border-2 border-gold text-center relative hover:bg-dark/60 transition-colors block">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-dark text-[10px] font-bold px-2.5 py-0.5 rounded-full">Best Value</div>
                <h4 className="text-warm-white font-semibold mb-1">Monthly Monitor</h4>
                <div className="text-2xl font-bold text-gold mb-1">$299<span className="text-sm text-warm-gray">/mo</span></div>
                <p className="text-xs text-warm-gray">12-month agreement</p>
                <p className="text-xs text-warm-gray-light mt-2">Monthly reports + Slack alerts</p>
              </a>
              <a href="/checkout/bimonthly" className="bg-dark/40 rounded-xl p-5 border border-warm-white/8 text-center hover:border-gold/30 transition-colors block">
                <h4 className="text-warm-white font-semibold mb-1">Bi-Monthly</h4>
                <div className="text-2xl font-bold text-gold mb-1">$399<span className="text-sm text-warm-gray">/2mo</span></div>
                <p className="text-xs text-warm-gray">12-month agreement</p>
                <p className="text-xs text-warm-gray-light mt-2">Report every 2 months</p>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-warm-gray-light">
                <span className="line-through">$15,000+</span> at a traditional agency &mdash; 30-day money-back guarantee
              </p>
              <a
                href="/checkout/professional"
                className="bg-gold text-dark px-8 py-3.5 rounded-full font-semibold hover:bg-gold-light transition-colors text-center shrink-0"
              >
                Get Started &rarr;
              </a>
            </div>
          </div>
        </div>}

        <div className="flex justify-center gap-4">
          {audit.audit_type === 'full' && (
            <Link href="/dashboard" className="px-8 py-3.5 bg-gold text-dark rounded-full font-semibold text-center hover:bg-gold-light transition-colors">
              Back to Dashboard
            </Link>
          )}
          <Link href="/" className="px-8 py-3.5 bg-warm-white/5 text-warm-gray rounded-full font-semibold text-center hover:bg-warm-white/10 transition-colors">
            {audit.audit_type === 'full' ? 'Run Another Scan' : 'Run Another Free Audit'}
          </Link>
        </div>
      </div>
    </div>
  );
}
