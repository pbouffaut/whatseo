import type { Metadata } from 'next';
import HowItWorksContent from './HowItWorksContent';

export const metadata: Metadata = {
  title: 'How WhatSEO.ai Works — AI-Powered SEO Analysis in 3 Steps',
  description:
    'See exactly how WhatSEO.ai analyzes your site: 80+ checks, real Google data, AI-generated insights, and dev-ready action plans. Professional SEO reports in minutes.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How WhatSEO.ai Works — AI-Powered SEO Analysis in 3 Steps',
    description:
      'See exactly how WhatSEO.ai analyzes your site: 80+ checks, real Google data, AI-generated insights, and dev-ready action plans. Professional SEO reports in minutes.',
    url: 'https://whatseo.ai/how-it-works',
    siteName: 'WhatSEO.ai',
    type: 'website',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
