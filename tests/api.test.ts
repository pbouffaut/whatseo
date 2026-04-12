import { describe, it, expect } from 'vitest';
import { getPlan, PLANS } from '../lib/plans';

describe('Plans Configuration', () => {
  it('has three plans defined', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
    expect(Object.keys(PLANS)).toEqual(['professional', 'monthly', 'bimonthly']);
  });

  it('professional plan has correct pricing', () => {
    const plan = getPlan('professional');
    expect(plan).toBeTruthy();
    expect(plan!.price).toBe(499_00);
    expect(plan!.intervalMonths).toBeNull();
    expect(plan!.addonPrice).toBeNull();
  });

  it('monthly plan has 10% addon discount', () => {
    const plan = getPlan('monthly');
    expect(plan).toBeTruthy();
    expect(plan!.price).toBe(299_00);
    expect(plan!.addonPrice).toBe(269_00); // 299 - 10%
    expect(plan!.intervalMonths).toBe(1);
  });

  it('bimonthly plan has 10% addon discount', () => {
    const plan = getPlan('bimonthly');
    expect(plan).toBeTruthy();
    expect(plan!.price).toBe(399_00);
    expect(plan!.addonPrice).toBe(359_00); // 399 - 10%
    expect(plan!.intervalMonths).toBe(2);
  });

  it('returns undefined for invalid plan', () => {
    const plan = getPlan('invalid');
    expect(plan).toBeUndefined();
  });
});

describe('Service Data', () => {
  it('has all 6 services defined', async () => {
    const { services } = await import('../lib/services-data');
    expect(services).toHaveLength(6);
    const slugs = services.map(s => s.slug);
    expect(slugs).toContain('seo-audit');
    expect(slugs).toContain('technical-analysis');
    expect(slugs).toContain('content-review');
    expect(slugs).toContain('schema-markup');
    expect(slugs).toContain('performance');
    expect(slugs).toContain('ai-readiness');
  });

  it('each service has required fields', async () => {
    const { services } = await import('../lib/services-data');
    for (const service of services) {
      expect(service.slug).toBeTruthy();
      expect(service.name).toBeTruthy();
      expect(service.headline).toBeTruthy();
      expect(service.description.length).toBeGreaterThan(50);
      expect(service.checks.length).toBeGreaterThanOrEqual(4);
      expect(service.findings.length).toBe(3);
    }
  });
});
