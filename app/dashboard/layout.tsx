import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const displayName = user.user_metadata?.full_name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'you';

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">
      {/* App top bar — clearly distinct from the marketing header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          {/* Logo + app label */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Image src="/logo-icon.svg" alt="" width={26} height={26} />
            <span className="text-sm font-bold text-slate-800">
              What<span className="text-[#c9a85c]">SEO</span>
              <span className="text-slate-400">.ai</span>
            </span>
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 leading-none">
              App
            </span>
          </Link>

          {/* Right side: nav + user */}
          <div className="flex items-center gap-1">
            <Link
              href="/onboarding"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Settings
            </Link>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <span className="text-xs text-slate-400 hidden sm:block mr-2">{displayName}</span>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              ← Website
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        {children}
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        WhatSEO.ai · <Link href="/privacy" className="hover:text-slate-600">Privacy</Link> · <Link href="/contact" className="hover:text-slate-600">Help</Link>
      </footer>
    </div>
  );
}
