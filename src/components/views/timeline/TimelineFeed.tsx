import { Bell, MessageSquare, Phone, Users } from "lucide-react";
import type { TimelineEvent } from "#/lib/supabase/timeline.ts";
import { formatRelativeTime } from "#/lib/utils.ts";

const KIND_ICON: Record<TimelineEvent["kind"], typeof Bell> = {
  event: Bell,
  call: Phone,
  meeting: Users,
  note: MessageSquare,
};

interface TimelineFeedProps {
  events: TimelineEvent[] | null;
  emptyMessage?: string;
}

export function TimelineFeed({
  events,
  emptyMessage = "Nothing here yet.",
}: TimelineFeedProps) {
  if (events === null) {
    return <p className="text-sm text-[var(--ink-soft)]">Loading…</p>;
  }
  if (events.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => {
        const Icon = KIND_ICON[event.kind];
        return (
          <li key={event.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--ink-soft)]">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="whitespace-pre-wrap text-sm text-[var(--ink)]">
                {event.summary}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                {event.actorName ?? "—"} · {formatRelativeTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
