import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { generateAuditPdf } from '@/lib/report/pdf';
import type { FullAuditResult } from '@/lib/analyzer/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: audit } = await supabase
    .from('Audit')
    .select('*')
    .eq('id', id)
    .single();

  if (!audit || audit.status !== 'complete' || !audit.results) {
    return NextResponse.json({ error: 'Audit not found or not complete' }, { status: 404 });
  }

  try {
    const results = JSON.parse(audit.results) as FullAuditResult;
    const pdfBuffer = generateAuditPdf(results, audit.url);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="whatseo-audit-${id.substring(0, 8)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
