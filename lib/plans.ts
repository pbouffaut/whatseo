export const PLANS = {
  one_time: {
    name: 'Single Audit',
    slug: 'one_time' as const,
    price: 349_00,
    displayPrice: '$349',
    period: 'one-time',
    intervalMonths: null,
    commitment: null,
    creditsIncluded: 1,
    addonPrice: 349_00,
    addonDisplayPrice: '$349',
    stripePriceId: process.env.STRIPE_PRICE_ONE_TIME ?? '',
    features: [
      '1 full audit credit',
      '47 checks across up to 500 pages',
      'Real Google Search Console data',
      'Professional PDF report',
      'Prioritized action plan',
      'Dev-ready schema components',
      'Credits never expire',
    ],
  },
  monthly: {
    name: 'Monthly Monitor',
    slug: 'monthly' as const,
    price: 299_00,
    displayPrice: '$299',
    period: '/month',
    intervalMonths: 1,
    commitment: 'Cancel anytime',
    creditsIncluded: 1,
    addonPrice: 99_00,
    addonDisplayPrice: '$99',
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY ?? '',
    features: [
      '1 audit credit per month',
      'Everything in Single Audit',
      'Historical score tracking',
      'Score change alerts',
      'Cancel anytime, auto-renews monthly',
      'Extra audits at $99 each',
      'Additional credits never expire',
    ],
  },
  yearly: {
    name: 'Yearly Monitor',
    slug: 'yearly' as const,
    price: 3_060_00,
    displayPrice: '$3,060',
    period: '/year',
    intervalMonths: 12,
    commitment: '$255/mo · 15% off monthly',
    creditsIncluded: 12,
    addonPrice: 85_00,
    addonDisplayPrice: '$85',
    stripePriceId: process.env.STRIPE_PRICE_YEARLY ?? '',
    features: [
      '12 audit credits per year',
      'Everything in Single Audit',
      'Historical score tracking',
      'Score change alerts',
      'Auto-renews yearly',
      'Extra audits at $85 each (15% off)',
      'Additional credits never expire',
    ],
  },
} as const;

export type PlanSlug = keyof typeof PLANS;

export function getPlan(slug: string) {
  return PLANS[slug as PlanSlug];
}
