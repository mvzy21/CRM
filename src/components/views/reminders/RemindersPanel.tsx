import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  createReminder,
  listReminders,
  type Reminder,
  setReminderDone,
} from "#/lib/supabase/reminders.ts";
import { formatRelativeTime } from "#/lib/utils.ts";

interface RemindersPanelProps {
  leadId?: string;
  dealId?: string;
}

function defaultRemindAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RemindersPanel({ leadId, dealId }: RemindersPanelProps) {
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [remindAt, setRemindAt] = useState(defaultRemindAt());
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const result = await listReminders({ data: { leadId, dealId } });
    if (result.success) setReminders(result.reminders);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount + parent id change
  useEffect(() => {
    refresh();
  }, [leadId, dealId]);

  async function handleAdd() {
    if (!message.trim()) return;
    setError(null);
    setSubmitting(true);
    const result = await createReminder({
      data: { leadId, dealId, remindAt, message: message.trim() },
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage("");
    setRemindAt(defaultRemindAt());
    refresh();
  }

  async function handleToggleDone(reminder: Reminder) {
    const result = await setReminderDone({
      data: { reminderId: reminder.id, isDone: !reminder.isDone },
    });
    if (result.success) refresh();
  }

  const pending = reminders?.filter((r) => !r.isDone) ?? [];
  const done = reminders?.filter((r) => r.isDone) ?? [];

  return (
    <div className="panel mt-6 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-[var(--ink-soft)]" />
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
          Reminders
        </p>
      </div>

      {reminders === null ? (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
      ) : (
        <>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No reminders scheduled yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {pending.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--line)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-[var(--ink)]">
                      {reminder.message}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                      {formatRelativeTime(reminder.remindAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleDone(reminder)}
                  >
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {done.length > 0 ? (
            <p className="mt-3 text-xs text-[var(--ink-soft)]">
              {done.length} completed reminder{done.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="sm:w-52"
        />
        <Input
          placeholder="Reminder note…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          disabled={submitting || !message.trim()}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
