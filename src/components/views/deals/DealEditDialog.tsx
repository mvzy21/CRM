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
import { type Deal, updateDeal } from "#/lib/supabase/deals.ts";

interface DealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onSaved: () => void;
}

export function DealEditDialog({
  open,
  onOpenChange,
  deal,
  onSaved,
}: DealEditDialogProps) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !deal) return;
    setTitle(deal.title);
    setBudget(deal.budget?.toString() ?? "");
    setDeadline(deal.deadline ?? "");
    setRequirements(deal.requirements ?? "");
    setError(null);
  }, [open, deal]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal) return;
    setError(null);
    setSubmitting(true);

    const result = await updateDeal({
      data: {
        dealId: deal.id,
        title,
        budget: budget.trim() ? Number(budget) : null,
        deadline,
        requirements,
      },
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit deal</DialogTitle>
          <DialogDescription>
            Update budget, deadline, and customer requirements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="deal-title">Title</Label>
            <Input
              id="deal-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="deal-budget">Budget</Label>
            <Input
              id="deal-budget"
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="deal-deadline">Deadline</Label>
            <Input
              id="deal-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="deal-requirements">Requirements</Label>
            <Textarea
              id="deal-requirements"
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className="mt-1.5"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
