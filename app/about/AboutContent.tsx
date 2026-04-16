'use client';

import { motion } from 'framer-motion';
import { Database, GitBranch, Bot, ArrowRight, Heart, Shield, Users } from 'lucide-react';
import Link from 'next/link';

const differentiators = [
  {
    icon: Database,
    title: 'Real Data, Not Estimates',
    desc: 'We pull directly from Google Search Console, PageSpeed Insights, and Google Analytics 4. Every finding is grounded in your actual traffic, rankings, and Core Web Vitals — no guesswork, no invented benchmarks.',
  },
  {
    icon: GitBranch,
    title: 'Actionable by Design',
    desc: 'Every finding comes with a specific, copy-paste fix. We generate GitHub Issues and Jira tickets pre-filled with the exact change needed — so your dev team can start shipping improvements the same day.',
  },
  {
    icon: Bot,
    title: 'AI-Ready Analysis',
    desc: 'We check your site against how ChatGPT, Perplexity, and AI Overviews discover and cite content — including llms.txt, AI crawler access, and entity structure. Most agencies don\'t even know this exists yet.',
  },
];

const values = [
  {
    icon: Shield,
    title: 'We never sell your data',
    desc: 'Your site data, Google connections, and reports are yours. We don\'t share, sell, or use your data to train models.',
  },
  {
    icon: Heart,
    title: 'Obsessed with accuracy',
    desc: 'We\'d rather show you fewer findings that are definitely true than 300 items that waste your team\'s time.',
  },
  {
    icon: Users,
    title: 'Built for teams, not just SEOs',
    desc: 'Our reports are designed to be read and acted on by developers, marketers, and founders — not just SEO specialists.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function AboutContent() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-background pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(242,140,40,0.07),transparent_70%)]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-6"
          >
            Our Story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl text-on-surface leading-[1.08] mb-8 tracking-tight"
          >
            We Believe Every Website
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
              Deserves Expert SEO
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-on-surface-muted max-w-2xl leading-relaxed"
          >
            Expert SEO analysis used to cost $5,000–$15,000 from agencies — and the deliverable was
            often a PDF full of screenshots and vague recommendations. We built something better.
          </motion.p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-surface-low py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp}>
              <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">How It Started</p>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6 tracking-tight">
                Built by developers who were tired of vague SEO advice
              </h2>
              <p className="text-on-surface-muted leading-relaxed mb-4">
                Every SEO tool we tried either required a $500/month subscription for basic features,
                surfaced the same 12 issues every site has, or handed us a report that was impossible
                to act on without spending another $10,000 on implementation.
              </p>
              <p className="text-on-surface-muted leading-relaxed">
                So we built the tool we wished existed: one that pulls real data from Google,
                understands the difference between a critical blocking issue and a minor tweak,
                and delivers findings your engineering team can turn into a pull request today.
              </p>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ delay: 0.15 }}
              className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-8"
            >
              <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-6">Our Mission</p>
              <blockquote className="font-serif text-2xl text-on-surface leading-snug mb-6">
                &ldquo;Make professional SEO analysis accessible to every team, at any budget.&rdquo;
              </blockquote>
              <p className="text-on-surface-muted text-sm leading-relaxed">
                Whether you&apos;re a two-person startup or a 200-person SaaS company, you deserve
                the same quality of analysis that Fortune 500 companies get from boutique agencies —
                delivered in minutes, not weeks, at a fraction of the cost.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="bg-background py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="mb-20">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Why WhatSEO.ai</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface tracking-tight">What Makes Us Different</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-8"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed/40 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">{item.title}</h3>
                <p className="text-on-surface-muted leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team & Values */}
      <section className="bg-surface-low py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <p className="text-secondary text-xs uppercase tracking-[0.2em] font-semibold mb-4">Our Values</p>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-4 tracking-tight">
              Small Team. High Standards.
            </h2>
            <p className="text-on-surface-muted max-w-xl mx-auto leading-relaxed">
              We&apos;re a small team of engineers and growth practitioners who care deeply about
              the quality of our output. No outsourced analysis, no AI-generated fluff.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary-fixed/40 flex items-center justify-center mx-auto mb-5">
                  <v.icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-on-surface text-lg mb-2">{v.title}</h3>
                <p className="text-on-surface-muted text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface mb-6 tracking-tight">
              Ready to See What&apos;s
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
                Holding You Back?
              </span>
            </h2>
            <p className="text-on-surface-muted mb-10 max-w-lg mx-auto leading-relaxed">
              Start with a free homepage analysis — no credit card, no sales call.
              Just honest, expert-level SEO findings in minutes.
            </p>
            <Link
              href="/#audit-form"
              className="inline-flex items-center gap-2 bg-gradient-cta text-on-primary rounded-full px-10 py-4 text-lg font-semibold hover:opacity-90 transition-opacity hover:scale-[1.02] transform"
            >
              Run Your Free Scan
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
