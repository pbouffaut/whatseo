import Link from 'next/link';
import Image from 'next/image';
import { Globe, Mail, ExternalLink } from 'lucide-react';

const serviceLinks = [
  { name: 'SEO Audit', slug: 'seo-audit' },
  { name: 'Technical Analysis', slug: 'technical-analysis' },
  { name: 'Content Review', slug: 'content-review' },
  { name: 'Schema Markup', slug: 'schema-markup' },
  { name: 'Performance', slug: 'performance' },
  { name: 'AI Readiness', slug: 'ai-readiness' },
];

export default function Footer() {
  return (
    <footer className="bg-surface-high pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo-icon.svg" alt="" width={28} height={28} />
              <span className="text-xl font-bold text-on-surface">
                What<span className="text-primary">SEO</span><span className="text-on-surface-light text-sm">.ai</span>
              </span>
            </div>
            <p className="text-on-surface-muted text-sm leading-relaxed">
              Expert-level SEO insights delivered in minutes. Professional analysis your team can act on.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-secondary text-xs uppercase tracking-[0.15em] font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((item) => (
                <li key={item.slug}>
                  <Link href={`/services/${item.slug}`} className="text-on-surface-muted hover:text-primary text-sm transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-secondary text-xs uppercase tracking-[0.15em] font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: 'About', href: '/about' },
                { label: 'How It Works', href: '/how-it-works' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-on-surface-muted hover:text-primary text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-secondary text-xs uppercase tracking-[0.15em] font-semibold mb-4">Connect</h4>
            <div className="flex gap-4 mb-6">
              {[Globe, Mail, ExternalLink].map((Icon, i) => (
                <span key={i} className="text-on-surface-light hover:text-primary transition-colors cursor-pointer">
                  <Icon className="w-5 h-5" />
                </span>
              ))}
            </div>
            <p className="text-on-surface-muted text-sm mb-3">Stay updated</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 bg-surface-low border-ghost rounded-full px-4 py-2 text-sm text-on-surface placeholder-on-surface-light focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button className="bg-gradient-cta text-on-primary rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar — no border, use spacing */}
        <div className="pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-light text-xs">&copy; 2026 WhatSEO.ai. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-on-surface-light text-xs hover:text-primary">Privacy Policy</Link>
            <Link href="/terms" className="text-on-surface-light text-xs hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
