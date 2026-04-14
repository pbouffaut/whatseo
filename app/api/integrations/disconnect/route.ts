/*
 * Required DB migration: see app/api/integrations/status/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DisconnectRequestBody {
  provider: 'github' | 'jira';
}

interface SuccessResponse {
  success: true;
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: DisconnectRequestBody;
  try {
    body = (await request.json()) as DisconnectRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { provider } = body;

  if (!provider || !['github', 'jira'].includes(provider)) {
    return NextResponse.json(
      { error: 'Invalid provider. Must be "github" or "jira".' },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase
    .from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (deleteError) {
    console.error('Failed to disconnect integration:', deleteError);
    return NextResponse.json(
      { error: `Failed to disconnect ${provider}: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
