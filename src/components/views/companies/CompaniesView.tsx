import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  type Company,
  createCompany,
  listCompanies,
  updateCompany,
} from "#/lib/supabase/companies.ts";
import { formatRelativeTime } from "#/lib/utils.ts";

interface CompaniesViewProps {
  currentUserId: string;
  isAdmin: boolean;
  canCreate: boolean;
}

export function CompaniesView({
  currentUserId,
  isAdmin,
  canCreate,
}: CompaniesViewProps) {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIndustry, setEditingIndustry] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function refresh() {
    const result = await listCompanies();
    if (result.success) {
      setCompanies(result.companies);
      setError(null);
    } else {
      setError(result.message);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createCompany({
      data: { name: newName.trim(), industry: newIndustry.trim() },
    });
    setCreating(false);
    if (result.success) {
      setNewName("");
      setNewIndustry("");
      refresh();
    } else {
      setError(result.message);
    }
  }

  function startEdit(company: Company) {
    setEditingId(company.id);
    setEditingName(company.name);
    setEditingIndustry(company.industry ?? "");
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) return;
    setSavingEdit(true);
    const result = await updateCompany({
      data: {
        companyId: editingId,
        name: editingName.trim(),
        industry: editingIndustry.trim(),
      },
    });
    setSavingEdit(false);
    if (result.success) {
      setEditingId(null);
      refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <div>
      <div>
        <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          Companies
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
          Client companies your team is working with.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      {canCreate ? (
        <form
          onSubmit={handleCreate}
          className="mt-6 flex max-w-lg items-center gap-2"
        >
          <Input
            placeholder="New company name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Input
            placeholder="Industry (optional)"
            value={newIndustry}
            onChange={(event) => setNewIndustry(event.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            disabled={creating || !newName.trim()}
          >
            Add
          </Button>
        </form>
      ) : null}

      <div className="panel mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Industry</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {companies === null ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  Loading companies&hellip;
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  No companies yet.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">
                    {editingId === company.id ? (
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="h-8 max-w-xs"
                        autoFocus
                      />
                    ) : (
                      company.name
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {editingId === company.id ? (
                      <Input
                        value={editingIndustry}
                        onChange={(event) =>
                          setEditingIndustry(event.target.value)
                        }
                        className="h-8 max-w-xs"
                        placeholder="Industry"
                      />
                    ) : (
                      (company.industry ?? "—")
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {company.ownerName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {formatRelativeTime(company.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {editingId === company.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={savingEdit || !editingName.trim()}
                          onClick={saveEdit}
                        >
                          Save
                        </Button>
                      </div>
                    ) : isAdmin || company.ownerId === currentUserId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(company)}
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
    </div>
  );
}
