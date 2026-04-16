import { schedules } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import type { WatchdogAlert } from "../lib/monitoring/emails";

// Service role client — bypasses RLS, same pattern as full-audit.ts
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface GscPageRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface WeeklyGscPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Fetch GSC page-level data for a specific date range using raw fetch.
// fetchGscData in lib/google/gsc.ts hardcodes 90 days so we call the API directly.
async function fetchGscPages(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<WeeklyGscPage[]> {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 50,
      dataState: "all",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC searchAnalytics failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { rows?: GscPageRow[] };
  const rows: GscPageRow[] = data.rows ?? [];
  return rows.map((r) => ({
    page: r.keys[0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

// Build ISO date strings for the two comparison windows.
// "current" week  = yesterday back 7 days  (endDate = yesterday, startDate = 8 days ago)
// "previous" week = the 7 days before that  (endDate = 8 days ago, startDate = 15 days ago)
function getDateWindows(): { current: { start: string; end: string }; previous: { start: string; end: string } } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const w1Start = new Date(now);
  w1Start.setDate(w1Start.getDate() - 8);

  const w2End = new Date(now);
  w2End.setDate(w2End.getDate() - 8);

  const w2Start = new Date(now);
  w2Start.setDate(w2Start.getDate() - 15);

  return {
    current: { start: fmt(w1Start), end: fmt(yesterday) },
    previous: { start: fmt(w2Start), end: fmt(w2End) },
  };
}

export const gscWatchdogTask = schedules.task({
  id: "gsc-watchdog",
  cron: "0 9 * * 1",
  maxDuration: 300,

  run: async () => {
    const supabase = getSupabase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatseo.vercel.app";

    // 1. Fetch all users who have a refresh token set
    const { data: onboardingRows, error: onbErr } = await supabase
      .from("onboarding_data")
      .select("user_id, website_url, google_refresh_token, ga4_property_id")
      .not("google_refresh_token", "is", null);

    if (onbErr || !onboardingRows || onboardingRows.length === 0) {
      console.log("No users with Google refresh tokens — nothing to do.");
      return { processed: 0 };
    }

    // Cross-reference with active subscriptions that have interval_months set
    // (monthly / bimonthly plans). Professional one-time plans have no interval_months.
    const { data: activeSubs, error: subErr } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active")
      .not("interval_months", "is", null);

    if (subErr) {
      console.error("Failed to query subscriptions:", subErr.message);
      throw subErr;
    }

    const activeUserIds = new Set((activeSubs ?? []).map((s: { user_id: string }) => s.user_id));
    const eligibleUsers = onboardingRows.filter((o) => activeUserIds.has(o.user_id));

    console.log(
      `${eligibleUsers.length} eligible user(s) out of ${onboardingRows.length} with tokens.`
    );

    const windows = getDateWindows();
    let processed = 0;

    for (const onb of eligibleUsers) {
      try {
        if (!onb.website_url) {
          console.warn(`User ${onb.user_id} has no website_url — skipping.`);
          continue;
        }

        // a. Refresh token
        let accessToken: string | null = null;

        if (
          onb.google_refresh_token &&
          process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET
        ) {
          try {
            const { refreshGoogleToken } = await import("../lib/google/refresh-token");
            const refreshed = await refreshGoogleToken(onb.google_refresh_token);
            if (refreshed) {
              accessToken = refreshed.accessToken;
              await supabase
                .from("onboarding_data")
                .update({
                  google_access_token: refreshed.accessToken,
                  google_token_expires_at: refreshed.expiresAt,
                })
                .eq("user_id", onb.user_id);
            }
          } catch {
            console.warn(`Token refresh failed for user ${onb.user_id} — skipping.`);
            continue;
          }
        }

        if (!accessToken) {
          console.warn(`No valid access token for user ${onb.user_id} — skipping.`);
          continue;
        }

        // b & c. Fetch current and previous week GSC data
        const [currentPages, previousPages] = await Promise.all([
          fetchGscPages(onb.website_url, accessToken, windows.current.start, windows.current.end),
          fetchGscPages(
            onb.website_url,
            accessToken,
            windows.previous.start,
            windows.previous.end
          ),
        ]);

        if (currentPages.length === 0 && previousPages.length === 0) {
          console.log(`No GSC data for user ${onb.user_id} — skipping.`);
          continue;
        }

        // Build a lookup map for previous week by page URL
        const prevMap = new Map<string, WeeklyGscPage>();
        for (const p of previousPages) {
          prevMap.set(p.page, p);
        }

        // d. Detect degraded pages
        const degradedPages: Array<{
          page: string;
          metric: string;
          before: number;
          after: number;
          pctChange: number;
        }> = [];

        for (const curr of currentPages) {
          const prev = prevMap.get(curr.page);
          if (!prev) continue; // New page — no baseline to compare

          // Position drop (higher number = worse ranking)
          if (curr.position - prev.position > 3) {
            const pct = ((curr.position - prev.position) / prev.position) * 100;
            degradedPages.push({
              page: curr.page,
              metric: "position",
              before: Math.round(prev.position * 10) / 10,
              after: Math.round(curr.position * 10) / 10,
              pctChange: -Math.round(pct * 10) / 10,
            });
          }

          // Clicks drop >30%
          if (prev.clicks > 0 && (prev.clicks - curr.clicks) / prev.clicks > 0.3) {
            const pct = ((curr.clicks - prev.clicks) / prev.clicks) * 100;
            degradedPages.push({
              page: curr.page,
              metric: "clicks",
              before: prev.clicks,
              after: curr.clicks,
              pctChange: Math.round(pct * 10) / 10,
            });
          }

          // CTR drop >20%
          if (prev.ctr > 0 && (prev.ctr - curr.ctr) / prev.ctr > 0.2) {
            const pct = ((curr.ctr - prev.ctr) / prev.ctr) * 100;
            degradedPages.push({
              page: curr.page,
              metric: "ctr",
              before: Math.round(prev.ctr * 1000) / 10, // as %
              after: Math.round(curr.ctr * 1000) / 10,
              pctChange: Math.round(pct * 10) / 10,
            });
          }
        }

        if (degradedPages.length === 0) {
          console.log(`User ${onb.user_id}: no degradation detected.`);
          processed++;
          continue;
        }

        // Deduplicate — keep worst signal per page (prefer position, then clicks, then ctr)
        const metricPriority: Record<string, number> = { position: 0, clicks: 1, ctr: 2 };
        const byPage = new Map<
          string,
          (typeof degradedPages)[number]
        >();
        for (const d of degradedPages) {
          const existing = byPage.get(d.page);
          if (
            !existing ||
            (metricPriority[d.metric] ?? 99) < (metricPriority[existing.metric] ?? 99)
          ) {
            byPage.set(d.page, d);
          }
        }

        // Cap at 5 pages
        const topDegraded = [...byPage.values()].slice(0, 5);

        // e. Generate Claude diagnoses
        const alerts: WatchdogAlert[] = [];

        if (process.env.ANTHROPIC_API_KEY) {
          const Anthropic = (await import("@anthropic-ai/sdk")).default;
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          for (const d of topDegraded) {
            try {
              const msg = await client.messages.create({
                model: "claude-haiku-4-5",
                max_tokens: 100,
                messages: [
                  {
                    role: "user",
                    content: `SEO page degradation: URL="${d.page}", metric="${d.metric}", before=${d.before}, after=${d.after}. Write ONE sentence diagnosis and fix suggestion. Be specific and actionable. Under 25 words.`,
                  },
                ],
              });

              const diagnosis =
                msg.content[0]?.type === "text"
                  ? msg.content[0].text.trim()
                  : `${d.metric} declined — review content and backlinks for this page.`;

              alerts.push({
                page: d.page,
                metric: d.metric,
                before: d.before,
                after: d.after,
                pctChange: d.pctChange,
                diagnosis,
              });
            } catch (claudeErr) {
              const errMsg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
              console.warn(`Claude diagnosis failed for ${d.page}: ${errMsg}`);
              alerts.push({
                page: d.page,
                metric: d.metric,
                before: d.before,
                after: d.after,
                pctChange: d.pctChange,
                diagnosis: `${d.metric} declined — review content freshness and backlinks for this page.`,
              });
            }
          }
        } else {
          // No API key — add alerts without AI diagnosis
          for (const d of topDegraded) {
            alerts.push({
              page: d.page,
              metric: d.metric,
              before: d.before,
              after: d.after,
              pctChange: d.pctChange,
              diagnosis: `${d.metric} declined — review content freshness and backlinks for this page.`,
            });
          }
        }

        // f. Fetch user email and send watchdog alert
        const { data: userData } = await supabase.auth.admin.getUserById(onb.user_id);
        const userEmail = userData?.user?.email;

        if (userEmail && process.env.RESEND_API_KEY) {
          const { buildWatchdogEmail } = await import("../lib/monitoring/emails");
          const { subject, html } = buildWatchdogEmail({
            email: userEmail,
            url: onb.website_url,
            appUrl,
            alerts,
          });

          const resend = await import("resend");
          const resendClient = new resend.Resend(process.env.RESEND_API_KEY);
          await resendClient.emails.send({
            from: `WhatSEO.ai <${process.env.RESEND_FROM_EMAIL || "reports@whatseo.ai"}>`,
            to: userEmail,
            subject,
            html,
          });

          console.log(
            `Watchdog email sent to ${userEmail} — ${alerts.length} alert(s) for ${onb.website_url}.`
          );
        } else {
          console.warn(
            `Skipped email for user ${onb.user_id} — no email address or RESEND_API_KEY missing.`
          );
        }

        // g. Log results
        console.log(
          `User ${onb.user_id} (${onb.website_url}): ${alerts.length} degraded page(s) found.`,
          alerts.map((a) => `${a.page} [${a.metric}: ${a.before} → ${a.after}]`)
        );

        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error processing user ${onb.user_id}: ${msg}`);
        // Continue to next user — one failure must not abort the whole run
      }
    }

    console.log(
      `GSC watchdog complete. Processed ${processed} / ${eligibleUsers.length} eligible user(s).`
    );
    return { processed, total: eligibleUsers.length };
  },
});
