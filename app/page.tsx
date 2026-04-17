'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Code, Zap, BookOpen, Bot, Check, ArrowRight } from 'lucide-react';
import UrlForm from '@/components/UrlForm';
import JsonLdSchema from './schema';
const features = [
  { icon: Shield, title: 'Technical Foundation', desc: 'Crawlability, security headers, canonical consistency — the infrastructure search engines need to trust and index every page.' },
  { icon: FileText, title: 'On-Page Analysis', desc: 'Title tags, heading hierarchy, internal linking structure, and duplicate content — we map precisely what Google sees on each URL.' },
  { icon: Code, title: 'Structured Data', desc: 'Rich results start with proper schema. We detect, validate, and generate the JSON-LD markup that wins featured snippets.' },
  { icon: Zap, title: 'Core Web Vitals', desc: 'Real user data from CrUX alongside lab metrics — the performance signals Google actually uses in its ranking algorithm.' },
  { icon: BookOpen, title: 'Content & E-E-A-T', desc: 'Expertise signals, readability depth, and thin-content detection to ensure your content demonstrates genuine authority.' },
  { icon: Bot, title: 'AI Search Readiness', desc: 'Is your site being cited by ChatGPT, Perplexity, and AI Overviews? We check llms.txt, crawler access, and entity structure.' },
];

const steps = [
  { num: '01', title: 'Enter Your URL', desc: 'Just your domain. Free scan takes seconds — no account needed. Full audit connects to your Google data for real insights.' },
  { num: '02', title: 'We Analyze Everything', desc: 'Our engine runs 80+ checks across 7 dimensions: Technical, On-Page, Schema, Performance, Content, Images, and AI Readiness.' },
  { num: '03', title: 'Act on Your Report', desc: 'A professional PDF with a prioritized action plan, copy-paste schema templates, and GitHub/Jira tickets ready to assign.' },
];

const toolStats = [
  { value: '80+', label: 'Checks per audit' },
  { value: '7', label: 'Dimensions analyzed' },
  { value: '1,000', label: 'Pages crawled max' },
  { value: '100%', label: 'Real Google data' },
];

const pricing = [
  {
    name: 'Professional Audit',
    slug: 'professional',
    price: '$499',
    period: 'one-time',
    features: ['Full site crawl — up to 1,000 pages', '80+ checks across all 7 dimensions', 'Real Google Search Console data', 'Google Analytics 4 integration', 'Professional PDF report', 'Prioritized action plan', 'Dev-ready schema templates', 'GitHub Issues & Jira export'],
    cta: 'Get Your Audit',
    highlighted: false,
  },
  {
    name: 'Monthly Monitor',
    slug: 'monthly',
    price: '$299',
    period: '/month',
    commitment: '12-month agreement',
    features: ['Everything in Professional', 'Monthly automated re-audits', 'Score trend tracking', 'Degradation alerts (email + Slack)', 'GSC weekly rank changes', 'Monitoring dashboard'],
    cta: 'Subscribe Now',
    highlighted: true,
  },
  {
    name: 'Bi-Monthly Monitor',
    slug: 'bimonthly',
    price: '$399',
    period: '/2 months',
    commitment: '12-month agreement',
    features: ['Everything in Professional', 'Audit every 2 months', 'Score trend tracking', 'Degradation alerts (email + Slack)', 'GSC weekly rank changes', 'Monitoring dashboard'],
    cta: 'Subscribe Now',
    highlighted: false,
  },
];

