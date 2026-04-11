import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeUrl } from '@/lib/analyzer';

async function runAnalysis(id: string, url: string) {
  try {
    await prisma.audit.update({ where: { id }, data: { status: 'running' } });
    const result = await analyzeUrl(url);
    await prisma.audit.update({
      where: { id },
      data: {
        status: 'complete',
        score: result.score.overall,
        results: JSON.stringify(result),
      },
    });
  } catch (err) {
    await prisma.audit.update({
      where: { id },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' },
    });
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

    const audit = await prisma.audit.create({ data: { url, email } });

    // Fire and forget
    runAnalysis(audit.id, url).catch(console.error);

    return NextResponse.json({ id: audit.id, status: 'pending' });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
