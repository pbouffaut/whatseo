import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch monitoring schedule
  const { data: scheduleRow } = await supabase
    .from('monitoring_schedules')
    .select(
      'enabled,interval_months,next_run_at,last_run_at,last_audit_id'
    )
    .eq('user_id', user.id)
    .single();

  const schedule = scheduleRow
    ? {
        enabled: scheduleRow.enabled as boolean,
        intervalMonths: scheduleRow.interval_months as number,
        nextRunAt: scheduleRow.next_run_at as string | null,
        lastRunAt: scheduleRow.last_run_at as string | null,
        lastAuditId: scheduleRow.last_audit_id as string | null,
      }
    : null;

  // Fetch score history ordered ASC, limit 12
  const { data: historyRows } = await supabase
    .from('score_history')
    .select(
      'audit_id,overall,technical,on_page,schema,performance,ai_readiness,pages_crawled,recorded_at'
    )
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: true })
    .limit(12);

  const scoreHistory = (historyRows ?? []).map((row) => ({
    auditId: row.audit_id as string,
    overall: row.overall as number,
    technical: row.technical as number | null,
    onPage: row.on_page as number | null,
    schema: row.schema as number | null,
    performance: row.performance as number | null,
    aiReadiness: row.ai_readiness as number | null,
    pagesCrawled: row.pages_crawled as number | null,
    recordedAt: row.recorded_at as string,
  }));

  return NextResponse.json({ schedule, scoreHistory }, { status: 200 });
}
