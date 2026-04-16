import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#f5f0e8]">
      {/* Top nav */}
      <nav className="border-b border-[#2e2e2e] bg-[#1a1a1a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-[#c9a85c] font-semibold tracking-wide text-sm uppercase">
              WhatSEO Admin
            </span>
            <div className="flex items-center gap-1">
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-sm text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a] transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/admin/customers"
                className="px-3 py-1.5 rounded-lg text-sm text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a] transition-colors"
              >
                Customers
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#a09888] text-xs">{user.email}</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-sm text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
