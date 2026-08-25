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
import type { Company } from "#/lib/supabase/companies.ts";
import {
  type Contact,
  createContact,
  updateContact,
} from "#/lib/supabase/contacts.ts";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  editingContact: Contact | null;
  onSaved: () => void;
}

export function ContactDialog({
  open,
  onOpenChange,
  companies,
  editingContact,
  onSaved,
}: ContactDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingContact?.name ?? "");
    setEmail(editingContact?.email ?? "");
    setPhone(editingContact?.phone ?? "");
    setCompanyId(editingContact?.companyId ?? null);
    setError(null);
  }, [open, editingContact]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = editingContact
      ? await updateContact({
          data: { contactId: editingContact.id, name, email, phone, companyId },
        })
      : await createContact({ data: { name, email, phone, companyId } });

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
          <DialogTitle>
            {editingContact ? "Edit contact" : "Add a contact"}
          </DialogTitle>
          <DialogDescription>
            Contacts are linked to a company so you can find everyone tied to an
            account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-company">Company</Label>
            <Select
              value={companyId ?? "none"}
              onValueChange={(value) =>
                setCompanyId(value === "none" ? null : value)
              }
            >
              <SelectTrigger id="contact-company" className="mt-1.5 w-full">
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
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
