import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";

export type DealStage = "proposal" | "negotiation" | "contract";
export type DealStatus = "open" | "won" | "lost";

export const DEAL_STAGES: DealStage[] = ["proposal", "negotiation", "contract"];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  proposal: "Proposal",
  negotiation: "Negotiation",
  contract: "Contract",
};

export interface Deal {
  id: string;
  title: string;
  budget: number | null;
  deadline: string | null;
  requirements: string | null;
  stage: DealStage;
  status: DealStatus;
  lostReason: string | null;
  closedAt: string | null;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  leadId: string | null;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

const dealSelect =
  "id, title, budget, deadline, requirements, stage, status, lost_reason, closed_at, " +
  "company_id, contact_id, owner_id, lead_id, created_at, " +
  "company:companies!company_id(id, name), contact:contacts!contact_id(id, name), " +
  "owner:profiles!owner_id(display_name, email)";

interface DealRow {
  id: string;
  title: string;
  budget: number | null;
  deadline: string | null;
  requirements: string | null;
  stage: DealStage;
  status: DealStatus;
  lost_reason: string | null;
  closed_at: string | null;
  company_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  lead_id: string | null;
  created_at: string;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  owner: { display_name: string | null; email: string | null } | null;
}

function mapDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    budget: row.budget,
    deadline: row.deadline,
    requirements: row.requirements,
    stage: row.stage,
    status: row.status,
    lostReason: row.lost_reason,
    closedAt: row.closed_at,
    companyId: row.company_id,
    companyName: row.company?.name ?? null,
    contactId: row.contact_id,
    contactName: row.contact?.name ?? null,
    ownerId: row.owner_id,
    ownerName: row.owner?.display_name ?? row.owner?.email ?? null,
    leadId: row.lead_id,
    createdAt: row.created_at,
  };
}

export const getDeal = createServerFn({ method: "GET" })
  .validator(z.object({ dealId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; deal: Deal } | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const { data: row, error } = await check.supabase
        .from("deals")
        .select(dealSelect)
        .eq("id", data.dealId)
        .maybeSingle();

      if (error) return { success: false, message: "Failed to load deal." };
      if (!row) return { success: false, message: "Deal not found." };

      return { success: true, deal: mapDeal(row as unknown as DealRow) };
    },
  );

export const listDeals = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; deals: Deal[] } | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("deals")
      .select(dealSelect)
      .order("created_at", { ascending: false });

    if (error) return { success: false, message: "Failed to load deals." };

    return {
      success: true,
      deals: (data as unknown as DealRow[]).map(mapDeal),
    };
  },
);

// US-15 / US-18: update deal details and customer requirements.
const updateDealSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().trim().min(1, "Deal title is required").max(200),
  budget: z.number().nonnegative().nullable(),
  deadline: z.string().trim().max(10).optional().or(z.literal("")),
  requirements: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const updateDeal = createServerFn({ method: "POST" })
  .validator(updateDealSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: updated, error } = await check.supabase
      .from("deals")
      .update({
        title: data.title,
        budget: data.budget,
        deadline: data.deadline || null,
        requirements: data.requirements || null,
      })
      .eq("id", data.dealId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to update deal." };
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this deal.",
      };
    }

    return { success: true };
  });

// US-16: move a deal to its next (or any) pipeline stage.
const moveDealStageSchema = z.object({
  dealId: z.string().uuid(),
  stage: z.enum(["proposal", "negotiation", "contract"]),
});

export const moveDealStage = createServerFn({ method: "POST" })
  .validator(moveDealStageSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: updated, error } = await check.supabase
      .from("deals")
      .update({ stage: data.stage })
      .eq("id", data.dealId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to move deal stage." };
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this deal.",
      };
    }

    return { success: true };
  });

export interface Activity {
  id: string;
  kind: "call" | "meeting" | "note";
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

interface ActivityRow {
  id: string;
  kind: "call" | "meeting" | "note";
  body: string;
  author_id: string | null;
  created_at: string;
  author: { display_name: string | null; email: string | null } | null;
}

// US-17: log a customer interaction (call / meeting / note) against a deal.
export const listActivities = createServerFn({ method: "GET" })
  .validator(z.object({ dealId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; activities: Activity[] } | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const { data: rows, error } = await check.supabase
        .from("activities")
        .select("id, kind, body, author_id, created_at, author:profiles!author_id(display_name, email)")
        .eq("deal_id", data.dealId)
        .order("created_at", { ascending: false });

      if (error) return { success: false, message: "Failed to load activity." };

      const activities: Activity[] = (rows as unknown as ActivityRow[]).map(
        (row) => ({
          id: row.id,
          kind: row.kind,
          body: row.body,
          authorId: row.author_id,
          authorName: row.author?.display_name ?? row.author?.email ?? null,
          createdAt: row.created_at,
        }),
      );

      return { success: true, activities };
    },
  );

const logActivitySchema = z.object({
  dealId: z.string().uuid(),
  kind: z.enum(["call", "meeting", "note"]),
  body: z.string().trim().min(1, "Details are required").max(4000),
});

export const logActivity = createServerFn({ method: "POST" })
  .validator(logActivitySchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase.from("activities").insert({
      org_id: check.orgId,
      deal_id: data.dealId,
      author_id: check.userId,
      kind: data.kind,
      body: data.body,
    });

    if (error) {
      return {
        success: false,
        message: "Failed to log interaction. You may not have access to this deal.",
      };
    }

    return { success: true };
  });
