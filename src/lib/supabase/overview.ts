import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./access.ts";
import type { DealStage, DealStatus } from "./deals.ts";
import type { Reminder } from "./reminders.ts";

/**
 * Batched read models.
 *
 * Every server function pays ~260ms up front in requireAuth() -- one network
 * round trip to validate the session, one to read the profile. That cost is
 * per *request*, so a page that fires five separate list calls pays it five
 * times. These functions authenticate once and fan the queries out in
 * parallel instead, which is the difference between ~18 Supabase round trips
 * on the workspace home and ~6.
 */

/** Statuses that mean a lead is still working its way through the pipeline. */
const OPEN_LEAD_STATUSES = [
  "new",
  "escalated",
  "tech_approved",
  "finance_approved",
];

export interface RailCounts {
  companies: number;
  contacts: number;
  leads: number;
  deals: number;
}

/**
 * Counts for the nav rail. Uses head-only count queries so Postgres returns a
 * number rather than shipping every row across the wire to be measured with
 * .length.
 */
export const getRailCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; counts: RailCounts } | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const countOf = (table: string) =>
      check.supabase.from(table).select("id", { count: "exact", head: true });

    const [companies, contacts, leads, deals] = await Promise.all([
      countOf("companies"),
      countOf("contacts"),
      countOf("leads"),
      countOf("deals"),
    ]);

    return {
      success: true,
      counts: {
        companies: companies.count ?? 0,
        contacts: contacts.count ?? 0,
        leads: leads.count ?? 0,
        deals: deals.count ?? 0,
      },
    };
  },
);

export interface OverviewLead {
  id: string;
  title: string;
  status: string;
}

export interface OverviewDeal {
  id: string;
  title: string;
  stage: DealStage;
  createdAt: string;
}

/** Only what the pipeline funnel needs to bucket deals by stage. */
export interface PipelineDatum {
  stage: DealStage;
  status: DealStatus;
}

export interface WorkspaceOverview {
  companies: number;
  contacts: number;
  openLeads: number;
  openDeals: number;
  recentLeads: OverviewLead[];
  recentDeals: OverviewDeal[];
  reminders: Reminder[];
  pipeline: PipelineDatum[];
}

/**
 * Everything the workspace home renders, in one authenticated request.
 * Replaces five separate list calls that each re-authenticated and each
 * pulled full joined rows the dashboard only counted or truncated.
 */
export const getWorkspaceOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { success: true; overview: WorkspaceOverview }
    | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const [
      companies,
      contacts,
      openLeads,
      openDeals,
      recentLeads,
      recentDeals,
      reminders,
      pipeline,
    ] = await Promise.all([
      check.supabase
        .from("companies")
        .select("id", { count: "exact", head: true }),
      check.supabase
        .from("contacts")
        .select("id", { count: "exact", head: true }),
      check.supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("status", OPEN_LEAD_STATUSES),
      check.supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      check.supabase
        .from("leads")
        .select("id, title, status")
        .order("created_at", { ascending: false })
        .limit(5),
      check.supabase
        .from("deals")
        .select("id, title, stage, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      check.supabase
        .from("reminders")
        .select(
          "id, message, remind_at, is_done, lead_id, deal_id, owner_id, created_at",
        )
        .eq("owner_id", check.userId)
        .eq("is_done", false)
        .order("remind_at", { ascending: true })
        .limit(10),
      check.supabase.from("deals").select("stage, status"),
    ]);

    if (recentLeads.error || recentDeals.error || pipeline.error) {
      return { success: false, message: "Failed to load workspace overview." };
    }

    return {
      success: true,
      overview: {
        companies: companies.count ?? 0,
        contacts: contacts.count ?? 0,
        openLeads: openLeads.count ?? 0,
        openDeals: openDeals.count ?? 0,
        recentLeads: (recentLeads.data ?? []) as OverviewLead[],
        recentDeals: (recentDeals.data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          stage: row.stage as DealStage,
          createdAt: row.created_at,
        })),
        reminders: (reminders.data ?? []).map((row) => ({
          id: row.id,
          message: row.message,
          remindAt: row.remind_at,
          isDone: row.is_done,
          leadId: row.lead_id,
          dealId: row.deal_id,
          ownerId: row.owner_id,
          createdAt: row.created_at,
        })),
        pipeline: (pipeline.data ?? []) as PipelineDatum[],
      },
    };
  },
);
