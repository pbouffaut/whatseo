import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'SEO Audit Pricing — Professional, Monthly & Bi-Monthly Plans',
  description:
    'WhatSEO.ai pricing: $499 one-time professional audit or $299/mo for continuous monitoring. No retainers, no surprises. Agency-quality SEO insights.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'SEO Audit Pricing — Professional, Monthly & Bi-Monthly Plans',
    description:
      'WhatSEO.ai pricing: $499 one-time professional audit or $299/mo for continuous monitoring. No retainers, no surprises. Agency-quality SEO insights.',
    url: 'https://whatseo.ai/pricing',
    siteName: 'WhatSEO.ai',
    type: 'website',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
