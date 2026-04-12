import { task, metadata } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { analyzeFullSite } from "../lib/analyzer/full-audit";

// Create a Supabase client for the task (runs on Trigger.dev infrastructure, not Vercel)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface FullAuditPayload {
  auditId: string;
  creditId: string;
  url: string;
  userId: string;
  email: string;
  priorityPages: string[];
  competitorUrls: string[];
}

export const fullAuditTask = task({
  id: "full-audit",
  maxDuration: 600, // 10 minutes

  run: async (payload: FullAuditPayload) => {
    const supabase = getSupabase();
    const { auditId, creditId, url, userId, priorityPages, competitorUrls } = payload;

    // Load Google tokens from onboarding data
    const { data: onboarding } = await supabase
      .from('onboarding_data')
      .select('google_access_token, google_refresh_token, ga4_property_id, gsc_connected')
      .eq('user_id', userId)
      .single();

    let googleAccessToken = onboarding?.google_access_token || null;
    const googleRefreshToken = onboarding?.google_refresh_token || null;
    const ga4PropertyId = onboarding?.ga4_property_id || null;
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
        maxPages: 50,
        priorityPages,
        competitorUrls,
        apiKey,
        googleAccessToken: googleAccessToken || undefined,
        ga4PropertyId: ga4PropertyId || undefined,
        onPhaseChange: async (phase) => {
          metadata.set("phase", phase);
          await supabase.from("Audit").update({
            phase,
            updatedAt: new Date().toISOString(),
          }).eq("id", auditId);
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

      // Generate PDF report
      metadata.set("phase", "generating_pdf");
      let pdfUrl: string | undefined;
      try {
        const { generateAuditPdf } = await import("../lib/report/pdf");
        const pdfBuffer = generateAuditPdf(result, url);

        // Upload to Supabase Storage
        const fileName = `audit-${auditId}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audit-reports')
          .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('audit-reports').getPublicUrl(fileName);
          pdfUrl = urlData.publicUrl;
        }
      } catch (pdfErr) {
        console.error("PDF generation failed:", pdfErr);
        // Continue without PDF — don't fail the whole audit
      }

      // Send email report
      try {
        if (payload.email && process.env.RESEND_API_KEY) {
          const { sendAuditReport } = await import("../lib/report/email");
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://whatseo.vercel.app";
          await sendAuditReport({
            to: payload.email,
            websiteUrl: url,
            score: result.score.overall,
            pagesCrawled: result.pagesCrawled,
            recommendations: result.recommendations.length,
            resultsUrl: `${appUrl}/results/${auditId}`,
            pdfUrl,
          });
          await supabase.from("Audit").update({
            report_emailed_at: new Date().toISOString(),
          }).eq("id", auditId);
        }
      } catch (emailErr) {
        console.error("Email delivery failed:", emailErr);
        // Continue without email — don't fail the whole audit
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
        pdf_url: pdfUrl || null,
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      return {
        success: true,
        score: result.score.overall,
        pagesCrawled: result.pagesCrawled,
        recommendations: result.recommendations.length,
        pdfUrl,
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

      metadata.set("phase", "failed");
      metadata.set("error", errorMsg);

      throw err; // Re-throw so Trigger.dev marks the run as failed
    }
  },
});
