import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/db';
import { analyzeUrl } from '@/lib/analyzer';

// Vercel Pro allows up to 300s, free tier 60s
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { url, email, userId } = body as { url?: string; email?: string; userId?: string };

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const id = generateId();
    await supabase.from('Audit').insert({
      id,
      url,
      email,
      user_id: userId || null,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const result = await analyzeUrl(url);
      await supabase.from('Audit').update({
        status: 'complete',
        score: result.score.overall,
        results: JSON.stringify(result),
        updatedAt: new Date().toISOString(),
      }).eq('id', id);

      return NextResponse.json({ id, status: 'complete', score: result.score.overall });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
      await supabase.from('Audit').update({
        status: 'failed',
        error: errorMsg,
        updatedAt: new Date().toISOString(),
      }).eq('id', id);

      return NextResponse.json({ id, status: 'failed', error: errorMsg });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
