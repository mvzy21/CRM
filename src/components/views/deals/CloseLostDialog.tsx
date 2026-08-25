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
import { closeDealLost, type Deal } from "#/lib/supabase/deals.ts";

interface CloseLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onSaved: () => void;
}

export function CloseLostDialog({
  open,
  onOpenChange,
  deal,
  onSaved,
}: CloseLostDialogProps) {
  const [lostReason, setLostReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLostReason("");
    setError(null);
  }, [open]);

  async function handleSubmit() {
    if (!deal || !lostReason.trim()) return;
    setError(null);
    setSubmitting(true);
    const result = await closeDealLost({
      data: { dealId: deal.id, lostReason: lostReason.trim() },
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
          <DialogTitle>Close Deal as Lost</DialogTitle>
          <DialogDescription>{deal?.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="lost-reason">Reason</Label>
            <Textarea
              id="lost-reason"
              className="mt-1.5"
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Why was this deal lost?"
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
            disabled={submitting || !lostReason.trim()}
            onClick={handleSubmit}
          >
            {submitting ? "Closing..." : "Close as Lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
