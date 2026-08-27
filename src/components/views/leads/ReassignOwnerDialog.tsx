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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import {
  type Lead,
  reassignLeadOwner,
  type UserOption,
} from "#/lib/supabase/leads.ts";

interface ReassignOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  salesReps: UserOption[];
  onSaved: () => void;
}

export function ReassignOwnerDialog({
  open,
  onOpenChange,
  lead,
  salesReps,
  onSaved,
}: ReassignOwnerDialogProps) {
  const [newOwnerId, setNewOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewOwnerId(
      salesReps.find((rep) => rep.id !== lead?.ownerId)?.id ??
        salesReps[0]?.id ??
        null,
    );
    setError(null);
  }, [open, salesReps, lead?.ownerId]);

  async function handleSubmit() {
    if (!lead || !newOwnerId) return;
    setError(null);
    setSubmitting(true);
    const result = await reassignLeadOwner({
      data: { leadId: lead.id, newOwnerId },
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
          <DialogTitle>Reassign owner</DialogTitle>
          <DialogDescription>{lead?.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {salesReps.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              No active Sales Reps found in your org.
            </p>
          ) : (
            <div>
              <Label htmlFor="reassign-owner">New owner</Label>
              <Select
                value={newOwnerId ?? undefined}
                onValueChange={(value) => setNewOwnerId(value)}
              >
                <SelectTrigger id="reassign-owner" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName ?? user.email}
                      {user.id === lead?.ownerId ? " (current owner)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            disabled={
              submitting || !newOwnerId || newOwnerId === lead?.ownerId
            }
            onClick={handleSubmit}
          >
            {submitting ? "Reassigning..." : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
