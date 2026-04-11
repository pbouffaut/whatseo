'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Code, Zap, BookOpen, Bot } from 'lucide-react';
import UrlForm from '@/components/UrlForm';

const features = [
  { icon: Shield, title: 'Technical SEO', desc: 'Crawlability, indexability, security headers, redirects, and HTTPS configuration.' },
  { icon: FileText, title: 'On-Page SEO', desc: 'Title tags, meta descriptions, heading structure, and internal linking analysis.' },
  { icon: Code, title: 'Schema Markup', desc: 'JSON-LD detection, validation, and structured data scoring for rich results.' },
  { icon: Zap, title: 'Performance', desc: 'Core Web Vitals, PageSpeed Insights, load times, and resource optimization.' },
  { icon: BookOpen, title: 'Content Quality', desc: 'E-E-A-T signals, readability, content depth, and authority indicators.' },
  { icon: Bot, title: 'AI Search Ready', desc: 'llms.txt compliance, AI crawler access, citability, and AI Overview optimization.' },
];

const steps = [
  { num: '01', title: 'Enter your URL', desc: 'Paste your website and we handle the rest.' },
  { num: '02', title: 'AI analyzes everything', desc: '47 checks across 7 categories in under 10 minutes.' },
  { num: '03', title: 'Get your report', desc: 'Professional PDF with scores, issues, and action plan.' },
];

const pricing = [
  {
    name: 'Instant Audit',
    price: '$299',
    period: 'one-time',
    features: ['Full site analysis', 'Professional PDF report', 'Prioritized action plan', '47-criteria scoring', 'Schema recommendations'],
    cta: 'Get Your Audit',
    active: true,
    highlighted: true,
  },
  {
    name: 'Monthly Monitor',
    price: '$499',
    period: '/month',
    features: ['Everything in Instant', 'Monthly trend tracking', 'Slack notifications', 'Score change alerts', 'Competitor tracking'],
    cta: 'Coming Soon',
    active: false,
    highlighted: false,
  },
  {
    name: 'Full Service',
    price: '$2,500',
    period: '/quarter',
    features: ['Everything in Monthly', 'Dev-ready code components', 'Sprint-ready tickets', 'Implementation support', 'Priority Slack channel'],
    cta: 'Coming Soon',
    active: false,
    highlighted: false,
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section id="hero" className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            Your website&apos;s SEO score
            <br />
            <span className="text-gold">in 10 minutes</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            AI-powered analysis across 47 criteria. Professional PDF report with scores,
            issues, and a prioritized action plan. No agency needed.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <UrlForm />
          </motion.div>
          <p className="text-sm text-gray-600 mt-4">No credit card required for beta</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ['47', 'Criteria Analyzed'],
            ['7', 'SEO Categories'],
            ['10', 'Minute Delivery'],
            ['PDF', 'Report Included'],
          ].map(([num, label]) => (
            <div key={label}>
              <div className="text-3xl font-bold text-gold">{num}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything an agency charges <span className="text-gold">$15K</span> for
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Comprehensive analysis that would take a team of SEO consultants weeks to produce.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-navy-light rounded-xl border border-white/5 p-6 hover:border-gold/20 transition-colors"
              >
                <f.icon className="w-8 h-8 text-gold mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-navy-light/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Three steps to <span className="text-gold">better SEO</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full border-2 border-gold text-gold text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
            No hidden fees. No long-term contracts. Pay for what you need.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`rounded-xl p-8 flex flex-col ${
                  p.highlighted
                    ? 'bg-navy-light border-2 border-gold relative'
                    : 'bg-navy-light border border-white/5'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2">{p.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-gray-500 ml-1">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-gold mt-0.5">{'\u2713'}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={!p.active}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    p.active
                      ? 'bg-gold text-navy hover:bg-gold-light'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
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
      <section className="py-24 px-6 bg-navy-light/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to see your <span className="text-gold">score</span>?
          </h2>
          <p className="text-gray-400 mb-10">
            Enter your URL and get a comprehensive SEO audit in minutes.
          </p>
          <div className="flex justify-center">
            <UrlForm />
          </div>
        </div>
      </section>
    </>
  );
}
