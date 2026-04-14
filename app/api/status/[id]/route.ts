import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: audit, error } = await supabase
    .from('Audit')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const response: Record<string, unknown> = {
    id: audit.id,
    url: audit.url,
    email: audit.email,
    status: audit.status,
    score: audit.score,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
    // Full audit fields
    audit_type: audit.audit_type || 'free',
    phase: audit.phase,
    pages_crawled: audit.pages_crawled || 0,
    // pages_total is stored as negative when the crawl hit the maxPages cap
    // (meaning the site has more pages than the cap). Surface the absolute value
    // plus a flag so the UI can show "1000+" instead of "1000".
    pages_total: Math.abs(audit.pages_total || 0),
    pages_hit_max: (audit.pages_total || 0) < 0,
    pdf_url: audit.pdf_url,
  };

  if (audit.status === 'complete' && audit.results) {
    response.results = JSON.parse(audit.results);
  }

  if (audit.status === 'failed') {
    response.error = audit.error;
  }

  return NextResponse.json(response);
}
