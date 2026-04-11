import { Globe, Mail, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark border-t border-warm-white/8 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="text-xl font-bold text-warm-white mb-3">
              What<span className="text-gold">SEO</span>
              <span className="text-warm-gray text-sm">.ai</span>
            </div>
            <p className="text-warm-gray text-sm leading-relaxed">
              Expert-level SEO insights delivered in minutes. Professional analysis your team can act on.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-warm-white text-sm uppercase tracking-wider font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              {['SEO Audit', 'Technical Analysis', 'Content Review', 'Schema Markup', 'Performance', 'AI Readiness'].map((item) => (
                <li key={item}>
                  <span className="text-warm-gray hover:text-warm-white text-sm transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-warm-white text-sm uppercase tracking-wider font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {['About', 'How It Works', 'Pricing', 'Contact'].map((item) => (
                <li key={item}>
                  <span className="text-warm-gray hover:text-warm-white text-sm transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-warm-white text-sm uppercase tracking-wider font-semibold mb-4">Connect</h4>
            <div className="flex gap-4 mb-6">
              {[Globe, Mail, ExternalLink].map((Icon, i) => (
                <span key={i} className="text-warm-gray hover:text-gold transition-colors cursor-pointer">
                  <Icon className="w-5 h-5" />
                </span>
              ))}
            </div>
            <p className="text-warm-gray text-sm mb-3">Stay updated</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 bg-warm-white/5 border border-warm-white/10 rounded-full px-4 py-2 text-sm text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold"
              />
              <button className="bg-gold text-dark rounded-full px-4 py-2 text-sm font-semibold hover:bg-gold-light transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-warm-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-warm-gray-light text-xs">&copy; 2026 WhatSEO.ai. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="text-warm-gray-light text-xs hover:text-warm-gray cursor-pointer">Privacy Policy</span>
            <span className="text-warm-gray-light text-xs hover:text-warm-gray cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
