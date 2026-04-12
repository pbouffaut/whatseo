import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('Security - No Secrets in Code', () => {
  const sensitivePatterns = [
    /AIzaSy[A-Za-z0-9_-]{33}/g,       // Google API key
    /tr_(dev|prod)_[A-Za-z0-9]{20,}/g, // Trigger.dev key
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
    /sk_(live|test)_[A-Za-z0-9]{20,}/g, // Stripe keys
    /supabase[^"]*service_role[^"]*key/gi, // Supabase service role
  ];

  const filesToCheck = [
    'app/api/analyze/route.ts',
    'app/api/full-audit/route.ts',
    'app/auth/callback/route.ts',
    'lib/db.ts',
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
    'lib/google/pagespeed.ts',
    'lib/google/crux.ts',
    'lib/google/gsc.ts',
    'lib/google/ga4.ts',
    'trigger/full-audit.ts',
    'components/Header.tsx',
    'app/layout.tsx',
  ];

  for (const file of filesToCheck) {
    it(`${file} contains no hardcoded secrets`, () => {
      const filepath = join(ROOT, file);
      if (!existsSync(filepath)) return; // Skip if file doesn't exist
      const content = readFileSync(filepath, 'utf-8');
      for (const pattern of sensitivePatterns) {
        const matches = content.match(pattern);
        expect(matches, `Found potential secret in ${file}: ${matches?.[0]?.substring(0, 20)}...`).toBeNull();
      }
    });
  }
});

describe('Security - Environment Variables', () => {
  it('.env is in .gitignore', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
  });

  it('.env.example does not exist or contains no real values', () => {
    const envExample = join(ROOT, '.env.example');
    if (existsSync(envExample)) {
      const content = readFileSync(envExample, 'utf-8');
      expect(content).not.toMatch(/AIzaSy/);
      expect(content).not.toMatch(/tr_(dev|prod)_/);
    }
  });
});

describe('Security - Headers Configuration', () => {
  it('next.config.ts has security headers', () => {
    const config = readFileSync(join(ROOT, 'next.config.ts'), 'utf-8');
    expect(config).toContain('X-Frame-Options');
    expect(config).toContain('X-Content-Type-Options');
    expect(config).toContain('Referrer-Policy');
    expect(config).toContain('Permissions-Policy');
  });
});

describe('Security - Auth Middleware', () => {
  it('middleware.ts exists and protects routes', () => {
    const middleware = readFileSync(join(ROOT, 'middleware.ts'), 'utf-8');
    expect(middleware).toContain('updateSession');
    expect(middleware).toContain('matcher');
  });

  it('protected routes are listed in middleware helper', () => {
    const helper = readFileSync(join(ROOT, 'lib/supabase/middleware.ts'), 'utf-8');
    expect(helper).toContain('/dashboard');
    expect(helper).toContain('/onboarding');
  });
});

describe('Security - API Route Authentication', () => {
  it('full-audit route requires authentication', () => {
    const route = readFileSync(join(ROOT, 'app/api/full-audit/route.ts'), 'utf-8');
    expect(route).toContain('Authentication required');
    expect(route).toContain('getUser');
  });

  it('free scan route does not expose user data', () => {
    const route = readFileSync(join(ROOT, 'app/api/analyze/route.ts'), 'utf-8');
    // Should not leak user info in error messages
    expect(route).not.toContain('password');
    expect(route).not.toContain('secret');
  });
});

describe('Security - RLS Considerations', () => {
  it('full-audit uses authenticated Supabase client', () => {
    const route = readFileSync(join(ROOT, 'app/api/full-audit/route.ts'), 'utf-8');
    expect(route).toContain('createClient');
    // Should NOT use the anon supabase client for user data
    expect(route).not.toMatch(/import.*supabase.*from.*['"]@\/lib\/db['"]/);
  });
});
