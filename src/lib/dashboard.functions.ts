import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    // 1. Try to read from cache
    const { data: profile } = await supabase
      .from("profiles")
      .select("dashboard_stats")
      .eq("id", userId)
      .single();

    if (profile?.dashboard_stats) {
      return profile.dashboard_stats as {
        invoicedThisMonth: number;
        outstandingBalance: number;
        proposalsCount: number;
        wonProposalsCount: number;
        winRate: number;
        last6Months: { month: string; year: number; monthIndex: number; revenue: number }[];
        documentsCount: number;
        recentDocs: any[];
      };
    }

    // 2. Cache miss, compute everything from scratch
    const { data: docs } = await supabase
      .from("documents")
      .select("*, client:clients(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const safeDocs: any[] = docs ?? [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let invoicedThisMonth = 0;
    let outstandingBalance = 0;
    let proposalsCount = 0;
    let wonProposalsCount = 0;

    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString("en-US", { month: "short" }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        revenue: 0,
      };
    });

    for (const d of safeDocs) {
      const total = Number(d.total ?? 0);
      
      if (d.type === "proposal") {
        proposalsCount++;
        if (d.status === "accepted" || d.status === "won" || d.status === "paid") {
          wonProposalsCount++;
        }
      }

      if (d.type === "invoice") {
        if (d.status === "sent") outstandingBalance += total;
        if (d.status !== "draft" && d.updated_at) {
          const ud = new Date(d.updated_at);
          if (ud.getMonth() === currentMonth && ud.getFullYear() === currentYear) {
            invoicedThisMonth += total;
          }
        }
      }

      if ((d.type === "invoice" || d.type === "receipt") && (d.status === "paid" || d.status === "ready") && d.updated_at) {
        const ud = new Date(d.updated_at);
        const target = last6Months.find(m => m.monthIndex === ud.getMonth() && m.year === ud.getFullYear());
        if (target) {
          target.revenue += total;
        }
      }
    }

    const winRate = proposalsCount > 0 ? Math.round((wonProposalsCount / proposalsCount) * 100) : 0;
    const documentsCount = safeDocs.filter((d: any) => d.type === "invoice").length;
    const recentDocs = safeDocs.slice(0, 3);

    const stats = {
      invoicedThisMonth,
      outstandingBalance,
      proposalsCount,
      wonProposalsCount,
      winRate,
      last6Months,
      documentsCount,
      recentDocs,
    };

    // 3. Save to cache
    await supabaseAdmin
      .from("profiles")
      .update({ dashboard_stats: stats as any })
      .eq("id", userId);

    return stats;
  });

export async function invalidateDashboardStats(userId: string) {
  return supabaseAdmin
    .from("profiles")
    .update({ dashboard_stats: null })
    .eq("id", userId);
}
