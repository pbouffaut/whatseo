import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { tasks } from '@trigger.dev/sdk';
import type { fullAuditTask } from '@/trigger/full-audit';

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
      phase: 'queued',
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

    // Trigger the background task on Trigger.dev — returns immediately
    await tasks.trigger<typeof fullAuditTask>('full-audit', {
      auditId,
      creditId,
      url: normalizedUrl,
      userId: user.id,
      email: user.email || '',
      priorityPages,
      competitorUrls,
    });

    return NextResponse.json({
      id: auditId,
      status: 'running',
      message: 'Audit started. This will run in the background for 1-3 minutes.',
    });
  } catch (err) {
    console.error('Full audit trigger error:', err);
    return NextResponse.json({ error: 'Failed to start audit' }, { status: 500 });
  }
}
