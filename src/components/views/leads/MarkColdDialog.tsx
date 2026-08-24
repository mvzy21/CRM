import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { type Lead, markLeadCold } from "#/lib/supabase/leads.ts";
import { createReminder } from "#/lib/supabase/reminders.ts";

interface MarkColdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSaved: () => void;
}

function defaultRemindAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MarkColdDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
}: MarkColdDialogProps) {
  const [remindAt, setRemindAt] = useState(defaultRemindAt());
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemindAt(defaultRemindAt());
    setMessage(lead ? `Follow up on ${lead.title}` : "");
    setError(null);
  }, [open, lead]);

  async function handleSubmit() {
    if (!lead) return;
    setError(null);
    setSubmitting(true);

    const coldResult = await markLeadCold({ data: { leadId: lead.id } });
    if (!coldResult.success) {
      setSubmitting(false);
      setError(coldResult.message);
      return;
    }

    const reminderResult = await createReminder({
      data: {
        leadId: lead.id,
        remindAt,
        message: message.trim() || `Follow up on ${lead.title}`,
      },
    });
    setSubmitting(false);

    if (!reminderResult.success) {
      setError(
        `Lead marked Cold, but scheduling the reminder failed: ${reminderResult.message}`,
      );
      onSaved();
      return;
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Cold &amp; Schedule Follow-up</DialogTitle>
          <DialogDescription>{lead?.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="mark-cold-remind-at">Follow up on</Label>
            <Input
              id="mark-cold-remind-at"
              type="datetime-local"
              className="mt-1.5"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="mark-cold-message">Reminder note</Label>
            <Textarea
              id="mark-cold-message"
              className="mt-1.5"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !remindAt}
            onClick={handleSubmit}
          >
            {submitting ? "Saving..." : "Mark Cold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
