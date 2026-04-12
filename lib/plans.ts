export const PLANS = {
  professional: {
    name: 'Professional Audit',
    slug: 'professional' as const,
    price: 499_00,
    displayPrice: '$499',
    period: 'one-time',
    intervalMonths: null,
    commitment: null,
    creditsIncluded: 1,
    addonPrice: null,
    addonDisplayPrice: null,
    features: [
      '1 full audit credit',
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
    creditsIncluded: 1, // per month
    addonPrice: 269_00, // $299 - 10%
    addonDisplayPrice: '$269',
    features: [
      '1 audit credit per month',
      'Everything in Professional',
      'Monthly trend tracking',
      'Score change alerts',
      'Extra audits at $269 each (10% off)',
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
    creditsIncluded: 1, // per 2 months
    addonPrice: 359_00, // $399 - 10%
    addonDisplayPrice: '$359',
    features: [
      '1 audit credit every 2 months',
      'Everything in Professional',
      'Bi-monthly trend tracking',
      'Score change alerts',
      'Extra audits at $359 each (10% off)',
    ],
  },
} as const;

export type PlanSlug = keyof typeof PLANS;

export function getPlan(slug: string) {
  return PLANS[slug as PlanSlug];
}
