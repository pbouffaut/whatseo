import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const response: Record<string, unknown> = {
    id: audit.id,
    url: audit.url,
    email: audit.email,
    status: audit.status,
    score: audit.score,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
  };

  if (audit.status === 'complete' && audit.results) {
    response.results = JSON.parse(audit.results);
  }

  if (audit.status === 'failed') {
    response.error = audit.error;
  }

  return NextResponse.json(response);
}
