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
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import type { Lead } from "#/lib/supabase/leads.ts";

interface LeadReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  kind: "technical" | "financial";
  onSubmit: (
    leadId: string,
    decision: "approved" | "rejected",
    notes: string,
  ) => Promise<{ success: boolean; message?: string }>;
  onSaved: () => void;
}

export function LeadReviewDialog({
  open,
  onOpenChange,
  lead,
  kind,
  onSubmit,
  onSaved,
}: LeadReviewDialogProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setError(null);
  }, [open]);

  async function handleDecision(decision: "approved" | "rejected") {
    if (!lead) return;
    setError(null);
    setSubmitting(decision);
    const result = await onSubmit(lead.id, decision, notes);
    setSubmitting(null);

    if (!result.success) {
      setError(result.message ?? "Something went wrong.");
      return;
    }

    onOpenChange(false);
    onSaved();
  }

  const label =
    kind === "technical" ? "technical feasibility" : "financial viability";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {label}</DialogTitle>
          <DialogDescription>{lead?.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="review-notes">Notes</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5"
              placeholder="Reasoning for your decision (optional)"
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
            variant="destructive"
            disabled={submitting !== null}
            onClick={() => handleDecision("rejected")}
          >
            {submitting === "rejected" ? "Rejecting..." : "Reject"}
          </Button>
          <Button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleDecision("approved")}
          >
            {submitting === "approved" ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
