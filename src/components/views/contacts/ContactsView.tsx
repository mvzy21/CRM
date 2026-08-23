import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { type Company, listCompanies } from "#/lib/supabase/companies.ts";
import { type Contact, listContacts } from "#/lib/supabase/contacts.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { ContactDialog } from "./ContactDialog.tsx";

interface ContactsViewProps {
  currentUserId: string;
  isAdmin: boolean;
  canCreate: boolean;
}

export function ContactsView({
  currentUserId,
  isAdmin,
  canCreate,
}: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  async function refresh() {
    const [contactsResult, companiesResult] = await Promise.all([
      listContacts(),
      listCompanies(),
    ]);

    if (contactsResult.success) {
      setContacts(contactsResult.contacts);
      setError(null);
    } else {
      setError(contactsResult.message);
    }

    if (companiesResult.success) setCompanies(companiesResult.companies);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Contacts
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
            Everyone you work with, linked to the company they belong to.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      <div className="panel mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {contacts === null ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  Loading contacts&hellip;
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  No contacts yet.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">
                    {contact.name}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {contact.companyName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {contact.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {contact.phone ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {formatRelativeTime(contact.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isAdmin || contact.ownerId === currentUserId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(contact)}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companies={companies}
        editingContact={editingContact}
        onSaved={refresh}
      />
    </div>
  );
}
