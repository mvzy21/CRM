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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import type { Company } from "#/lib/supabase/companies.ts";
import type { Contact } from "#/lib/supabase/contacts.ts";
import { createLead, type Lead, updateLead } from "#/lib/supabase/leads.ts";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  contacts: Contact[];
  editingLead: Lead | null;
  onSaved: () => void;
}

export function LeadDialog({
  open,
  onOpenChange,
  companies,
  contacts,
  editingLead,
  onSaved,
}: LeadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editingLead?.title ?? "");
    setDescription(editingLead?.description ?? "");
    setRequirements(editingLead?.requirements ?? "");
    setBudget(
      editingLead?.budget === null || editingLead?.budget === undefined
        ? ""
        : String(editingLead.budget),
    );
    setExpectedCloseDate(editingLead?.expectedCloseDate ?? "");
    setCompanyId(editingLead?.companyId ?? null);
    setContactId(editingLead?.contactId ?? null);
    setError(null);
  }, [open, editingLead]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const assessment = {
      requirements,
      budget: budget.trim() === "" ? null : Number(budget),
      expectedCloseDate,
    };

    const result = editingLead
      ? await updateLead({
          data: {
            leadId: editingLead.id,
            title,
            description,
            companyId,
            contactId,
            ...assessment,
          },
        })
      : await createLead({
          data: { title, description, companyId, contactId, ...assessment },
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
          <DialogTitle>{editingLead ? "Edit lead" : "Add a lead"}</DialogTitle>
          <DialogDescription>
            Capture a lead and optionally link it to a company or contact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="lead-title">Title</Label>
            <Input
              id="lead-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="lead-description">Description</Label>
            <Textarea
              id="lead-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="lead-requirements">Requirements</Label>
            <Textarea
              id="lead-requirements"
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className="mt-1.5"
              placeholder="What the client is asking for — the Tech Lead reviews feasibility against this."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lead-budget">Indicative budget</Label>
              <Input
                id="lead-budget"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="mt-1.5"
                placeholder="Reviewed by Finance"
              />
            </div>

            <div>
              <Label htmlFor="lead-expected-close">Expected close date</Label>
              <Input
                id="lead-expected-close"
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lead-company">Company</Label>
            <Select
              value={companyId ?? "none"}
              onValueChange={(value) =>
                setCompanyId(value === "none" ? null : value)
              }
            >
              <SelectTrigger id="lead-company" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lead-contact">Contact</Label>
            <Select
              value={contactId ?? "none"}
              onValueChange={(value) =>
                setContactId(value === "none" ? null : value)
              }
            >
              <SelectTrigger id="lead-contact" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
