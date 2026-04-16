import { schedules, tasks } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS, same pattern as full-audit.ts
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const scheduledMonitorTask = schedules.task({
  id: "scheduled-monitor",
  cron: "0 8 * * *",
  maxDuration: 120,

  run: async () => {
    const supabase = getSupabase();

    // 1. Find all schedules due for a re-audit
    const { data: dueSchedules, error: schedErr } = await supabase
      .from("monitoring_schedules")
      .select("id, user_id, last_audit_id, interval_months")
      .eq("enabled", true)
      .lte("next_run_at", new Date().toISOString());

    if (schedErr) {
      console.error("Failed to query monitoring_schedules:", schedErr.message);
      throw schedErr;
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      console.log("No schedules due — nothing to do.");
      return { processed: 0 };
    }

    console.log(`Found ${dueSchedules.length} schedule(s) due for re-audit.`);

    let processed = 0;

    for (const schedule of dueSchedules) {
      try {
        // 2. Fetch onboarding data
        const { data: onb, error: onbErr } = await supabase
          .from("onboarding_data")
          .select(
            "website_url,competitor_urls,google_refresh_token,ga4_property_id,avg_deal_value,conversion_rate_pct"
          )
          .eq("user_id", schedule.user_id)
          .single();

        if (onbErr || !onb) {
          console.warn(`No onboarding data for user ${schedule.user_id} — skipping.`);
          continue;
        }

        if (!onb.website_url) {
          console.warn(`No website_url for user ${schedule.user_id} — skipping.`);
          continue;
        }

        // 3. Fetch user email from Auth
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
          schedule.user_id
        );

        if (userErr || !userData?.user) {
          console.warn(`Could not fetch auth user for ${schedule.user_id} — skipping.`);
          continue;
        }

        const userEmail = userData.user.email ?? "";

        // 4. Refresh Google token if available
        let freshAccessToken: string | null = null;

        if (
          onb.google_refresh_token &&
          process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET
        ) {
          try {
            const { refreshGoogleToken } = await import("../lib/google/refresh-token");
            const refreshed = await refreshGoogleToken(onb.google_refresh_token);
            if (refreshed) {
              freshAccessToken = refreshed.accessToken;
              // Persist the updated token so subsequent runs use a fresh one
              await supabase
                .from("onboarding_data")
                .update({
                  google_access_token: refreshed.accessToken,
                  google_token_expires_at: refreshed.expiresAt,
                })
                .eq("user_id", schedule.user_id);
            }
          } catch {
            // Continue without a fresh token — Google APIs will be skipped
            console.warn(`Token refresh failed for user ${schedule.user_id} — continuing without.`);
          }
        }

        // 5. Create a new Audit row
        const { data: audit, error: auditErr } = await supabase
          .from("Audit")
          .insert({
            user_id: schedule.user_id,
            url: onb.website_url,
            audit_type: "full",
            status: "queued",
            trigger_type: "scheduled",
            email: userEmail,
          })
          .select("id")
          .single();

        if (auditErr || !audit) {
          console.error(
            `Failed to create Audit row for user ${schedule.user_id}:`,
            auditErr?.message
          );
          continue;
        }

        // 6. Trigger the full-audit task
        // creditId = 'scheduled' is a sentinel that tells full-audit.ts to skip credit deduction
        await tasks.trigger("full-audit", {
          auditId: audit.id,
          creditId: "scheduled",
          url: onb.website_url,
          userId: schedule.user_id,
          email: userEmail,
          competitorUrls: onb.competitor_urls ?? [],
          googleAccessToken: freshAccessToken,
          googleRefreshToken: onb.google_refresh_token,
          ga4PropertyId: onb.ga4_property_id,
          avgDealValue: onb.avg_deal_value,
          conversionRatePct: onb.conversion_rate_pct,
          isScheduled: true,
          previousAuditId: schedule.last_audit_id,
        });

        // 7. Update the schedule row — advance next_run_at by interval_months
        const nextRunAt = new Date();
        nextRunAt.setMonth(nextRunAt.getMonth() + (schedule.interval_months ?? 1));

        const { error: updateErr } = await supabase
          .from("monitoring_schedules")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt.toISOString(),
            last_audit_id: audit.id,
          })
          .eq("id", schedule.id);

        if (updateErr) {
          console.error(
            `Failed to update monitoring_schedule ${schedule.id}:`,
            updateErr.message
          );
        }

        processed++;
        console.log(
          `Triggered full-audit for user ${schedule.user_id} (audit ${audit.id}). Next run: ${nextRunAt.toISOString()}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Unexpected error processing schedule ${schedule.id}: ${msg}`);
        // Continue to next schedule rather than aborting the whole run
      }
    }

    console.log(`Scheduled monitor complete. Processed ${processed} / ${dueSchedules.length} schedules.`);
    return { processed, total: dueSchedules.length };
  },
});
