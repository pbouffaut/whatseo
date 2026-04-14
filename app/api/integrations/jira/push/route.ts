/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/integrations/encrypt';
import { refreshJiraToken, pushTicketsToJira, type PushJiraResult } from '@/lib/integrations/jira';
import type { AuditTicket, PremiumInsights } from '@/lib/analyzer/types';

interface PushRequestBody {
  auditId: string;
  cloudId: string;
  projectKey: string;
}

interface IntegrationRow {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

interface PushSuccessResponse {
  success: true;
  created: PushJiraResult['created'];
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

  const { auditId, cloudId, projectKey } = body;

  if (!auditId || !cloudId || !projectKey) {
    return NextResponse.json(
      { error: 'Missing required fields: auditId, cloudId, projectKey' },
      { status: 400 }
    );
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

  // Get Jira integration
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'jira')
    .single();

  if (integrationError || !integration) {
    return NextResponse.json({ error: 'Jira not connected' }, { status: 404 });
  }

  const row = integration as IntegrationRow;

  try {
    let accessToken = decrypt(row.access_token);

    // Check if the token is expired and refresh if needed
    if (row.token_expires_at && row.refresh_token) {
      const expiresAt = new Date(row.token_expires_at).getTime();
      const bufferMs = 5 * 60 * 1000; // 5 minute buffer

      if (Date.now() >= expiresAt - bufferMs) {
        const refreshToken = decrypt(row.refresh_token);
        const refreshed = await refreshJiraToken(refreshToken);
        accessToken = refreshed.access_token;

        // Update stored tokens using service role to bypass RLS
        const db = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const newExpiresAt = new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString();

        await db.from('integrations').update({
          access_token: encrypt(refreshed.access_token),
          refresh_token: encrypt(refreshed.refresh_token),
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id).eq('provider', 'jira');
      }
    }

    const result = await pushTicketsToJira(accessToken, cloudId, projectKey, tickets);

    return NextResponse.json({
      success: true,
      created: result.created,
      errors: result.errors,
    });
  } catch (err) {
    console.error('Failed to push tickets to Jira:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to push tickets' },
      { status: 500 }
    );
  }
}
