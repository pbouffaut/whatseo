import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    first_name: string;
    last_name: string;
    company?: string;
    title?: string;
  };

  const now = new Date().toISOString();

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      first_name: body.first_name,
      last_name: body.last_name,
      company: body.company ?? null,
      title: body.title ?? null,
      profile_completed_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
