import type { Metadata } from 'next';
import AboutContent from './AboutContent';

export const metadata: Metadata = {
  title: 'About WhatSEO.ai — Our Mission & Story',
  description:
    'We built WhatSEO.ai to make expert-level SEO analysis accessible to every team. Learn about our mission to democratize professional SEO insights.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About WhatSEO.ai — Our Mission & Story',
    description:
      'We built WhatSEO.ai to make expert-level SEO analysis accessible to every team. Learn about our mission to democratize professional SEO insights.',
    url: 'https://whatseo.ai/about',
    siteName: 'WhatSEO.ai',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
