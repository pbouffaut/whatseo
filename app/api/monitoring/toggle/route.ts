import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

export async function POST(req: NextRequest) {
  // Authenticate via the user-scoped client
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const enabled: boolean = body.enabled;

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body: enabled must be a boolean' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from('monitoring_schedules')
    .upsert(
      { user_id: user.id, enabled },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[monitoring/toggle] upsert error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }

  return NextResponse.json({ enabled }, { status: 200 });
}
