'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Code, Zap, BookOpen, Bot, Check, ArrowRight } from 'lucide-react';
import UrlForm from '@/components/UrlForm';
import JsonLdSchema from './schema';

const features = [
  { icon: Shield, title: 'Technical Foundation', desc: 'We audit your site\'s crawlability, security headers, and infrastructure so search engines can find and trust every page.' },
  { icon: FileText, title: 'On-Page Strategy', desc: 'From title tags to internal linking, we analyze the elements that tell Google exactly what your pages are about.' },
  { icon: Code, title: 'Structured Data', desc: 'Rich results start with proper schema. We detect, validate, and recommend the markup that wins featured snippets.' },
  { icon: Zap, title: 'Speed & Performance', desc: 'Core Web Vitals, load times, and resource optimization \u2014 the real metrics Google uses to rank you.' },
  { icon: BookOpen, title: 'Content & Authority', desc: 'E-E-A-T signals, readability, and depth analysis to ensure your content demonstrates genuine expertise.' },
  { icon: Bot, title: 'AI Search Readiness', desc: 'Is your site ready for ChatGPT, Perplexity, and AI Overviews? We check llms.txt, crawler access, and citability.' },
];

const steps = [
  { num: '01', title: 'Share Your Website', desc: 'Enter your URL and tell us where to send the report.' },
  { num: '02', title: 'We Analyze Everything', desc: 'Our AI runs 80+ checks on your homepage in seconds.' },
  { num: '03', title: 'Receive Your Report', desc: 'A professional PDF with scores, insights, and a prioritized action plan.' },
];

const caseStudies = [
  { category: 'E-Commerce', before: 34, after: 78, result: '+142% organic traffic', timeframe: '90 days' },
  { category: 'Multi-Location', before: 28, after: 85, result: '+38,000 clicks/quarter', timeframe: '8 weeks' },
  { category: 'SaaS', before: 45, after: 91, result: '3x featured snippets', timeframe: '12 weeks' },
];

const pricing = [
  {
    name: 'Professional Audit',
    slug: 'professional',
    price: '$499',
    period: 'one-time',
    features: ['80+ checks across up to 1,000 pages', 'Real Google Search Console data', 'Professional PDF report', 'Prioritized action plan & GitHub/Jira tickets', 'Dev-ready schema components'],
    cta: 'Get Your Audit',
    active: true,
    highlighted: false,
  },
  {
    name: 'Monthly Monitor',
    slug: 'monthly',
    price: '$299',
    period: '/month',
    commitment: '12-month agreement',
    features: ['Everything in Professional', 'Monthly trend tracking', 'Slack notifications', 'Score change alerts', 'Competitor tracking'],
    cta: 'Subscribe Now',
    active: true,
    highlighted: true,
  },
  {
    name: 'Bi-Monthly Monitor',
    slug: 'bimonthly',
    price: '$399',
    period: '/2 months',
    commitment: '12-month agreement',
    features: ['Everything in Professional', 'Report every 2 months', 'Slack notifications', 'Score change alerts', 'Competitor tracking'],
    cta: 'Subscribe Now',
    active: true,
    highlighted: false,
  },
];

function ScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#4d6b32' : score >= 40 ? '#914d00' : '#ba1a1a';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(145,77,0,0.12)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={color} fontSize="14" fontWeight="bold"
        className="rotate-90 origin-center">{score}</text>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <JsonLdSchema />

      {/* Hero — Warm cream with editorial serif */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
        {/* Subtle warm gradient orb */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(242,140,40,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(201,238,169,0.06),transparent_70%)]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-20">
          {/* Asymmetric layout — text left-weighted */}
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-6"
            >
              AI-Powered SEO Analysis
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl text-on-surface leading-[1.08] mb-8 tracking-tight"
            >
              Your website&apos;s
              <br />
              untapped potential,
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">revealed.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-on-surface-muted max-w-xl mb-10 leading-relaxed"
            >
              We run 80+ checks on your homepage and deliver the insights
              your team needs to rank, convert, and grow.
            </motion.p>
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              href="#audit-form"
              className="inline-flex items-center gap-2 bg-gradient-cta text-on-primary rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
            >
              Start Your Free Scan
              <ArrowRight className="w-5 h-5" />
            </motion.a>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-on-surface-light text-sm mt-6"
            >
              Complimentary homepage analysis &mdash; no credit card required
            </motion.p>
          </div>
        </div>
      </section>

      {/* What We Uncover — Tonal layer shift */}
      <section id="features" className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Our Services</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface tracking-tight">What We Uncover</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed/40 flex items-center justify-center mb-5">
                  <f.icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">{f.title}</h3>
                <p className="text-on-surface-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Surface white cards on cream */}
      <section id="how-it-works" className="bg-background py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Process</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface tracking-tight">A Simple Process,<br />Powerful Results</h2>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px bg-outline/20" />
            <div className="grid md:grid-cols-3 gap-16 md:gap-12">
              {steps.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="text-center relative"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-cta text-on-primary text-sm font-bold flex items-center justify-center mx-auto mb-6 relative z-10">
                    {s.num}
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface mb-3">{s.title}</h3>
                  <p className="text-on-surface-muted text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free vs Full Comparison — Tonal layering */}
      <section className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Compare</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">
              Free Scan vs. Full Audit
            </h2>
            <p className="text-on-surface-muted max-w-2xl mx-auto">
              Our free scan gives you a quick snapshot. A full audit gives you the complete picture
              with real Google data and everything your team needs to take action.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-on-surface">Free Scan</h3>
                <span className="text-on-surface-light text-sm">$0</span>
              </div>
              <p className="text-on-surface-muted text-sm mb-6 leading-relaxed">
                A quick health check on your homepage. Good for a first look.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { text: 'Homepage only (1 page)', included: true },
                  { text: '80+ automated checks', included: true },
                  { text: 'Instant score & top issues', included: true },
                  { text: 'Basic schema detection', included: true },
                  { text: 'Lab-only performance data', included: true },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-sm text-on-surface-muted">
                    <Check className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
                {[
                  'Multi-page crawl (up to 1,000 pages)',
                  'Real Google Search Console data',
                  'Google Analytics traffic data',
                  'Real user Core Web Vitals (CrUX)',
                  'Professional PDF report',
                  'Prioritized action plan with ROI',
                  'Dev-ready code & GitHub/Jira tickets',
                  'Revenue impact estimates',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-on-surface-light/50 line-through">
                    <span className="w-4 h-4 mt-0.5 shrink-0 text-center text-on-surface-light/30">&times;</span>
                    {text}
                  </li>
                ))}
              </ul>
              <a href="#audit-form" className="block w-full py-3.5 rounded-full font-semibold text-center bg-surface-high text-on-surface-muted hover:bg-surface-highest transition-colors">
                Start Free Scan
              </a>
            </div>

            {/* Full Audit */}
            <div className="bg-surface-white rounded-[2rem] shadow-ambient p-8 relative ring-2 ring-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-on-primary text-xs font-bold px-4 py-1 rounded-full">
                Best Value
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-on-surface">Full Audit</h3>
                <div>
                  <span className="text-on-surface font-bold">$499</span>
                  <span className="text-on-surface-light text-sm ml-1">one-time</span>
                </div>
              </div>
              <p className="text-on-surface-muted text-sm mb-6 leading-relaxed">
                The complete picture. Everything an agency delivers for $15K+, powered by AI.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { text: 'Up to 1,000 pages crawled & analyzed', bold: true },
                  { text: '80+ checks per page, not just homepage', bold: true },
                  { text: 'Instant score & full issue breakdown', bold: false },
                  { text: 'Deep schema audit + generated code', bold: false },
                  { text: 'Real Google Search Console data', bold: true },
                  { text: 'Google Analytics organic traffic data', bold: true },
                  { text: 'Real user Core Web Vitals (CrUX)', bold: true },
                  { text: 'Professional PDF report for stakeholders', bold: true },
                  { text: 'Prioritized action plan with revenue impact', bold: true },
                  { text: 'Push tickets to GitHub Issues or Jira', bold: true },
                  { text: 'Schema markup code you can deploy', bold: false },
                  { text: 'Revenue impact estimates per fix', bold: false },
                  { text: 'Competitor visibility analysis', bold: false },
                ].map((item) => (
                  <li key={item.text} className={`flex items-start gap-3 text-sm ${item.bold ? 'text-on-surface' : 'text-on-surface-muted'}`}>
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
              </ul>
              <a href="/checkout/professional" className="block w-full py-3.5 rounded-full font-semibold text-center bg-gradient-cta text-on-primary hover:opacity-90 transition-opacity">
                Get Full Audit &rarr;
              </a>
              <p className="text-center text-xs text-on-surface-light mt-3">
                <span className="line-through">$15,000+</span> at a traditional agency
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results We've Delivered — White cards on cream */}
      <section id="results" className="bg-background py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Case Studies</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface tracking-tight">Results We&apos;ve Delivered</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {caseStudies.map((cs, i) => (
              <motion.div
                key={cs.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-surface-white rounded-[2rem] shadow-ambient p-8 hover:translate-y-[-2px] transition-transform"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-secondary font-semibold mb-6">{cs.category}</p>
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <ScoreCircle score={cs.before} />
                    <p className="text-xs text-on-surface-light mt-1">Before</p>
                  </div>
                  <div className="text-primary text-2xl">&rarr;</div>
                  <div className="text-center">
                    <ScoreCircle score={cs.after} />
                    <p className="text-xs text-on-surface-light mt-1">After</p>
                  </div>
                </div>
                <p className="text-on-surface text-lg font-bold text-center mb-1">{cs.result}</p>
                <p className="text-on-surface-light text-sm text-center">in {cs.timeframe}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Form — Surface-low recessed feel */}
      <section id="audit-form" className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Free Analysis</p>
          <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">
            Ready to See What&apos;s Possible?
          </h2>
          <p className="text-on-surface-muted mb-12 max-w-xl mx-auto leading-relaxed">
            Enter your website below for a complimentary homepage analysis.
            Your full report will be ready in minutes.
          </p>
          <div className="flex justify-center mb-8">
            <UrlForm />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-on-surface-muted text-sm">
            {['Free homepage analysis', 'Results in seconds', 'No credit card required'].map((text) => (
              <span key={text} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-tertiary" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — White cards with tonal layering */}
      <section id="pricing" className="bg-background py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Pricing</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">Investment in Your Growth</h2>
            <p className="text-on-surface-muted max-w-xl mx-auto">
              No hidden fees. No long-term contracts. Professional-grade SEO insights at a fraction of agency costs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`bg-surface-white rounded-[2rem] p-8 flex flex-col shadow-ambient ${
                  p.highlighted ? 'ring-2 ring-primary relative' : ''
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-on-primary text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-on-surface mb-2">{p.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-on-surface">{p.price}</span>
                  <span className="text-on-surface-light ml-1">{p.period}</span>
                </div>
                {'commitment' in p && p.commitment && (
                  <p className="text-xs text-primary font-medium mb-4">{p.commitment}</p>
                )}
                {!('commitment' in p && p.commitment) && <div className="mb-4" />}
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-on-surface-muted">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={`/checkout/${p.slug}`}
                  className={`block w-full py-3.5 rounded-full font-semibold transition-all text-center ${
                    p.highlighted
                      ? 'bg-gradient-cta text-on-primary hover:opacity-90'
                      : 'bg-surface-high text-on-surface hover:bg-surface-highest'
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — Warm editorial feel */}
      <section className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-6 tracking-tight">
            Let&apos;s Grow Your
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">Organic Presence</span>
          </h2>
          <p className="text-on-surface-muted mb-10 max-w-xl mx-auto leading-relaxed">
            Every day without SEO optimization is traffic you&apos;re leaving to competitors.
            Start with a free analysis today.
          </p>
          <a
            href="#audit-form"
            className="inline-flex items-center gap-2 bg-gradient-cta text-on-primary rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
          >
            Start Your Free Scan
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </>
  );
}
