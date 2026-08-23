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
import { type Lead, type UserOption, escalateLead } from "#/lib/supabase/leads.ts";

interface EscalateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  techLeads: UserOption[];
  onSaved: () => void;
}

export function EscalateDialog({
  open,
  onOpenChange,
  lead,
  techLeads,
  onSaved,
}: EscalateDialogProps) {
  const [techLeadId, setTechLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTechLeadId(techLeads[0]?.id ?? null);
    setError(null);
  }, [open, techLeads]);

  async function handleSubmit() {
    if (!lead || !techLeadId) return;
    setError(null);
    setSubmitting(true);
    const result = await escalateLead({ data: { leadId: lead.id, techLeadId } });
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
          <DialogTitle>Escalate to Tech Review</DialogTitle>
          <DialogDescription>{lead?.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {techLeads.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              No active Tech Leads found in your org.
            </p>
          ) : (
            <div>
              <Label htmlFor="escalate-tech-lead">Tech Lead</Label>
              <Select
                value={techLeadId ?? undefined}
                onValueChange={(value) => setTechLeadId(value)}
              >
                <SelectTrigger id="escalate-tech-lead" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {techLeads.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName ?? user.email}
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
            disabled={submitting || !techLeadId}
            onClick={handleSubmit}
          >
            {submitting ? "Escalating..." : "Escalate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
