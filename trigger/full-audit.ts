import { task, metadata } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { analyzeFullSite } from "../lib/analyzer/full-audit";

// Create a Supabase client for the task (runs on Trigger.dev infrastructure, not Vercel)
// Uses service role key to bypass RLS — needed for credit refunds and audit updates
// across user sessions (anon key would be blocked by RLS policies)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface FullAuditPayload {
  auditId: string;
  creditId: string;
  url: string;
  userId: string;
  email: string;
  competitorUrls: string[];
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  ga4PropertyId: string | null;
  avgDealValue?: number | null;
  conversionRatePct?: number | null;
}

export const fullAuditTask = task({
  id: "full-audit",
  maxDuration: 1800, // 30 minutes — crawl (1000 pages) + 3 sequential Claude calls
  machine: { preset: "large-1x" }, // 8GB RAM for large crawls (1000 pages)

  run: async (payload: FullAuditPayload) => {
    const supabase = getSupabase();
    const { auditId, creditId, url, userId, competitorUrls } = payload;
    const businessMetrics = {
      avgDealValue: payload.avgDealValue ?? null,
      conversionRatePct: payload.conversionRatePct ?? null,
    };

    // Tokens passed directly from the API route (which has RLS access)
    let googleAccessToken = payload.googleAccessToken;
    const googleRefreshToken = payload.googleRefreshToken;
    const ga4PropertyId = payload.ga4PropertyId;
    const apiKey = process.env.PAGESPEED_API_KEY || undefined;

    // Refresh expired Google token if we have a refresh token
    if (googleRefreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const { refreshGoogleToken } = await import("../lib/google/refresh-token");
        const refreshed = await refreshGoogleToken(googleRefreshToken);
        if (refreshed) {
          googleAccessToken = refreshed.accessToken;
          // Update token in DB for next time
          await supabase.from('onboarding_data').update({
            google_access_token: refreshed.accessToken,
            google_token_expires_at: refreshed.expiresAt,
          }).eq('user_id', userId);
        }
      } catch {
        // Continue without fresh token — will use existing or skip Google APIs
      }
    }

    try {
      // Update status: running
      await supabase.from("Audit").update({
        status: "running",
        phase: "crawling",
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      metadata.set("phase", "crawling");
      metadata.set("pagesCrawled", 0);

      // Run the full audit with Google API data
      const result = await analyzeFullSite({
        url,
        maxPages: 1000,
        competitorUrls,
        apiKey,
        googleAccessToken: googleAccessToken || undefined,
        ga4PropertyId: ga4PropertyId || undefined,
        onPhaseChange: async (phase, realPageCount?: number, hitMaxPages?: boolean) => {
          metadata.set("phase", phase);
          const update: Record<string, unknown> = { phase, updatedAt: new Date().toISOString() };
          // When crawling finishes, write the real page count so the progress
          // page shows actual site size, not the queue estimate (up to maxPages).
          // Store pages_total as negative when we hit the cap — the status API
          // surfaces this so the UI can show "1000+" instead of "1000".
          if (realPageCount !== undefined) {
            const storedTotal = hitMaxPages ? -realPageCount : realPageCount;
            update.pages_crawled = realPageCount;
            update.pages_total = storedTotal;
            metadata.set("pagesCrawled", realPageCount);
            metadata.set("pagesTotal", storedTotal);
          }
          await supabase.from("Audit").update(update).eq("id", auditId);
        },
        onProgress: async (crawled, total) => {
          metadata.set("pagesCrawled", crawled);
          metadata.set("pagesTotal", total);
          await supabase.from("Audit").update({
            pages_crawled: crawled,
            pages_total: total,
            updatedAt: new Date().toISOString(),
          }).eq("id", auditId);
        },
      });

      // Generate AI expert insights
      metadata.set("phase", "generating_insights");
      await supabase.from("Audit").update({
        phase: "generating_insights",
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      console.log(`ANTHROPIC_API_KEY present: ${hasApiKey}, key starts with: ${process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'MISSING'}`);

      if (hasApiKey) {
        // Try premium insights first, fall back to basic
        try {
          console.log("Starting premium insights generation (3 parallel Claude calls)...");
          const { generatePremiumInsights } = await import("../lib/insights/generate");
          const insights = await generatePremiumInsights(result, businessMetrics);
          result.insights = insights;
          console.log(`Premium insights generated. Has actionPlan: ${'actionPlan' in insights}, tickets: ${(insights as unknown as Record<string,unknown>).tickets ? 'yes' : 'no'}`);
        } catch (premiumErr) {
          const errMsg = premiumErr instanceof Error ? premiumErr.message : String(premiumErr);
          const errStack = premiumErr instanceof Error ? premiumErr.stack?.substring(0, 300) : '';
          console.error("Premium insights failed, trying basic:", errMsg);
          console.error("Stack:", errStack);
          try {
            console.log("Starting basic insights generation (single Claude call)...");
            const { generateAuditInsights } = await import("../lib/insights/generate");
            const basicInsights = await generateAuditInsights(result);
            result.insights = basicInsights;
            console.log("Basic insights generated successfully");
          } catch (basicErr) {
            console.error("Basic insights also failed:", basicErr instanceof Error ? basicErr.message : basicErr);
          }
        }
      } else {
        console.warn("ANTHROPIC_API_KEY not set — skipping AI insights");
      }

      // Building report phase
      metadata.set("phase", "generating_report");
      await supabase.from("Audit").update({
        phase: "generating_report",
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      // Send email report (PDF generated on-demand via /api/report/[id])
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatseo.vercel.app";
      try {
        if (payload.email && process.env.RESEND_API_KEY) {
          const resend = await import("resend");
          const client = new resend.Resend(process.env.RESEND_API_KEY);
          const scoreColor = result.score.overall >= 70 ? '#4aab6a' : result.score.overall >= 40 ? '#d4952b' : '#e05555';
          await client.emails.send({
            from: `WhatSEO.ai <${process.env.RESEND_FROM_EMAIL || 'reports@whatseo.ai'}>`,
            to: payload.email,
            subject: `Your SEO Audit is Ready — Score: ${result.score.overall}/100`,
            html: `<div style="max-width:600px;margin:0 auto;padding:40px 24px;background:#1a1a1a;font-family:system-ui,sans-serif;"><div style="text-align:center;margin-bottom:32px;"><span style="font-size:20px;font-weight:bold;color:#f5f0e8;">What</span><span style="font-size:20px;font-weight:bold;color:#c9a85c;">SEO</span><span style="font-size:14px;color:#a09888;">.ai</span></div><div style="background:#232323;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;"><p style="color:#c9a85c;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Audit Complete</p><div style="font-size:64px;font-weight:bold;color:${scoreColor};">${result.score.overall}</div><p style="color:#a09888;font-size:14px;margin:4px 0;">/ 100 SEO Health Score</p><p style="color:#a09888;font-size:12px;margin:8px 0 0;">${result.pagesCrawled} pages · ${result.recommendations.length} recommendations</p></div><div style="text-align:center;margin-bottom:24px;"><a href="${appUrl}/results/${auditId}" style="display:inline-block;background:#c9a85c;color:#1a1a1a;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:16px;">View Full Results</a></div><div style="text-align:center;"><a href="${appUrl}/api/report/${auditId}" style="color:#c9a85c;font-size:13px;text-decoration:none;">Download PDF Report →</a></div></div>`,
          });
          await supabase.from("Audit").update({
            report_emailed_at: new Date().toISOString(),
          }).eq("id", auditId);
        }
      } catch (emailErr) {
        console.error("Email delivery failed:", emailErr);
      }

      // Save results
      metadata.set("phase", "complete");
      await supabase.from("Audit").update({
        status: "complete",
        score: result.score.overall,
        results: JSON.stringify(result),
        phase: "complete",
        pages_crawled: result.pagesCrawled,
        pages_total: result.pagesTotal,
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      return {
        success: true,
        score: result.score.overall,
        pagesCrawled: result.pagesCrawled,
        recommendations: result.recommendations.length,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Audit failed";

      // Mark audit as failed
      await supabase.from("Audit").update({
        status: "failed",
        error: errorMsg,
        phase: "failed",
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      // Refund the credit
      await supabase.from("audit_credits").update({
        status: "available",
        audit_id: null,
        used_at: null,
      }).eq("id", creditId);

      // Notify user by email
      try {
        if (payload.email && process.env.RESEND_API_KEY) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatseo.vercel.app";
          const resend = await import("resend");
          const client = new resend.Resend(process.env.RESEND_API_KEY);
          await client.emails.send({
            from: `WhatSEO.ai <${process.env.RESEND_FROM_EMAIL || 'reports@whatseo.ai'}>`,
            to: payload.email,
            subject: `Your SEO Audit Encountered an Issue`,
            html: `<div style="max-width:600px;margin:0 auto;padding:40px 24px;background:#1a1a1a;font-family:system-ui,sans-serif;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="font-size:20px;font-weight:bold;color:#f5f0e8;">What</span><span style="font-size:20px;font-weight:bold;color:#c9a85c;">SEO</span><span style="font-size:14px;color:#a09888;">.ai</span>
              </div>
              <div style="background:#232323;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
                <div style="width:56px;height:56px;border-radius:50%;background:#3d1f1f;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                  <span style="font-size:24px;font-weight:bold;color:#e05555;">!</span>
                </div>
                <p style="color:#c9a85c;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Audit Unsuccessful</p>
                <h2 style="color:#f5f0e8;font-size:20px;margin:0 0 12px;">We hit a snag auditing ${url}</h2>
                <p style="color:#a09888;font-size:14px;margin:0 0 20px;">Your audit credit has been fully refunded and is ready to use again.</p>
                <a href="${appUrl}/dashboard" style="display:inline-block;background:#c9a85c;color:#1a1a1a;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:15px;">Retry from Dashboard →</a>
              </div>
              <p style="color:#6b6b6b;font-size:12px;text-align:center;">If this keeps happening, reply to this email and we'll investigate.</p>
            </div>`,
          });
        }
      } catch (emailErr) {
        console.error("Failure email delivery failed:", emailErr);
      }

      metadata.set("phase", "failed");
      metadata.set("error", errorMsg);

      throw err; // Re-throw so Trigger.dev marks the run as failed
    }
  },
});
