import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./access.ts";
import type { createServerSupabaseClient } from "./server.ts";

export interface TimelineEvent {
  id: string;
  kind: "event" | "call" | "meeting" | "note";
  summary: string;
  actorName: string | null;
  createdAt: string;
}

// Best-effort: failures here should never break the calling action.
export async function logTimelineEvent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  params: {
    orgId: string;
    actorId: string;
    entityType: "lead" | "deal";
    entityId: string;
    summary: string;
  },
): Promise<void> {
  await supabase.from("timeline_events").insert({
    org_id: params.orgId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    actor_id: params.actorId,
    summary: params.summary,
  });
}

interface TimelineEventRow {
  id: string;
  summary: string;
  created_at: string;
  actor: { display_name: string | null; email: string | null } | null;
}

export const listLeadTimeline = createServerFn({ method: "GET" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; events: TimelineEvent[] }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const { data: rows, error } = await check.supabase
        .from("timeline_events")
        .select(
          "id, summary, created_at, actor:profiles!actor_id(display_name, email)",
        )
        .eq("entity_type", "lead")
        .eq("entity_id", data.leadId)
        .order("created_at", { ascending: false });

      if (error) return { success: false, message: "Failed to load timeline." };

      const events: TimelineEvent[] = (
        rows as unknown as TimelineEventRow[]
      ).map((row) => ({
        id: row.id,
        kind: "event",
        summary: row.summary,
        actorName: row.actor?.display_name ?? row.actor?.email ?? null,
        createdAt: row.created_at,
      }));

      return { success: true, events };
    },
  );

interface ActivityTimelineRow {
  id: string;
  kind: "call" | "meeting" | "note";
  body: string;
  created_at: string;
  author: { display_name: string | null; email: string | null } | null;
}

// Interleaves timeline_events (status changes) with activities (logged
// interactions) for a Deal, sorted chronologically.
export const listDealTimeline = createServerFn({ method: "GET" })
  .validator(z.object({ dealId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; events: TimelineEvent[] }
      | { success: false; message: string }
    > => {
      const check = await requireAuth();
      if (!check.ok) return { success: false, message: check.message };

      const [eventsResult, activitiesResult] = await Promise.all([
        check.supabase
          .from("timeline_events")
          .select(
            "id, summary, created_at, actor:profiles!actor_id(display_name, email)",
          )
          .eq("entity_type", "deal")
          .eq("entity_id", data.dealId),
        check.supabase
          .from("activities")
          .select(
            "id, kind, body, created_at, author:profiles!author_id(display_name, email)",
          )
          .eq("deal_id", data.dealId),
      ]);

      if (eventsResult.error || activitiesResult.error) {
        return { success: false, message: "Failed to load timeline." };
      }

      const events: TimelineEvent[] = [
        ...(eventsResult.data as unknown as TimelineEventRow[]).map(
          (row): TimelineEvent => ({
            id: row.id,
            kind: "event",
            summary: row.summary,
            actorName: row.actor?.display_name ?? row.actor?.email ?? null,
            createdAt: row.created_at,
          }),
        ),
        ...(activitiesResult.data as unknown as ActivityTimelineRow[]).map(
          (row): TimelineEvent => ({
            id: row.id,
            kind: row.kind,
            summary: row.body,
            actorName: row.author?.display_name ?? row.author?.email ?? null,
            createdAt: row.created_at,
          }),
        ),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return { success: true, events };
    },
  );
