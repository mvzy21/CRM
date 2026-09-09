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
import type { Activity } from "#/lib/supabase/activities.ts";
import type { Lead } from "#/lib/supabase/leads.ts";

const ACTIVITY_KIND_LABELS: Record<Activity["kind"], string> = {
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};

interface LeadReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  activities: Activity[];
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
  activities,
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-[var(--border)] p-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Client
              </p>
              <p className="mt-0.5 text-[var(--ink)]">
                {lead?.companyName ?? "No company"}
                {lead?.companyIndustry ? ` · ${lead.companyIndustry}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Contact
              </p>
              <p className="mt-0.5 text-[var(--ink)]">
                {lead?.contactName ?? "—"}
                {lead?.contactEmail ? ` · ${lead.contactEmail}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Indicative budget
              </p>
              <p className="mt-0.5 text-[var(--ink)]">
                {lead?.budget === null || lead?.budget === undefined
                  ? "Not provided"
                  : lead.budget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Expected close
              </p>
              <p className="mt-0.5 text-[var(--ink)]">
                {lead?.expectedCloseDate ?? "Not provided"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Requirements
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                {lead?.requirements ?? "Not provided"}
              </p>
            </div>
            {lead?.description ? (
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                  Description
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                  {lead.description}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              Client interactions ({activities.length})
            </p>
            {activities.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                No calls, meetings or notes logged on this lead yet.
              </p>
            ) : (
              <ul className="mt-1.5 flex max-h-40 flex-col gap-2 overflow-y-auto">
                {activities.slice(0, 8).map((activity) => (
                  <li
                    key={activity.id}
                    className="rounded-md border border-[var(--border)] px-2.5 py-2 text-sm"
                  >
                    <p className="text-xs text-[var(--ink-soft)]">
                      {ACTIVITY_KIND_LABELS[activity.kind]}
                      {activity.authorName ? ` · ${activity.authorName}` : ""}
                      {" · "}
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                      {activity.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
