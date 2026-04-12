import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { analyzeFullSite } from '@/lib/analyzer/full-audit';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let auditId: string | null = null;
  let creditId: string | null = null;

  try {
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { url, priorityPages = [], competitorUrls = [] } = body as {
      url: string;
      priorityPages?: string[];
      competitorUrls?: string[];
    };

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Check for available credits
    const { data: credits } = await supabase
      .from('audit_credits')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'available')
      .limit(1);

    if (!credits || credits.length === 0) {
      return NextResponse.json({ error: 'No audit credits available' }, { status: 403 });
    }

    // Check no other audit is running
    const { data: running } = await supabase
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
    await supabase.from('Audit').insert({
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
    await supabase.from('audit_credits').update({
      status: 'used',
      audit_id: auditId,
      used_at: new Date().toISOString(),
    }).eq('id', creditId);

    // Try Trigger.dev first, fallback to inline execution
    let triggered = false;
    try {
      const triggerSdk = await import('@trigger.dev/sdk');
      await triggerSdk.tasks.trigger('full-audit', {
        auditId,
        creditId,
        url: normalizedUrl,
        userId: user.id,
        email: user.email || '',
        priorityPages,
        competitorUrls,
      });
      triggered = true;
    } catch (triggerErr) {
      console.warn('Trigger.dev unavailable, running inline:', triggerErr);
    }

    if (triggered) {
      // Trigger.dev will handle the rest in the background
      return NextResponse.json({
        id: auditId,
        status: 'running',
        message: 'Audit started in background. This will take 1-3 minutes.',
      });
    }

    // Fallback: run inline (limited by Vercel timeout but better than nothing)
    try {
      const result = await analyzeFullSite({
        url: normalizedUrl,
        maxPages: 30, // Reduced for inline execution
        priorityPages,
        competitorUrls,
        onPhaseChange: async (phase) => {
          await supabase.from('Audit').update({
            phase,
            updatedAt: new Date().toISOString(),
          }).eq('id', auditId);
        },
        onProgress: async (crawled, total) => {
          await supabase.from('Audit').update({
            pages_crawled: crawled,
            pages_total: total,
            updatedAt: new Date().toISOString(),
          }).eq('id', auditId);
        },
      });

      await supabase.from('Audit').update({
        status: 'complete',
        score: result.score.overall,
        results: JSON.stringify(result),
        phase: 'complete',
        pages_crawled: result.pagesCrawled,
        pages_total: result.pagesTotal,
        updatedAt: new Date().toISOString(),
      }).eq('id', auditId);

      return NextResponse.json({
        id: auditId,
        status: 'complete',
        score: result.score.overall,
        pagesCrawled: result.pagesCrawled,
      });
    } catch (auditErr) {
      const errorMsg = auditErr instanceof Error ? auditErr.message : 'Audit failed';

      await supabase.from('Audit').update({
        status: 'failed',
        error: errorMsg,
        phase: 'failed',
        updatedAt: new Date().toISOString(),
      }).eq('id', auditId);

      // Refund credit
      await supabase.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);

      return NextResponse.json({ id: auditId, status: 'failed', error: errorMsg });
    }
  } catch (err) {
    console.error('Full audit error:', err);

    // Refund credit if we consumed one
    if (creditId) {
      await supabase.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);
    }

    // Clean up audit record if created
    if (auditId) {
      await supabase.from('Audit').update({
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
