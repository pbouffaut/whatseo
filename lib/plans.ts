export const PLANS = {
  professional: {
    name: 'Professional Audit',
    slug: 'professional' as const,
    price: 499_00,
    displayPrice: '$499',
    period: 'one-time',
    intervalMonths: null,
    commitment: null,
    features: [
      '47 checks across up to 500 pages',
      'Real Google Search Console data',
      'Professional PDF report',
      'Prioritized action plan',
      'Dev-ready schema components',
    ],
  },
  monthly: {
    name: 'Monthly Monitor',
    slug: 'monthly' as const,
    price: 299_00,
    displayPrice: '$299',
    period: '/month',
    intervalMonths: 1,
    commitment: '12-month agreement',
    features: [
      'Everything in Professional',
      'Monthly trend tracking',
      'Slack notifications',
      'Score change alerts',
      'Competitor tracking',
    ],
  },
  bimonthly: {
    name: 'Bi-Monthly Monitor',
    slug: 'bimonthly' as const,
    price: 399_00,
    displayPrice: '$399',
    period: '/2 months',
    intervalMonths: 2,
    commitment: '12-month agreement',
    features: [
      'Everything in Professional',
      'Report every 2 months',
      'Slack notifications',
      'Score change alerts',
      'Competitor tracking',
    ],
  },
} as const;

export type PlanSlug = keyof typeof PLANS;

export function getPlan(slug: string) {
  return PLANS[slug as PlanSlug];
}
