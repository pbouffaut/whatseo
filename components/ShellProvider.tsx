'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// These routes get their own app shell — no marketing header/footer
const APP_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/audit-progress',
  '/profile-setup',
  '/admin',
  '/checkout/success',
];

export default function ShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isApp) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
