import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";

export interface Reminder {
  id: string;
  message: string;
  remindAt: string;
  isDone: boolean;
  leadId: string | null;
  dealId: string | null;
  ownerId: string;
  createdAt: string;
}

type ActionResult = { success: true } | { success: false; message: string };

const reminderSelect =
  "id, message, remind_at, is_done, lead_id, deal_id, owner_id, created_at";

interface ReminderRow {
  id: string;
  message: string;
  remind_at: string;
  is_done: boolean;
  lead_id: string | null;
  deal_id: string | null;
  owner_id: string;
  created_at: string;
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    message: row.message,
    remindAt: row.remind_at,
    isDone: row.is_done,
    leadId: row.lead_id,
    dealId: row.deal_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

// US-19: reminders attached to a specific lead or deal.
export const listReminders = createServerFn({ method: "GET" })
  .validator(
    z.object({
      leadId: z.string().uuid().optional(),
      dealId: z.string().uuid().optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; reminders: Reminder[] }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      let query = check.supabase.from("reminders").select(reminderSelect);
      if (data.leadId) query = query.eq("lead_id", data.leadId);
      if (data.dealId) query = query.eq("deal_id", data.dealId);

      const { data: rows, error } = await query.order("remind_at", {
        ascending: true,
      });

      if (error)
        return { success: false, message: "Failed to load reminders." };

      return {
        success: true,
        reminders: (rows as unknown as ReminderRow[]).map(mapReminder),
      };
    },
  );

// Upcoming (not-done) reminders for the signed-in user, across leads and
// deals -- used on the workspace home dashboard.
export const listMyUpcomingReminders = createServerFn({
  method: "GET",
}).handler(
  async (): Promise<
    | { success: true; reminders: Reminder[] }
    | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: rows, error } = await check.supabase
      .from("reminders")
      .select(reminderSelect)
      .eq("owner_id", check.userId)
      .eq("is_done", false)
      .order("remind_at", { ascending: true })
      .limit(10);

    if (error) return { success: false, message: "Failed to load reminders." };

    return {
      success: true,
      reminders: (rows as unknown as ReminderRow[]).map(mapReminder),
    };
  },
);

const createReminderSchema = z
  .object({
    leadId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    remindAt: z.string().trim().min(1, "Date is required"),
    message: z.string().trim().min(1, "Message is required").max(500),
  })
  .refine((val) => Boolean(val.leadId) !== Boolean(val.dealId), {
    message: "A reminder must be attached to exactly one lead or deal.",
  });

export const createReminder = createServerFn({ method: "POST" })
  .validator(createReminderSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { error } = await check.supabase.from("reminders").insert({
      org_id: check.orgId,
      lead_id: data.leadId ?? null,
      deal_id: data.dealId ?? null,
      owner_id: check.userId,
      remind_at: new Date(data.remindAt).toISOString(),
      message: data.message,
    });

    if (error) {
      return { success: false, message: "Failed to schedule reminder." };
    }

    return { success: true };
  });

const setReminderDoneSchema = z.object({
  reminderId: z.string().uuid(),
  isDone: z.boolean(),
});

export const setReminderDone = createServerFn({ method: "POST" })
  .validator(setReminderDoneSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: updated, error } = await check.supabase
      .from("reminders")
      .update({ is_done: data.isDone })
      .eq("id", data.reminderId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to update reminder." };
    if (!updated) {
      return {
        success: false,
        message: "You don't have permission to edit this reminder.",
      };
    }

    return { success: true };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .validator(z.object({ reminderId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data: deleted, error } = await check.supabase
      .from("reminders")
      .delete()
      .eq("id", data.reminderId)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: "Failed to delete reminder." };
    if (!deleted) {
      return {
        success: false,
        message: "You don't have permission to delete this reminder.",
      };
    }

    return { success: true };
  });
