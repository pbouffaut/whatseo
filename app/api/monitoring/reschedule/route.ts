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
    },
  );
}

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { nextRunAt?: string };
  const { nextRunAt } = body;

  if (!nextRunAt) {
    return NextResponse.json({ error: 'nextRunAt is required' }, { status: 400 });
  }

  const parsed = new Date(nextRunAt);
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  // Prevent scheduling in the past
  if (parsed < new Date()) {
    return NextResponse.json({ error: 'Date must be in the future' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from('monitoring_schedules')
    .update({ next_run_at: parsed.toISOString() })
    .eq('user_id', user.id);

  if (error) {
    console.error('[monitoring/reschedule] update error:', error);
    return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 });
  }

  return NextResponse.json({ nextRunAt: parsed.toISOString() });
}
