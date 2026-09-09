import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";

// US-17 (Log Customer Interaction) and US-23 (Notes -- a filtered view over
// kind = 'note'). An activity hangs off exactly one parent: a lead or a
// deal. Lead-side logging is what lets a Sales Rep record the call or
// meeting behind a Hot/Cold call, and gives the Tech/Finance reviewers a
// history to read before they decide.

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

type ActionResult = { success: true } | { success: false; message: string };

// Exactly one of leadId/dealId, mirroring the DB's
// activities_exactly_one_parent constraint.
const activityParent = z
  .object({
    leadId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
  })
  .refine(
    (value) => Boolean(value.leadId) !== Boolean(value.dealId),
    "Provide exactly one of leadId or dealId.",
  );

export const listActivities = createServerFn({ method: "GET" })
  .validator(activityParent)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; activities: Activity[] }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const query = check.supabase
        .from("activities")
        .select(
          "id, kind, body, author_id, created_at, author:profiles!author_id(display_name, email)",
        )
        .order("created_at", { ascending: false });

      const { data: rows, error } = await (data.leadId
        ? query.eq("lead_id", data.leadId)
        : query.eq("deal_id", data.dealId as string));

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

const logActivitySchema = z
  .object({
    leadId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    kind: z.enum(["call", "meeting", "note"]),
    body: z.string().trim().min(1, "Details are required").max(4000),
  })
  .refine(
    (value) => Boolean(value.leadId) !== Boolean(value.dealId),
    "Provide exactly one of leadId or dealId.",
  );

export const logActivity = createServerFn({ method: "POST" })
  .validator(logActivitySchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase.from("activities").insert({
      org_id: check.orgId,
      lead_id: data.leadId ?? null,
      deal_id: data.dealId ?? null,
      author_id: check.userId,
      kind: data.kind,
      body: data.body,
    });

    if (error) {
      return {
        success: false,
        message: data.leadId
          ? "Failed to log interaction. You may not have access to this lead."
          : "Failed to log interaction. You may not have access to this deal.",
      };
    }

    return { success: true };
  });
