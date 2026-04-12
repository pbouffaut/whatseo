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
    const { auditId, creditId, url, priorityPages, competitorUrls } = payload;

    try {
      // Update status: running
      await supabase.from("Audit").update({
        status: "running",
        phase: "crawling",
        updatedAt: new Date().toISOString(),
      }).eq("id", auditId);

      metadata.set("phase", "crawling");
      metadata.set("pagesCrawled", 0);

      // Run the full audit
      const result = await analyzeFullSite({
        url,
        maxPages: 50,
        priorityPages,
        competitorUrls,
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

      metadata.set("phase", "failed");
      metadata.set("error", errorMsg);

      throw err; // Re-throw so Trigger.dev marks the run as failed
    }
  },
});
