'use client';

import { motion } from 'framer-motion';
import {
  Check, ArrowRight, ChevronDown,
  FileText, Globe, Code, Zap, Shield, BarChart2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const plans = [
  {
    name: 'Professional Audit',
    slug: 'professional',
    price: '$499',
    period: 'one-time',
    commitment: null,
    highlighted: false,
    description: 'A complete, one-time deep-dive into your entire site. Everything you need to build and execute an SEO roadmap.',
    features: [
      'Full site crawl — up to 1,000 pages',
      '80+ checks across all 7 dimensions',
      'Real Google Search Console data',
      'Google Analytics 4 integration',
      'Real user Core Web Vitals (CrUX)',
      'Professional PDF report',
      'Prioritized action plan (Critical → Backlog)',
      'AI-generated executive summary',
      'GitHub Issues & Jira ticket export',
      'Copy-paste schema markup templates',
      'AI Search readiness score',
      'Revenue impact estimates per fix',
    ],
    cta: 'Get Your Audit',
  },
  {
    name: 'Monthly Monitor',
    slug: 'monthly',
    price: '$299',
    period: '/month',
    commitment: '12-month agreement',
    highlighted: true,
    description: 'All the power of the Professional audit, re-run every month so you can track progress and catch regressions immediately.',
    features: [
      'Everything in Professional',
      'Monthly automated re-audits',
      'Score trend chart across all dimensions',
      'Degradation alerts (email + Slack)',
      'GSC watchdog — weekly keyword rank changes',
      'Monitoring dashboard',
      'Month-over-month comparison reports',
      'Priority email support',
    ],
    cta: 'Subscribe Now',
  },
  {
    name: 'Bi-Monthly Monitor',
    slug: 'bimonthly',
    price: '$399',
    period: '/2 months',
    commitment: '12-month agreement',
    highlighted: false,
    description: 'Comprehensive monitoring on a bi-monthly cadence — ideal for teams that ship major updates every 6–8 weeks.',
    features: [
      'Everything in Professional',
      'Audit every 2 months',
      'Score trend chart across all dimensions',
      'Degradation alerts (email + Slack)',
      'GSC watchdog — weekly keyword rank changes',
      'Monitoring dashboard',
      'Bi-monthly comparison reports',
      'Priority email support',
    ],
    cta: 'Subscribe Now',
  },
];

const included = [
  { icon: Globe, text: 'Full site crawl (up to 1,000 pages)' },
  { icon: Shield, text: '80+ technical and on-page checks' },
  { icon: BarChart2, text: 'Real Google Search Console & GA4 data' },
  { icon: Zap, text: 'Core Web Vitals — lab and real user data' },
  { icon: FileText, text: 'Professional PDF report for stakeholders' },
  { icon: Code, text: 'GitHub Issues & Jira ticket export' },
  { icon: RefreshCw, text: 'AI Search readiness (ChatGPT, Perplexity, AI Overviews)' },
];

const faqs = [
  {
    q: 'Is there a free option?',
    a: 'Yes — enter any URL on our homepage for a free homepage-only scan. You\'ll get an overall health score and a preview of the top issues. No credit card or account required.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. Payments are secure and PCI-compliant.',
  },
  {
    q: 'Can I cancel a subscription?',
    a: 'You can pause or cancel anytime from your dashboard. Monthly and Bi-Monthly plans are 12-month agreements — cancellations stop future billing at the end of your current period.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If your audit fails to complete due to a technical issue on our end, we reissue your audit credit automatically. We don\'t offer refunds for completed audits, but we\'ll work with you if something doesn\'t meet your expectations.',
  },
  {
    q: 'Do you offer agency or volume pricing?',
    a: 'Yes — if you\'re running multiple audits per month for clients, contact us for custom volume pricing. We work with agencies of all sizes.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-outline/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-primary transition-colors"
      >
        <span className="font-semibold text-on-surface">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-on-surface-light shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-on-surface-muted leading-relaxed text-sm">{a}</p>
      )}
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function PricingContent() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'WhatSEO.ai Pricing Plans',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Offer',
          name: 'Professional SEO Audit',
          description: 'Full site SEO audit — up to 1,000 pages, 80+ checks, PDF report, GitHub/Jira export.',
          price: '499',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '499',
            priceCurrency: 'USD',
            unitText: 'one-time',
          },
          url: 'https://whatseo.ai/checkout/professional',
        },
      },
      {
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'Offer',
          name: 'Monthly Monitor',
          description: 'Monthly automated SEO re-audits with score trend tracking and degradation alerts.',
          price: '299',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '299',
            priceCurrency: 'USD',
            unitText: 'month',
            billingIncrement: 1,
          },
          url: 'https://whatseo.ai/checkout/monthly',
        },
      },
      {
        '@type': 'ListItem',
        position: 3,
        item: {
          '@type': 'Offer',
          name: 'Bi-Monthly Monitor',
          description: 'SEO monitoring audit every 2 months with trend tracking and alerts.',
          price: '399',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '399',
            priceCurrency: 'USD',
            unitText: 'two months',
            billingIncrement: 2,
          },
          url: 'https://whatseo.ai/checkout/bimonthly',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — editorial photography */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1920&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1108]/88 via-[#1c1510]/80 to-[#0e0c08]/75" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-28 pb-20 text-center w-full">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#c9a85c] text-xs uppercase tracking-[0.2em] font-semibold mb-6"
          >
            Pricing
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#f5f0e8] leading-[1.08] mb-8 tracking-tight"
          >
            Transparent Pricing.
            <br />
            <span className="italic text-[#c9a85c]">No Retainers. No Surprises.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-[#c8bfb0] max-w-2xl mx-auto leading-relaxed"
          >
            Agency-quality SEO insights without the agency price tag.
            Pay once for a deep-dive audit, or subscribe for continuous monitoring.
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-surface-low py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.slug}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className={`bg-surface-white rounded-[1.5rem] shadow-ambient p-8 flex flex-col relative ${
                  plan.highlighted ? 'ring-2 ring-primary' : 'border border-outline/30'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-on-primary text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <h2 className="text-lg font-semibold text-on-surface mb-2">{plan.name}</h2>
                <div className="mb-2 flex items-end gap-1">
                  <span className="text-4xl font-bold text-on-surface">{plan.price}</span>
                  <span className="text-on-surface-light mb-1">{plan.period}</span>
                </div>
                {plan.commitment ? (
                  <p className="text-xs text-primary font-medium mb-4">{plan.commitment}</p>
                ) : (
                  <div className="mb-4" />
                )}
                <p className="text-sm text-on-surface-muted leading-relaxed mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-on-surface-muted">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/checkout/${plan.slug}`}
                  className={`block w-full py-3.5 rounded-full font-semibold text-center transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-cta text-on-primary hover:opacity-90'
                      : 'bg-surface-high text-on-surface hover:bg-surface-highest'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-background py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Included in Every Audit</p>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface tracking-tight">No Stripped-Down Tiers</h2>
            <p className="text-on-surface-muted mt-4 max-w-lg mx-auto leading-relaxed">
              Every paid audit includes the full analysis. The only difference between plans is the monitoring cadence.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4">
            {included.map((item, i) => (
              <motion.div
                key={item.text}
                {...fadeUp}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 bg-surface-white rounded-[1.5rem] border border-outline/30 px-6 py-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-on-surface-muted text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface-low py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="mb-12">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">FAQ</p>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface tracking-tight">Pricing Questions</h2>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.1 }}
            className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 px-8"
          >
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-4 tracking-tight">
              Not Sure? Start Free.
            </h2>
            <p className="text-on-surface-muted mb-10 leading-relaxed">
              Try the free homepage scan first — no credit card, no account. See the quality
              of our analysis before you commit to anything.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#audit-form"
                className="inline-flex items-center justify-center gap-2 bg-gradient-cta text-on-primary rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
              >
                Try the Free Scan First
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-surface-high text-on-surface rounded-full px-10 py-4 text-lg font-semibold hover:bg-surface-highest transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
