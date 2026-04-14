/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/integrations/encrypt';
import { pushTicketsToGithub, type PushGithubResult } from '@/lib/integrations/github';
import type { AuditTicket, PremiumInsights } from '@/lib/analyzer/types';

interface PushRequestBody {
  auditId: string;
  repo: string; // "owner/name"
}

interface PushSuccessResponse {
  success: true;
  created: PushGithubResult['created'];
  errors: string[];
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<PushSuccessResponse | ErrorResponse>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PushRequestBody;
  try {
    body = (await request.json()) as PushRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { auditId, repo } = body;

  if (!auditId || !repo) {
    return NextResponse.json({ error: 'Missing required fields: auditId, repo' }, { status: 400 });
  }

  // Load audit from DB
  const { data: audit, error: auditError } = await supabase
    .from('Audit')
    .select('results')
    .eq('id', auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  let tickets: AuditTicket[] = [];
  try {
    const results = JSON.parse(audit.results as string) as {
      insights?: PremiumInsights;
    };
    tickets = results?.insights?.tickets ?? [];
  } catch {
    return NextResponse.json({ error: 'Failed to parse audit results' }, { status: 500 });
  }

  if (tickets.length === 0) {
    return NextResponse.json({ error: 'No tickets found in audit results' }, { status: 404 });
  }

  // Get GitHub integration
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'github')
    .single();

  if (integrationError || !integration) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 404 });
  }

  try {
    const accessToken = decrypt(integration.access_token as string);
    const result = await pushTicketsToGithub(accessToken, repo, tickets);

    return NextResponse.json({
      success: true,
      created: result.created,
      errors: result.errors,
    });
  } catch (err) {
    console.error('Failed to push tickets to GitHub:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to push tickets' },
      { status: 500 }
    );
  }
}
