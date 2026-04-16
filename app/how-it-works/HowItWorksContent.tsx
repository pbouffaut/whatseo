'use client';

import { motion } from 'framer-motion';
import {
  Link2, Search, FileText, ArrowRight,
  Globe, Code, Zap, BookOpen, Image, Bot, Shield,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const steps = [
  {
    num: '01',
    icon: Link2,
    title: 'Enter Your URL',
    subtitle: 'Just your domain — we handle the rest',
    details: [
      'Free scan analyzes your homepage only — instant results, no account needed.',
      'Full audit crawls up to 1,000 pages of your site automatically.',
      'Optionally connect Google Search Console and GA4 for real traffic data.',
      'Works on any site: SaaS, e-commerce, agencies, local businesses.',
    ],
  },
  {
    num: '02',
    icon: Search,
    title: 'We Analyze Everything',
    subtitle: '80+ checks across 7 dimensions',
    details: [
      '80+ automated checks covering Technical, On-Page, Schema, Performance, Content, Images, and AI Readiness.',
      'Connects to Google Search Console for real impressions, clicks, and average position data.',
      'Runs Lighthouse and PageSpeed Insights via Google API for lab and field performance metrics.',
      'AI generates an executive summary, deep-dive findings, and schema templates.',
      'Generates GitHub Issues and Jira tickets pre-filled with the exact fix needed.',
    ],
  },
  {
    num: '03',
    icon: FileText,
    title: 'Act on Your Report',
    subtitle: 'A prioritized action plan your team can execute today',
    details: [
      'Professional PDF with scoring across all 7 dimensions — shareable with stakeholders.',
      'Prioritized action plan: Critical issues → Quick wins → Medium priority → Backlog.',
      'Copy-paste schema markup templates ready to deploy.',
      'One-click export to GitHub Issues or Jira — assign tickets in seconds.',
      'Monthly monitoring with score trend tracking and degradation alerts.',
    ],
  },
];

const categories = [
  {
    icon: Shield,
    label: 'Technical',
    color: 'text-secondary',
    bg: 'bg-secondary-container/30',
    checks: [
      'Crawlability & robots.txt',
      'Canonical URL consistency',
      'HTTPS and security headers',
      'Broken links and redirect chains',
    ],
  },
  {
    icon: BookOpen,
    label: 'On-Page',
    color: 'text-primary',
    bg: 'bg-primary-fixed/40',
    checks: [
      'Title tags and meta descriptions',
      'Heading hierarchy (H1–H6)',
      'Internal linking structure',
      'Duplicate content detection',
    ],
  },
  {
    icon: Code,
    label: 'Schema',
    color: 'text-tertiary',
    bg: 'bg-tertiary-fixed/40',
    checks: [
      'Structured data validation',
      'Missing schema opportunities',
      'Rich result eligibility',
      'JSON-LD code generation',
    ],
  },
  {
    icon: Zap,
    label: 'Performance',
    color: 'text-primary',
    bg: 'bg-primary-fixed/40',
    checks: [
      'Core Web Vitals (LCP, CLS, INP)',
      'Real user data via CrUX',
      'Lighthouse scores per page',
      'Resource loading and compression',
    ],
  },
  {
    icon: BookOpen,
    label: 'Content',
    color: 'text-secondary',
    bg: 'bg-secondary-container/30',
    checks: [
      'E-E-A-T signal detection',
      'Thin and duplicate content',
      'Keyword coverage and depth',
      'Readability and structure',
    ],
  },
  {
    icon: Image,
    label: 'Images',
    color: 'text-tertiary',
    bg: 'bg-tertiary-fixed/40',
    checks: [
      'Alt text completeness',
      'File size and format audit',
      'Lazy loading implementation',
      'Next-gen format recommendations',
    ],
  },
  {
    icon: Bot,
    label: 'AI Readiness',
    color: 'text-primary',
    bg: 'bg-primary-fixed/40',
    checks: [
      'ChatGPT & Perplexity citability',
      'AI Overview eligibility signals',
      'llms.txt presence and config',
      'AI crawler access (GPTBot, etc.)',
    ],
  },
];

const faqs = [
  {
    q: 'How long does a full audit take?',
    a: 'Typically 3–8 minutes depending on site size. A 100-page site usually completes in under 4 minutes. A 1,000-page crawl may take closer to 8 minutes. We\'ll email you when it\'s ready.',
  },
  {
    q: 'Do I need to connect Google Search Console?',
    a: 'No — Google data is optional but highly recommended. Without it, we use lab-only performance data and estimated traffic signals. With it, you get real impressions, clicks, and average ranking positions for every page.',
  },
  {
    q: 'What\'s the difference between the free scan and a paid audit?',
    a: 'The free scan analyzes your homepage only and shows you a summary of the top findings — no PDF, no full action plan. A paid audit crawls up to 1,000 pages, pulls real Google data, generates a professional PDF, prioritized action plan, schema templates, and GitHub/Jira ticket export.',
  },
  {
    q: 'Can I use this for client sites as an agency?',
    a: 'Yes. Each audit is a standalone report you can download and share with clients. We also offer volume pricing for agencies running multiple audits per month — contact us for details.',
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

export default function HowItWorksContent() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative bg-background pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(242,140,40,0.07),transparent_70%)]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-6"
          >
            How It Works
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl text-on-surface leading-[1.08] mb-8 tracking-tight"
          >
            Professional SEO Analysis
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
              in 3 Steps
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-on-surface-muted max-w-2xl leading-relaxed"
          >
            No agency. No waiting weeks. No $5,000 invoice.
            Just a clear, actionable report your team can execute immediately.
          </motion.p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-surface-low py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                {...fadeUp}
                transition={{ delay: i * 0.12 }}
                className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-8 items-start"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-gradient-cta text-on-primary text-xl font-bold flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                </div>
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl text-on-surface mb-1 tracking-tight">{step.title}</h2>
                  <p className="text-primary font-medium text-sm mb-5">{step.subtitle}</p>
                  <ul className="space-y-2.5">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-start gap-3 text-on-surface-muted text-sm leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Check */}
      <section className="bg-background py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="mb-16">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Coverage</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">What We Check</h2>
            <p className="text-on-surface-muted max-w-xl leading-relaxed">
              80+ individual checks organized across 7 dimensions of SEO health — from low-level technical
              infrastructure to cutting-edge AI search readiness.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                {...fadeUp}
                transition={{ delay: i * 0.08 }}
                className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-6"
              >
                <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center mb-4`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-on-surface mb-3">{cat.label}</h3>
                <ul className="space-y-1.5">
                  {cat.checks.map((c) => (
                    <li key={c} className="text-xs text-on-surface-muted flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-outline mt-1.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
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
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface tracking-tight">Common Questions</h2>
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
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-6 tracking-tight">
              See It for Yourself
            </h2>
            <p className="text-on-surface-muted mb-10 leading-relaxed">
              Start with a free homepage scan — no credit card, no sales call, results in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#audit-form"
                className="inline-flex items-center justify-center gap-2 bg-gradient-cta text-on-primary rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
              >
                Run Your Free Scan
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-surface-high text-on-surface rounded-full px-10 py-4 text-lg font-semibold hover:bg-surface-highest transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
