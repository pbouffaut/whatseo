'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Code, Zap, BookOpen, Bot, Check } from 'lucide-react';
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
  { num: '02', title: 'We Analyze Everything', desc: 'Our AI runs 47 checks on your homepage in seconds.' },
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
    price: '$499',
    period: 'one-time',
    features: ['47 checks across up to 500 pages', 'Real Google Search Console data', 'Professional PDF report', 'Prioritized action plan', 'Dev-ready schema components'],
    cta: 'Get Your Audit',
    active: true,
    highlighted: false,
  },
  {
    name: 'Monthly Monitor',
    price: '$299',
    period: '/month',
    commitment: '12-month agreement',
    features: ['Everything in One-Time', 'Monthly trend tracking', 'Slack notifications', 'Score change alerts', 'Competitor tracking'],
    cta: 'Coming Soon',
    active: false,
    highlighted: true,
  },
  {
    name: 'Bi-Monthly Monitor',
    price: '$399',
    period: '/2 months',
    commitment: '12-month agreement',
    features: ['Everything in One-Time', 'Report every 2 months', 'Slack notifications', 'Score change alerts', 'Competitor tracking'],
    cta: 'Coming Soon',
    active: false,
    highlighted: false,
  },
];

function ScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(201,168,92,0.15)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#c9a85c" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="#c9a85c" fontSize="14" fontWeight="bold"
        className="rotate-90 origin-center">{score}</text>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <JsonLdSchema />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-warm via-dark to-[#1a2520]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,92,0.06),transparent_60%)]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-6"
          >
            AI-Powered SEO Analysis
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-warm-white leading-[1.05] mb-8"
          >
            Your website&apos;s
            <br />
            untapped potential,
            <br />
            <span className="text-gold">revealed.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-warm-gray max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            We run 47 checks on your homepage and deliver the insights
            your team needs to rank, convert, and grow.
          </motion.p>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            href="#audit-form"
            className="inline-block bg-gold text-dark rounded-full px-10 py-4 text-lg font-semibold hover:bg-gold-light transition-colors"
          >
            Start Your Free Scan
          </motion.a>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-warm-gray-light text-sm mt-6"
          >
            Complimentary homepage analysis &mdash; no credit card required
          </motion.p>
        </div>
      </section>

      {/* What We Uncover */}
      <section id="features" className="bg-cream py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Our Services</p>
            <h2 className="font-serif text-3xl md:text-5xl text-dark">What We Uncover</h2>
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
                <div className="w-12 h-0.5 bg-gold mb-6" />
                <f.icon className="w-10 h-10 text-gold mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-semibold text-dark mb-3">{f.title}</h3>
                <p className="text-dark/60 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-dark-warm py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Process</p>
            <h2 className="font-serif text-3xl md:text-5xl text-warm-white">A Simple Process,<br />Powerful Results</h2>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-7 left-[15%] right-[15%] h-px bg-gold-muted/30" />
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
                  <div className="w-14 h-14 rounded-full border border-gold text-gold text-sm font-semibold flex items-center justify-center mx-auto mb-6 bg-dark-warm relative z-10">
                    {s.num}
                  </div>
                  <h3 className="text-lg font-semibold text-warm-white mb-3">{s.title}</h3>
                  <p className="text-warm-gray text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free vs Full Comparison */}
      <section className="bg-dark py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Compare</p>
            <h2 className="font-serif text-3xl md:text-5xl text-warm-white mb-4">
              Free Scan vs. Full Audit
            </h2>
            <p className="text-warm-gray max-w-2xl mx-auto">
              Our free scan gives you a quick snapshot. A full audit gives you the complete picture
              with real Google data and everything your team needs to take action.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-warm-white/5 rounded-2xl border border-warm-white/8 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-warm-white">Free Scan</h3>
                <span className="text-warm-gray text-sm">$0</span>
              </div>
              <p className="text-warm-gray text-sm mb-6 leading-relaxed">
                A quick health check on your homepage. Good for a first look.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { text: 'Homepage only (1 page)', included: true },
                  { text: '47 automated checks', included: true },
                  { text: 'Instant score & top issues', included: true },
                  { text: 'Basic schema detection', included: true },
                  { text: 'Lab-only performance data', included: true },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-sm text-warm-gray">
                    <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
                {[
                  'Multi-page crawl (up to 500 pages)',
                  'Real Google Search Console data',
                  'Google Analytics traffic data',
                  'Real user Core Web Vitals (CrUX)',
                  'Professional PDF report',
                  'Prioritized action plan with ROI',
                  'Dev-ready code & Jira tickets',
                  'Revenue impact estimates',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-warm-gray-light/50 line-through">
                    <span className="w-4 h-4 mt-0.5 shrink-0 text-center text-warm-gray-light/30">&times;</span>
                    {text}
                  </li>
                ))}
              </ul>
              <a href="#audit-form" className="block w-full py-3.5 rounded-full font-semibold text-center bg-warm-white/5 text-warm-gray hover:bg-warm-white/10 transition-colors border border-warm-white/10">
                Start Free Scan
              </a>
            </div>

            {/* Full Audit */}
            <div className="bg-dark-card rounded-2xl border-2 border-gold p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-dark text-xs font-bold px-4 py-1 rounded-full">
                Best Value
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-warm-white">Full Audit</h3>
                <div>
                  <span className="text-warm-white font-bold">$499</span>
                  <span className="text-warm-gray text-sm ml-1">one-time</span>
                </div>
              </div>
              <p className="text-warm-gray text-sm mb-6 leading-relaxed">
                The complete picture. Everything an agency delivers for $15K+, powered by AI.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { text: 'Up to 500 pages crawled & analyzed', bold: true },
                  { text: '47 checks per page, not just homepage', bold: true },
                  { text: 'Instant score & full issue breakdown', bold: false },
                  { text: 'Deep schema audit + generated code', bold: false },
                  { text: 'Real Google Search Console data', bold: true },
                  { text: 'Google Analytics organic traffic data', bold: true },
                  { text: 'Real user Core Web Vitals (CrUX)', bold: true },
                  { text: 'Professional PDF report for stakeholders', bold: true },
                  { text: 'Prioritized action plan with revenue impact', bold: true },
                  { text: 'Dev-ready components & Jira tickets', bold: true },
                  { text: 'Schema markup code you can deploy', bold: false },
                  { text: 'Revenue impact estimates per fix', bold: false },
                  { text: 'Competitor visibility analysis', bold: false },
                ].map((item) => (
                  <li key={item.text} className={`flex items-start gap-3 text-sm ${item.bold ? 'text-warm-white' : 'text-warm-gray'}`}>
                    <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@whatseo.ai?subject=Full%20SEO%20Audit%20Request" className="block w-full py-3.5 rounded-full font-semibold text-center bg-gold text-dark hover:bg-gold-light transition-colors">
                Get Full Audit &rarr;
              </a>
              <p className="text-center text-xs text-warm-gray-light mt-3">
                <span className="line-through">$15,000+</span> at a traditional agency
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results We've Delivered */}
      <section id="results" className="bg-cream py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Case Studies</p>
            <h2 className="font-serif text-3xl md:text-5xl text-dark">Results We&apos;ve Delivered</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {caseStudies.map((cs, i) => (
              <motion.div
                key={cs.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-2xl shadow-lg border border-cream-dark p-8 hover:shadow-xl transition-shadow"
              >
                <p className="text-sm uppercase tracking-wider text-gold font-semibold mb-6">{cs.category}</p>
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <ScoreCircle score={cs.before} />
                    <p className="text-xs text-dark/40 mt-1">Before</p>
                  </div>
                  <div className="text-gold text-2xl">&rarr;</div>
                  <div className="text-center">
                    <ScoreCircle score={cs.after} />
                    <p className="text-xs text-dark/40 mt-1">After</p>
                  </div>
                </div>
                <p className="text-dark text-lg font-bold text-center mb-1">{cs.result}</p>
                <p className="text-dark/40 text-sm text-center">in {cs.timeframe}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Form */}
      <section id="audit-form" className="bg-dark py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Free Analysis</p>
          <h2 className="font-serif text-3xl md:text-5xl text-warm-white mb-4">
            Ready to See What&apos;s Possible?
          </h2>
          <p className="text-warm-gray mb-12 max-w-xl mx-auto leading-relaxed">
            Enter your website below for a complimentary homepage analysis.
            Your full report will be ready in minutes.
          </p>
          <div className="flex justify-center mb-8">
            <UrlForm />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-warm-gray text-sm">
            {['Free homepage analysis', 'Results in seconds', 'No credit card required'].map((text) => (
              <span key={text} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-gold" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-cream py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Pricing</p>
            <h2 className="font-serif text-3xl md:text-5xl text-dark mb-4">Investment in Your Growth</h2>
            <p className="text-dark/50 max-w-xl mx-auto">
              No hidden fees. No long-term contracts. Professional-grade SEO insights at a fraction of agency costs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`bg-white rounded-2xl p-8 flex flex-col ${
                  p.highlighted
                    ? 'border-2 border-gold shadow-xl relative'
                    : 'border border-cream-dark shadow-md'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-dark text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-dark mb-2">{p.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-dark">{p.price}</span>
                  <span className="text-dark/40 ml-1">{p.period}</span>
                </div>
                {'commitment' in p && p.commitment && (
                  <p className="text-xs text-gold font-medium mb-4">{p.commitment}</p>
                )}
                {!('commitment' in p && p.commitment) && <div className="mb-4" />}
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-dark/70">
                      <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={!p.active}
                  className={`w-full py-3.5 rounded-full font-semibold transition-colors ${
                    p.active
                      ? 'bg-gold text-dark hover:bg-gold-light'
                      : 'bg-cream-dark text-warm-gray-light cursor-not-allowed'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-dark-warm py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-5xl text-warm-white mb-6">
            Let&apos;s Grow Your
            <br />
            <span className="text-gold">Organic Presence</span>
          </h2>
          <p className="text-warm-gray mb-10 max-w-xl mx-auto leading-relaxed">
            Every day without SEO optimization is traffic you&apos;re leaving to competitors.
            Start with a free analysis today.
          </p>
          <a
            href="#audit-form"
            className="inline-block bg-gold text-dark rounded-full px-10 py-4 text-lg font-semibold hover:bg-gold-light transition-colors"
          >
            Start Your Free Scan
          </a>
        </div>
      </section>
    </>
  );
}