export default function Home() {
  return (
    <>
      <JsonLdSchema />

      {/* Hero — full-bleed editorial photography */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80)',
          }}
        />
        {/* Dark warm overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1108]/85 via-[#1c1510]/80 to-[#0e0c08]/85" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-20">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#c9a85c] text-xs uppercase tracking-[0.2em] font-semibold mb-6"
            >
              AI-Powered SEO Analysis
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#f5f0e8] leading-[1.08] mb-8 tracking-tight"
            >
              Precision SEO
              <br />
              for the
              <br />
              <span className="text-[#c9a85c] italic">Discerning Brand.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-[#c8bfb0] max-w-xl mb-10 leading-relaxed"
            >
              80+ checks across your entire site. Real Google data. A professional report
              your team can execute immediately — not in weeks.
            </motion.p>
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              href="#audit-form"
              className="inline-flex items-center gap-2 bg-gradient-cta text-white rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
            >
              Start Your Free Scan
              <ArrowRight className="w-5 h-5" />
            </motion.a>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[#8a7f72] text-sm mt-6"
            >
              Complimentary homepage analysis &mdash; no credit card required
            </motion.p>
          </div>
        </div>
      </section>

      {/* What We Analyze */}
      <section id="features" className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Analysis Coverage</p>
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

      {/* Dark authority section — tool stats */}
      <section
        className="relative py-28 md:py-36 px-6 overflow-hidden"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#1a1209]/88" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="max-w-2xl mb-20">
            <p className="text-[#c9a85c] text-xs uppercase tracking-[0.2em] font-semibold mb-4">The Depth of the Analysis</p>
            <h2 className="font-serif text-3xl md:text-5xl text-[#f5f0e8] tracking-tight leading-tight">
              Not an estimate.
              <br />
              <span className="italic text-[#c9a85c]">The actual data.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#f5f0e8]/10 rounded-2xl overflow-hidden">
            {toolStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#1a1209]/60 px-10 py-12 text-center"
              >
                <p className="font-serif text-5xl md:text-6xl text-[#c9a85c] mb-3">{stat.value}</p>
                <p className="text-[#a09888] text-sm uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[#6a6058] text-sm mt-8 text-center">
            Every paid audit connects directly to Google Search Console, GA4, PageSpeed Insights, and CrUX API.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-background py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Process</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface tracking-tight">
              A Simple Process,
              <br />
              Powerful Results
            </h2>
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
                  <div className="w-14 h-14 rounded-full bg-gradient-cta text-white text-sm font-bold flex items-center justify-center mx-auto mb-6 relative z-10">
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

      {/* Free vs Full Comparison */}
      <section className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Compare</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">
              Free Scan vs. Full Audit
            </h2>
            <p className="text-on-surface-muted max-w-2xl mx-auto">
              The free scan gives you a quick snapshot. The full audit gives you the complete picture
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
                  'Homepage only (1 page)',
                  '80+ automated checks',
                  'Instant score & top issues',
                  'Basic schema detection',
                  'Lab-only performance data',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-on-surface-muted">
                    <Check className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                    {text}
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-white text-xs font-bold px-4 py-1 rounded-full">
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
                  { text: 'Deep schema audit + generated code', bold: false },
                  { text: 'Real Google Search Console data', bold: true },
                  { text: 'Google Analytics organic traffic data', bold: true },
                  { text: 'Real user Core Web Vitals (CrUX)', bold: true },
                  { text: 'Professional PDF report for stakeholders', bold: true },
                  { text: 'Prioritized action plan with revenue impact', bold: true },
                  { text: 'GitHub Issues & Jira ticket export', bold: true },
                  { text: 'Schema markup code ready to deploy', bold: false },
                ].map((item) => (
                  <li key={item.text} className={`flex items-start gap-3 text-sm ${item.bold ? 'text-on-surface' : 'text-on-surface-muted'}`}>
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item.text}
                  </li>
                ))}
              </ul>
              <a href="/checkout/professional" className="block w-full py-3.5 rounded-full font-semibold text-center bg-gradient-cta text-white hover:opacity-90 transition-opacity">
                Get Full Audit &rarr;
              </a>
              <p className="text-center text-xs text-on-surface-light mt-3">
                <span className="line-through">$15,000+</span> at a traditional agency
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Audit Form */}
      <section id="audit-form" className="bg-background py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Free Analysis</p>
          <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">
            Ready to See What&apos;s Possible?
          </h2>
          <p className="text-on-surface-muted mb-12 max-w-xl mx-auto leading-relaxed">
            Enter your website below for a complimentary homepage analysis.
            Your full report will be ready in under 60 seconds.
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

      {/* Pricing */}
      <section id="pricing" className="bg-surface-low py-28 md:py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Pricing</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">Transparent Investment</h2>
            <p className="text-on-surface-muted max-w-xl mx-auto">
              No hidden fees. No long-term contracts. Agency-quality SEO insights at a fraction of agency costs.
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-white text-xs font-bold px-4 py-1 rounded-full">
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
                      ? 'bg-gradient-cta text-white hover:opacity-90'
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

      {/* Final CTA — dark editorial */}
      <section
        className="relative py-28 md:py-36 px-6 overflow-hidden"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#1a1108]/82" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-3xl md:text-5xl text-[#f5f0e8] mb-6 tracking-tight"
          >
            Let&apos;s Refine Your
            <br />
            <span className="italic text-[#c9a85c]">Digital Footprint.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#c8bfb0] mb-10 max-w-xl mx-auto leading-relaxed"
          >
            Every day without clear SEO data is traffic left for competitors.
            Start with a free analysis today.
          </motion.p>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            href="#audit-form"
            className="inline-flex items-center gap-2 bg-gradient-cta text-white rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
          >
            Start Your Free Scan
            <ArrowRight className="w-5 h-5" />
          </motion.a>
        </div>
      </section>
    </>
  );
}
