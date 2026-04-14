import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { analyzeFullSite } from '@/lib/analyzer/full-audit';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let auditId: string | null = null;
  let creditId: string | null = null;
  const db = await createClient(); // Authenticated Supabase client (respects RLS)

  try {
    const { data: { user } } = await db.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { url, competitorUrls = [] } = body as {
      url: string;
      competitorUrls?: string[];
    };

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Check for available credits (uses authenticated client — RLS allows user to see own credits)
    const { data: credits, error: credErr } = await db
      .from('audit_credits')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'available')
      .limit(1);

    if (credErr) {
      console.error('Credit check error:', credErr);
      return NextResponse.json({ error: 'Failed to check credits: ' + credErr.message }, { status: 500 });
    }

    if (!credits || credits.length === 0) {
      return NextResponse.json({ error: 'No audit credits available' }, { status: 403 });
    }

    // Check no other audit is running
    const { data: running } = await db
      .from('Audit')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'running')
      .limit(1);

    if (running && running.length > 0) {
      return NextResponse.json({ error: 'An audit is already running. Please wait for it to complete.' }, { status: 409 });
    }

    auditId = generateId();
    creditId = credits[0].id;
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    // Create audit record
    await db.from('Audit').insert({
      id: auditId,
      url: normalizedUrl,
      email: user.email,
      user_id: user.id,
      status: 'running',
      audit_type: 'full',
      phase: 'crawling',
      pages_crawled: 0,
      pages_total: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Consume the credit
    await db.from('audit_credits').update({
      status: 'used',
      audit_id: auditId,
      used_at: new Date().toISOString(),
    }).eq('id', creditId);

    // Load Google tokens + business metrics from onboarding data (authenticated client — RLS safe)
    const { data: onboarding } = await db
      .from('onboarding_data')
      .select('google_access_token, google_refresh_token, ga4_property_id, gsc_connected, avg_deal_value, conversion_rate_pct')
      .eq('user_id', user.id)
      .single();

    // Trigger background task on Trigger.dev — pass tokens directly
    try {
      const triggerSdk = await import('@trigger.dev/sdk');
      await triggerSdk.tasks.trigger('full-audit', {
        auditId,
        creditId,
        url: normalizedUrl,
        userId: user.id,
        email: user.email || '',
        competitorUrls,
        // Google tokens passed directly — Trigger.dev can't read them from DB (RLS)
        googleAccessToken: onboarding?.google_access_token || null,
        googleRefreshToken: onboarding?.google_refresh_token || null,
        ga4PropertyId: onboarding?.ga4_property_id || null,
        // Business metrics for grounded revenue projections
        avgDealValue: onboarding?.avg_deal_value || null,
        conversionRatePct: onboarding?.conversion_rate_pct || null,
      });

      return NextResponse.json({
        id: auditId,
        status: 'running',
        message: 'Audit started in background. This will take 1-3 minutes.',
      });
    } catch (triggerErr) {
      console.error('Trigger.dev failed:', triggerErr);

      // Refund credit — don't run a degraded audit
      await db.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);

      await db.from('Audit').update({
        status: 'failed',
        error: 'Background processing service unavailable. Your credit has been refunded. Please try again in a few minutes.',
        phase: 'failed',
        updatedAt: new Date().toISOString(),
      }).eq('id', auditId);

      return NextResponse.json({
        id: auditId,
        status: 'failed',
        error: 'Background processing service temporarily unavailable. Your credit has been refunded.',
      }, { status: 503 });
    }
  } catch (err) {
    console.error('Full audit error:', err);

    // Refund credit if we consumed one
    if (creditId) {
      await db.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);
    }

    if (auditId) {
      await db.from('Audit').update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Failed to start audit',
        updatedAt: new Date().toISOString(),
      }).eq('id', auditId);
    }

    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to start audit',
    }, { status: 500 });
  }
}
