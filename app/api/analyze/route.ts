import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/db';
import { analyzeUrl } from '@/lib/analyzer';

async function runAnalysis(id: string, url: string) {
  try {
    await supabase.from('Audit').update({ status: 'running', updatedAt: new Date().toISOString() }).eq('id', id);
    const result = await analyzeUrl(url);
    await supabase.from('Audit').update({
      status: 'complete',
      score: result.score.overall,
      results: JSON.stringify(result),
      updatedAt: new Date().toISOString(),
    }).eq('id', id);
  } catch (err) {
    await supabase.from('Audit').update({
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      updatedAt: new Date().toISOString(),
    }).eq('id', id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { url, email } = body as { url?: string; email?: string };

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const id = generateId();
    const { error } = await supabase.from('Audit').insert({
      id,
      url,
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fire and forget
    runAnalysis(id, url).catch(console.error);

    return NextResponse.json({ id, status: 'pending' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
