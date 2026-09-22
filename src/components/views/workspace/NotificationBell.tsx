import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "#/lib/supabase/notifications.ts";
import { formatRelativeTime } from "#/lib/utils.ts";

const POLL_MS = 60_000;

interface NotificationBellProps {
  workspaceId: string;
}

export function NotificationBell({ workspaceId }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const result = await listNotifications();
    if (result.success) {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: poll on mount only
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleOpenNotification(n: Notification) {
    setOpen(false);
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead({ data: { notificationId: n.id } });
    }
    if (n.entityType === "lead") {
      navigate({
        to: "/workspace/$workspaceId/leads/$leadId",
        params: { workspaceId, leadId: n.entityId },
      });
    } else {
      navigate({
        to: "/workspace/$workspaceId/deals/$dealId",
        params: { workspaceId, dealId: n.entityId },
      });
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="rail-icon-btn relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[85vw] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--ink)]">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--ink-soft)]">
                Nothing yet.
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(n)}
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-0 hover:bg-[var(--muted)] ${
                        n.isRead ? "" : "bg-[var(--muted)]/50"
                      }`}
                    >
                      <span className="flex w-full items-start gap-2">
                        {!n.isRead ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 text-sm text-[var(--ink)]">
                          {n.title}
                        </span>
                      </span>
                      {n.body ? (
                        <span className="truncate pl-3.5 text-xs text-[var(--ink-soft)]">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="pl-3.5 text-[11px] text-[var(--ink-soft)]">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
