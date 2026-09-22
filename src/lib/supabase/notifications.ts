import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";
import type { AppRole } from "./roles.ts";
import type { createServerSupabaseClient } from "./server.ts";

export interface Notification {
  id: string;
  entityType: "lead" | "deal";
  entityId: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

type Supabase = ReturnType<typeof createServerSupabaseClient>;

// Best-effort, same as logTimelineEvent: a notification failing to write
// should never fail the action that triggered it.
async function notify(
  supabase: Supabase,
  params: {
    orgId: string;
    userId: string;
    entityType: "lead" | "deal";
    entityId: string;
    title: string;
    body?: string;
  },
): Promise<void> {
  await supabase.from("notifications").insert({
    org_id: params.orgId,
    user_id: params.userId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    title: params.title,
    body: params.body ?? null,
  });
}

/** Notify every user holding `role` in the org -- for handoffs like "any
 * Finance Lead can pick this up" where there's no single assignee. */
async function notifyRole(
  supabase: Supabase,
  params: {
    orgId: string;
    role: AppRole;
    entityType: "lead" | "deal";
    entityId: string;
    title: string;
    body?: string;
    excludeUserId?: string;
  },
): Promise<void> {
  const { data: users } = await supabase
    .from("profiles")
    .select("id")
    .eq("org_id", params.orgId)
    .eq("role", params.role)
    .eq("is_active", true);

  const targets = (users ?? []).filter((u) => u.id !== params.excludeUserId);
  if (targets.length === 0) return;

  await supabase.from("notifications").insert(
    targets.map((u) => ({
      org_id: params.orgId,
      user_id: u.id,
      entity_type: params.entityType,
      entity_id: params.entityId,
      title: params.title,
      body: params.body ?? null,
    })),
  );
}

export { notify, notifyRole };

interface NotificationRow {
  id: string;
  entity_type: "lead" | "deal";
  entity_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const mapNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  title: row.title,
  body: row.body,
  isRead: row.is_read,
  createdAt: row.created_at,
});

export const listNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { success: true; notifications: Notification[]; unreadCount: number }
    | { success: false; message: string }
  > => {
    const check = await requireAuth();
    if (!check.ok) return { success: false, message: check.message };

    const { data, error } = await check.supabase
      .from("notifications")
      .select("id, entity_type, entity_id, title, body, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return { success: false, message: "Failed to load notifications." };
    }

    const notifications = (data as unknown as NotificationRow[]).map(
      mapNotification,
    );

    return {
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    };
  },
);

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ notificationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const check = await requireAuth();
    if (!check.ok) return { success: false as const, message: check.message };

    const { data: updated, error } = await check.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.notificationId)
      .eq("user_id", check.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false as const, message: "Failed to update notification." };
    }
    if (!updated) {
      return { success: false as const, message: "Notification not found." };
    }
    return { success: true as const };
  });

export const markAllNotificationsRead = createServerFn({
  method: "POST",
}).handler(async () => {
  const check = await requireAuth();
  if (!check.ok) return { success: false as const, message: check.message };

  const { error } = await check.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", check.userId)
    .eq("is_read", false);

  if (error) {
    return { success: false as const, message: "Failed to update notifications." };
  }
  return { success: true as const };
});
