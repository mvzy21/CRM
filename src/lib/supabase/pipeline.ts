import { createServerFn } from "@tanstack/react-start";
import { requireRole } from "./access.ts";
import { DEAL_STAGES, type DealStage } from "./deals.ts";

// US-24: Sales Manager views all team deals grouped by stage, with stale
// deals flagged. "Stale" is measured from the last logged interaction on
// the deal -- a deal nobody has called or met about in this long is the
// one the manager needs to chase, which is the visibility gap the story
// names.
export const STALE_AFTER_DAYS = 14;

export interface PipelineDeal {
  id: string;
  title: string;
  budget: number | null;
  stage: DealStage;
  ownerId: string | null;
  ownerName: string | null;
  lastActivityAt: string | null;
  daysSinceActivity: number;
  isStale: boolean;
}

export interface PipelineStageGroup {
  stage: DealStage;
  deals: PipelineDeal[];
  totalBudget: number;
}

export interface TeamPipeline {
  stages: PipelineStageGroup[];
  teamSize: number;
  staleCount: number;
  totalOpen: number;
}

interface DealRow {
  id: string;
  title: string;
  budget: number | null;
  stage: DealStage;
  created_at: string;
  owner_id: string | null;
  owner: { display_name: string | null; email: string | null } | null;
}

export const getTeamPipeline = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { success: true; pipeline: TeamPipeline }
    | { success: false; message: string }
  > => {
    const check = await requireRole(["sales_manager", "admin"]);
    if (!check.ok) return { success: false, message: check.message };

    // A Sales Manager's "team" is everyone sharing their team_id. An Admin
    // has no team of their own, so they see the whole org -- same rows the
    // org-wide select policy already exposes, just grouped.
    const { data: me } = await check.supabase
      .from("profiles")
      .select("team_id")
      .eq("id", check.userId)
      .maybeSingle();

    let memberIds: string[] | null = null;
    if (check.role === "sales_manager" && me?.team_id) {
      const { data: teammates } = await check.supabase
        .from("profiles")
        .select("id")
        .eq("team_id", me.team_id);
      memberIds = (teammates ?? []).map((t) => t.id);
    }

    let dealQuery = check.supabase
      .from("deals")
      .select(
        "id, title, budget, stage, created_at, owner_id, owner:profiles!owner_id(display_name, email)",
      )
      .eq("status", "open");

    if (memberIds) dealQuery = dealQuery.in("owner_id", memberIds);

    const { data: dealRows, error } = await dealQuery;
    if (error) return { success: false, message: "Failed to load pipeline." };

    const rows = dealRows as unknown as DealRow[];
    const dealIds = rows.map((r) => r.id);

    // Last interaction per deal. Fetched in one pass and reduced in memory
    // rather than a per-deal query.
    const lastActivity = new Map<string, string>();
    if (dealIds.length > 0) {
      const { data: activityRows } = await check.supabase
        .from("activities")
        .select("deal_id, created_at")
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false });

      for (const row of activityRows ?? []) {
        const dealId = row.deal_id as string;
        if (dealId && !lastActivity.has(dealId)) {
          lastActivity.set(dealId, row.created_at as string);
        }
      }
    }

    const now = Date.now();
    const deals: PipelineDeal[] = rows.map((row) => {
      // No interaction yet means the clock runs from when the deal was
      // created -- otherwise a deal nobody ever touched would look fresh.
      const since = lastActivity.get(row.id) ?? row.created_at;
      const daysSinceActivity = Math.floor(
        (now - new Date(since).getTime()) / 86_400_000,
      );
      return {
        id: row.id,
        title: row.title,
        budget: row.budget,
        stage: row.stage,
        ownerId: row.owner_id,
        ownerName: row.owner?.display_name ?? row.owner?.email ?? null,
        lastActivityAt: lastActivity.get(row.id) ?? null,
        daysSinceActivity,
        isStale: daysSinceActivity >= STALE_AFTER_DAYS,
      };
    });

    const stages: PipelineStageGroup[] = DEAL_STAGES.map((stage) => {
      const stageDeals = deals
        .filter((deal) => deal.stage === stage)
        .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
      return {
        stage,
        deals: stageDeals,
        totalBudget: stageDeals.reduce((sum, d) => sum + (d.budget ?? 0), 0),
      };
    });

    return {
      success: true,
      pipeline: {
        stages,
        teamSize: memberIds ? memberIds.length : 0,
        staleCount: deals.filter((d) => d.isStale).length,
        totalOpen: deals.length,
      },
    };
  },
);
