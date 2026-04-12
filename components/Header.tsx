'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Services' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#results', label: 'Results' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-dark/90 backdrop-blur-md border-b border-warm-white/8' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-warm-white">
          What<span className="text-gold">SEO</span>
          <span className="text-warm-gray text-sm">.ai</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-warm-gray hover:text-warm-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#audit-form"
          className="hidden md:block bg-gold text-dark rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-gold-light transition-colors"
        >
          Free Scan
        </a>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-warm-gray hover:text-warm-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark border-t border-warm-white/8 px-6 py-6">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-warm-gray hover:text-warm-white transition-colors py-2"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#audit-form"
              onClick={() => setMobileOpen(false)}
              className="bg-gold text-dark rounded-full px-6 py-3 text-center font-semibold mt-2"
            >
              Free Scan
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
