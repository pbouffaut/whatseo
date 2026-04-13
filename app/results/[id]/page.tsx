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
      <div className="min-h-screen flex items-center justify-center px-6 pt-20 bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mx-auto mb-6">
            <span className="text-error text-2xl font-bold">!</span>
          </div>
          <h2 className="font-serif text-2xl text-on-surface mb-3">Audit Failed</h2>
          <p className="text-on-surface-muted text-sm mb-2">{audit.url}</p>
          <p className="text-on-surface-light text-xs mb-8">{audit.error || 'An unexpected error occurred during the audit.'}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="px-8 py-3.5 bg-gradient-cta text-on-primary rounded-full font-semibold hover:opacity-90 transition-opacity">
              Back to Dashboard
            </Link>
            <Link href="/" className="px-8 py-3.5 bg-surface-high text-on-surface-muted rounded-full font-semibold hover:bg-surface-highest transition-colors">
              Run Free Scan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (audit.status === 'running') {
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
      <div className="min-h-screen pt-28 pb-16 px-6 bg-background">
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
    <div className="min-h-screen pt-28 pb-16 px-6 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-3">Audit Complete</p>
          <h1 className="font-serif text-3xl md:text-4xl text-on-surface mb-3 tracking-tight">Your SEO Audit</h1>
          <p className="text-on-surface-muted">{audit.url}</p>
          <p className="text-xs text-on-surface-light mt-2">
            Analyzed {new Date(audit.createdAt).toLocaleDateString()} in {Math.round((results.duration || 0) / 1000)}s
          </p>
        </div>

        {/* Score */}
        <div className="flex justify-center mb-6">
          <ScoreGauge score={audit.score || 0} />
        </div>

        {(audit.score || 0) < 50 && (
          <div className="bg-surface-low rounded-2xl px-5 py-3 mb-12 text-center max-w-xl mx-auto">
            <p className="text-xs text-on-surface-muted">
              <span className="text-primary font-medium">Low score?</span> This is normal for minimal homepages or heavily app-based sites. Large brands often rely on domain authority rather than on-page SEO. The score reflects best practices that matter most for businesses competing for organic rankings.
            </p>
          </div>
        )}

        <div className="flex justify-center mb-16">
          <ScoreBreakdown categories={categories} />
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-6">
            <h2 className="font-serif text-xl mb-4 text-error">Top Issues</h2>
            <ul className="space-y-3">
              {issues.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-error mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">{c.name}</div>
                    <div className="text-xs text-on-surface-muted">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Wins */}
        {wins.length > 0 && (
          <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 mb-12">
            <h2 className="font-serif text-xl mb-4 text-tertiary">What&apos;s Working</h2>
            <ul className="space-y-3">
              {wins.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-tertiary mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-on-surface">{c.name}</div>
                    <div className="text-xs text-on-surface-muted">{c.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upsell — only show for free scans */}
        {(!audit.audit_type || audit.audit_type === 'free') && <div className="relative bg-surface-white rounded-[2rem] shadow-ambient p-8 md:p-10 mb-12 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-fixed/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-tertiary-fixed/15 rounded-full blur-3xl" />

          <div className="relative">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-3">Go Deeper</p>
            <h2 className="font-serif text-2xl md:text-3xl text-on-surface mb-4 tracking-tight">
              This scan checked <span className="text-primary">one page</span>.
              <br />
              Your full site tells a different story.
            </h2>
            <p className="text-on-surface-muted mb-8 max-w-2xl leading-relaxed">
              The free audit analyzes your homepage against 47 criteria. But the issues costing you the most traffic are often hiding deeper &mdash; in your location pages, blog posts, product pages, and site architecture.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-secondary mb-4 uppercase tracking-[0.15em]">Free Audit</h3>
                <ul className="space-y-2">
                  {['Homepage title & meta tags', 'Basic schema detection', 'Single-page performance', 'Surface-level content check', 'Basic image audit'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-on-surface-light">
                      <span className="text-on-surface-light">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-primary mb-4 uppercase tracking-[0.15em]">Full Audit</h3>
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
                    <li key={item} className="flex items-center gap-2 text-sm text-on-surface">
                      <span className="text-primary">{'\u2713'}</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-5 mb-8">
              <p className="text-sm text-on-surface-muted leading-relaxed">
                <span className="text-primary font-semibold">Real example:</span> A recent full audit on a 200+ location website uncovered that broken title tags were costing <span className="text-on-surface font-semibold">38,000&ndash;69,000 clicks per quarter</span>, and zero schema markup was hiding them from rich results. Total impact: <span className="text-on-surface font-semibold">+$150K&ndash;$250K/quarter</span> in organic traffic value.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <a href="/checkout/professional" className="bg-surface-low rounded-2xl p-5 text-center hover:bg-surface-high transition-colors block">
                <h4 className="text-on-surface font-semibold mb-1">Professional Audit</h4>
                <div className="text-2xl font-bold text-primary mb-1">$499</div>
                <p className="text-xs text-on-surface-muted">one-time</p>
                <p className="text-xs text-on-surface-light mt-2">Full audit + PDF + action plan</p>
              </a>
              <a href="/checkout/monthly" className="bg-surface-low rounded-2xl p-5 ring-2 ring-primary text-center relative hover:bg-surface-high transition-colors block">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-cta text-on-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full">Best Value</div>
                <h4 className="text-on-surface font-semibold mb-1">Monthly Monitor</h4>
                <div className="text-2xl font-bold text-primary mb-1">$299<span className="text-sm text-on-surface-muted">/mo</span></div>
                <p className="text-xs text-on-surface-muted">12-month agreement</p>
                <p className="text-xs text-on-surface-light mt-2">Monthly reports + Slack alerts</p>
              </a>
              <a href="/checkout/bimonthly" className="bg-surface-low rounded-2xl p-5 text-center hover:bg-surface-high transition-colors block">
                <h4 className="text-on-surface font-semibold mb-1">Bi-Monthly</h4>
                <div className="text-2xl font-bold text-primary mb-1">$399<span className="text-sm text-on-surface-muted">/2mo</span></div>
                <p className="text-xs text-on-surface-muted">12-month agreement</p>
                <p className="text-xs text-on-surface-light mt-2">Report every 2 months</p>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-on-surface-light">
                <span className="line-through">$15,000+</span> at a traditional agency &mdash; 30-day money-back guarantee
              </p>
              <a
                href="/checkout/professional"
                className="bg-gradient-cta text-on-primary px-8 py-3.5 rounded-full font-semibold hover:opacity-90 transition-opacity text-center shrink-0"
              >
                Get Started &rarr;
              </a>
            </div>
          </div>
        </div>}

        <div className="flex justify-center gap-4">
          {audit.audit_type === 'full' && (
            <Link href="/dashboard" className="px-8 py-3.5 bg-gradient-cta text-on-primary rounded-full font-semibold text-center hover:opacity-90 transition-opacity">
              Back to Dashboard
            </Link>
          )}
          <Link href="/" className="px-8 py-3.5 bg-surface-high text-on-surface-muted rounded-full font-semibold text-center hover:bg-surface-highest transition-colors">
            {audit.audit_type === 'full' ? 'Run Another Scan' : 'Run Another Free Audit'}
          </Link>
        </div>
      </div>
    </div>
  );
}
