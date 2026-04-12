import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'WhatSEO.ai Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Legal</p>
        <h1 className="font-serif text-4xl text-warm-white mb-3">Privacy Policy</h1>
        <p className="text-warm-gray-light text-sm mb-12">Last updated: April 12, 2026</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">1. Introduction</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              WhatSEO.ai (&quot;WhatSEO&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is an AI-powered SEO analysis platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and services at whatseo.ai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-warm-white mt-4 mb-2">2.1 Account Information</h3>
            <p className="text-warm-gray text-sm leading-relaxed">
              When you create an account, we collect your email address and name. If you sign in with Google, we receive your Google profile information (name and email) as authorized by you.
            </p>

            <h3 className="text-lg font-medium text-warm-white mt-4 mb-2">2.2 Website Data You Provide</h3>
            <p className="text-warm-gray text-sm leading-relaxed">
              When you use our audit service, you provide your website URL, and optionally: competitor URLs, priority pages, and a Google Analytics property ID. We use this data solely to perform SEO analysis on your behalf.
            </p>

            <h3 className="text-lg font-medium text-warm-white mt-4 mb-2">2.3 Google API Data</h3>
            <p className="text-warm-gray text-sm leading-relaxed">
              With your explicit consent, we access the following Google services using OAuth 2.0:
            </p>
            <ul className="text-warm-gray text-sm leading-relaxed list-disc list-inside mt-2 space-y-1">
              <li><strong>Google Search Console</strong> (read-only): We access your search performance data including queries, clicks, impressions, and page rankings for the last 90 days. This data is used exclusively within your SEO audit report.</li>
              <li><strong>Google Analytics (GA4)</strong> (read-only): We access your organic traffic data including sessions, engagement rates, and top landing pages. This data is used exclusively within your SEO audit report.</li>
            </ul>
            <p className="text-warm-gray text-sm leading-relaxed mt-2">
              We request only read-only access. We never modify your Google Search Console or Analytics data. You can revoke access at any time from your <a href="https://myaccount.google.com/permissions" className="text-gold hover:text-gold-light">Google Account permissions page</a>.
            </p>

            <h3 className="text-lg font-medium text-warm-white mt-4 mb-2">2.4 Automatically Collected Data</h3>
            <p className="text-warm-gray text-sm leading-relaxed">
              We collect standard web analytics data including IP address, browser type, and pages visited. We use this to improve our service and do not sell this data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">3. How We Use Your Data</h2>
            <ul className="text-warm-gray text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>To perform SEO audits on websites you specify</li>
              <li>To generate professional reports with your audit results</li>
              <li>To send you audit reports via email</li>
              <li>To display your audit history in your dashboard</li>
              <li>To improve our analysis algorithms and service quality</li>
            </ul>
            <p className="text-warm-gray text-sm leading-relaxed mt-2">
              We do <strong>not</strong> use your data for advertising, sell it to third parties, or share it with anyone outside of providing our service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">4. Data Storage and Security</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              Your data is stored securely using Supabase (PostgreSQL) with Row Level Security ensuring each user can only access their own data. All data is encrypted in transit using TLS 1.3. Google OAuth tokens are stored encrypted in our database and are used only to fetch data for your audits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">5. Data Retention</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              Audit results are retained for as long as your account is active. You can request deletion of your data at any time by contacting us. Google OAuth tokens are retained only while your Google integration is connected; disconnecting removes the tokens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">6. Third-Party Services</h2>
            <ul className="text-warm-gray text-sm leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Supabase</strong>: Database hosting and authentication</li>
              <li><strong>Vercel</strong>: Application hosting</li>
              <li><strong>Trigger.dev</strong>: Background task processing</li>
              <li><strong>Google APIs</strong>: Search Console and Analytics data (with your consent)</li>
              <li><strong>Resend</strong>: Email delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">7. Your Rights</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              You have the right to: access your personal data, correct inaccurate data, delete your account and all associated data, export your audit reports, and revoke Google API access at any time. To exercise these rights, contact us at hello@whatseo.ai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">8. Google API Services User Data Policy</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              WhatSEO.ai&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-gold hover:text-gold-light">Google API Services User Data Policy</a>, including the Limited Use requirements. We only use Google data to provide and improve the SEO audit features you explicitly requested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">9. Contact</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              For any privacy-related questions or requests, contact us at <a href="mailto:hello@whatseo.ai" className="text-gold hover:text-gold-light">hello@whatseo.ai</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-warm-white/8">
          <Link href="/" className="text-gold text-sm hover:text-gold-light">&larr; Back to home</Link>
        </div>
      </div>
    </div>
  );
}
