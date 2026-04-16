import type { Metadata } from 'next';
import ContactContent from './ContactContent';

export const metadata: Metadata = {
  title: 'Contact WhatSEO.ai — We Read Every Message',
  description:
    'Have questions about your SEO report or interested in agency pricing? Reach out — we respond within 1 business day.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact WhatSEO.ai — We Read Every Message',
    description:
      'Have questions about your SEO report or interested in agency pricing? Reach out — we respond within 1 business day.',
    url: 'https://whatseo.ai/contact',
    siteName: 'WhatSEO.ai',
    type: 'website',
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
