import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'WhatSEO.ai Terms of Service — terms and conditions for using our SEO audit platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-4">Legal</p>
        <h1 className="font-serif text-4xl text-warm-white mb-3">Terms of Service</h1>
        <p className="text-warm-gray-light text-sm mb-12">Last updated: April 12, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              By accessing or using WhatSEO.ai (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">2. Description of Service</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              WhatSEO.ai is an AI-powered SEO analysis platform that audits websites across multiple criteria and provides scored reports with prioritized recommendations. The Service includes free homepage scans and paid comprehensive audits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">3. User Accounts</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">4. Audit Credits and Payments</h2>
            <ul className="text-warm-gray text-sm leading-relaxed list-disc list-inside space-y-1">
              <li>Professional Audit credits are consumed when an audit is initiated</li>
              <li>Credits are automatically refunded if an audit fails to complete</li>
              <li>Subscription plans include a specified number of credits per billing period</li>
              <li>Additional credits may be purchased at the subscriber discount rate</li>
              <li>All sales are subject to a 30-day money-back guarantee</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">5. Acceptable Use</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              You may only audit websites that you own or have permission to analyze. You agree not to use the Service to: scan websites without authorization, attempt to overwhelm target servers, reverse-engineer our analysis algorithms, or redistribute audit reports for commercial resale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">6. Google API Integration</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              When you connect your Google account, you authorize us to access your Google Search Console and Google Analytics data in read-only mode. You can revoke this access at any time. Our use of Google data is governed by our <Link href="/privacy" className="text-gold hover:text-gold-light">Privacy Policy</Link> and complies with the Google API Services User Data Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">7. Intellectual Property</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              Audit reports generated for you are yours to use as you see fit. The WhatSEO.ai platform, algorithms, and branding remain our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">8. Limitation of Liability</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              SEO audit results are recommendations based on automated analysis and publicly available best practices. We do not guarantee specific search ranking improvements. The Service is provided &quot;as is&quot; without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">9. Termination</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              We may terminate or suspend your account at our discretion if you violate these terms. You may cancel your account at any time by contacting us at hello@whatseo.ai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-warm-white mb-3">10. Contact</h2>
            <p className="text-warm-gray text-sm leading-relaxed">
              Questions about these terms? Contact us at <a href="mailto:hello@whatseo.ai" className="text-gold hover:text-gold-light">hello@whatseo.ai</a>.
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
