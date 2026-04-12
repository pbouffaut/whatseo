import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/db';
import { analyzeFullSite } from '@/lib/analyzer/full-audit';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
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

    const auditId = generateId();
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
    const creditId = credits[0].id;
    await supabase.from('audit_credits').update({
      status: 'used',
      audit_id: auditId,
      used_at: new Date().toISOString(),
    }).eq('id', creditId);

    try {
      const result = await analyzeFullSite({
        url: normalizedUrl,
        maxPages: 50,
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

      // Save results
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Audit failed';

      // Mark audit as failed
      await supabase.from('Audit').update({
        status: 'failed',
        error: errorMsg,
        phase: 'failed',
        updatedAt: new Date().toISOString(),
      }).eq('id', auditId);

      // Refund the credit
      await supabase.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);

      return NextResponse.json({ id: auditId, status: 'failed', error: errorMsg });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
