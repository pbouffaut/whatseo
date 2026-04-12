import { notFound } from 'next/navigation';
import { services, getServiceBySlug } from '@/lib/services-data';
import Link from 'next/link';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.headline} | WhatSEO.ai`,
    description: service.description,
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <>
      {/* Hero */}
      <section className="bg-dark pt-32 pb-20 md:pb-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Our Services</p>
          <h1 className="font-serif text-4xl md:text-6xl text-warm-white mb-6">{service.headline}</h1>
          <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">{service.description}</p>
        </div>
      </section>

      {/* What We Check */}
      <section className="bg-cream py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Methodology</p>
            <h2 className="font-serif text-3xl md:text-4xl text-dark">What We Check</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {service.checks.map((check) => (
              <div key={check.title}>
                <div className="w-10 h-0.5 bg-gold mb-5" />
                <h3 className="text-lg font-semibold text-dark mb-3">{check.title}</h3>
                <p className="text-dark/60 text-sm leading-relaxed">{check.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="bg-dark-warm py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Impact</p>
          <h2 className="font-serif text-3xl md:text-4xl text-warm-white mb-8">Why It Matters</h2>
          <p className="text-warm-gray text-lg leading-relaxed">{service.whyItMatters}</p>
        </div>
      </section>

      {/* Sample Findings */}
      <section className="bg-cream py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Real Examples</p>
            <h2 className="font-serif text-3xl md:text-4xl text-dark">Issues We Commonly Find</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {service.findings.map((finding, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md border border-cream-dark p-8">
                <div className="w-8 h-8 rounded-full bg-[#e05555]/10 flex items-center justify-center mb-5">
                  <span className="text-[#e05555] text-sm font-bold">!</span>
                </div>
                <h3 className="text-dark font-semibold mb-3 text-sm leading-snug">{finding.issue}</h3>
                <p className="text-dark/50 text-sm leading-relaxed">{finding.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-warm py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-warm-white mb-6">
            Ready to check your<br />
            <span className="text-gold">{service.name.toLowerCase()}</span>?
          </h2>
          <p className="text-warm-gray mb-10 max-w-xl mx-auto leading-relaxed">
            Start with a free homepage analysis, or get the full picture with a comprehensive audit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#audit-form"
              className="bg-gold text-dark rounded-full px-10 py-4 text-lg font-semibold hover:bg-gold-light transition-colors"
            >
              Start Your Free Scan
            </Link>
            <Link
              href="/#pricing"
              className="bg-warm-white/5 text-warm-white rounded-full px-10 py-4 text-lg font-semibold hover:bg-warm-white/10 transition-colors border border-warm-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
