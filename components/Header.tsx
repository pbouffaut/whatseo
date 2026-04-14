'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu, X, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const publicLinks = [
    { href: '#features', label: 'Services' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#results', label: 'Results' },
    { href: '#pricing', label: 'Pricing' },
  ];

  const authLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/onboarding', label: 'Settings' },
  ];

  const navLinks = user ? authLinks : publicLinks;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-ambient' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-icon.svg" alt="" width={32} height={32} priority />
          <span className="text-xl font-bold text-on-surface">
            What<span className="text-primary">SEO</span><span className="text-on-surface-light text-sm">.ai</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-on-surface-muted hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {user ? (
          <div className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-primary transition-colors">
              <User className="w-4 h-4" />
              {user.email?.split('@')[0]}
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-on-surface-light hover:text-on-surface transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-on-surface-muted hover:text-primary transition-colors">
              Sign In
            </Link>
            <a
              href="#audit-form"
              className="bg-gradient-cta text-on-primary rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Free Scan
            </a>
          </div>
        )}

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-on-surface-muted hover:text-on-surface"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden glass px-6 py-6">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-on-surface-muted hover:text-primary transition-colors py-2"
              >
                {link.label}
              </a>
            ))}
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="text-on-surface-muted hover:text-on-surface text-left py-2"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  className="text-on-surface-muted hover:text-primary py-2">Sign In</Link>
                <a href="#audit-form" onClick={() => setMobileOpen(false)}
                  className="bg-gradient-cta text-on-primary rounded-full px-6 py-3 text-center font-semibold mt-2">
                  Free Scan
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
