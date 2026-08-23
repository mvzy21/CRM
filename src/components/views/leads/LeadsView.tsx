import { Flame, Plus, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { type Company, listCompanies } from "#/lib/supabase/companies.ts";
import { type Contact, listContacts } from "#/lib/supabase/contacts.ts";
import {
  type Lead,
  type UserOption,
  listLeads,
  listTechLeads,
  markLeadCold,
  reviewFinancialViability,
  reviewTechnicalFeasibility,
  tagLeadTemperature,
} from "#/lib/supabase/leads.ts";
import type { AppRole } from "#/lib/supabase/roles.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { EscalateDialog } from "./EscalateDialog.tsx";
import { LeadDialog } from "./LeadDialog.tsx";
import { LeadReviewDialog } from "./LeadReviewDialog.tsx";

interface LeadsViewProps {
  currentUserId: string;
  currentUserRole: AppRole;
  isAdmin: boolean;
  canCreate: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  escalated: "Escalated",
  tech_approved: "Tech Approved",
  finance_approved: "Finance Approved",
  rejected: "Rejected",
  converted: "Converted",
};

export function LeadsView({
  currentUserId,
  currentUserRole,
  isAdmin,
  canCreate,
}: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [techLeads, setTechLeads] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<Lead | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    lead: Lead;
    kind: "technical" | "financial";
  } | null>(null);
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [markingColdId, setMarkingColdId] = useState<string | null>(null);

  async function refresh() {
    const [leadsResult, companiesResult, contactsResult, techLeadsResult] =
      await Promise.all([
        listLeads(),
        listCompanies(),
        listContacts(),
        listTechLeads(),
      ]);

    if (leadsResult.success) {
      setLeads(leadsResult.leads);
      setError(null);
    } else {
      setError(leadsResult.message);
    }

    if (companiesResult.success) setCompanies(companiesResult.companies);
    if (contactsResult.success) setContacts(contactsResult.contacts);
    if (techLeadsResult.success) setTechLeads(techLeadsResult.users);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditingLead(null);
    setDialogOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setDialogOpen(true);
  }

  async function handleTag(lead: Lead, temperature: "hot" | "cold") {
    setTaggingId(lead.id);
    const nextTemperature = lead.temperature === temperature ? null : temperature;
    const result = await tagLeadTemperature({
      data: { leadId: lead.id, temperature: nextTemperature },
    });
    setTaggingId(null);
    if (result.success) {
      refresh();
    } else {
      setError(result.message);
    }
  }

  async function handleMarkCold(lead: Lead) {
    setMarkingColdId(lead.id);
    const result = await markLeadCold({ data: { leadId: lead.id } });
    setMarkingColdId(null);
    if (result.success) {
      refresh();
    } else {
      setError(result.message);
    }
  }

  function renderApprovalAction(lead: Lead) {
    if (
      currentUserRole === "sales_manager" &&
      lead.status === "new" &&
      lead.temperature === "hot"
    ) {
      return (
        <Button size="sm" variant="outline" onClick={() => setEscalateTarget(lead)}>
          Escalate
        </Button>
      );
    }

    if (currentUserRole === "sales_manager" && lead.status === "rejected") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={markingColdId === lead.id}
          onClick={() => handleMarkCold(lead)}
        >
          Mark Cold
        </Button>
      );
    }

    if (
      currentUserRole === "tech_lead" &&
      lead.status === "escalated" &&
      lead.techLeadId === currentUserId
    ) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setReviewTarget({ lead, kind: "technical" })}
        >
          Review
        </Button>
      );
    }

    if (currentUserRole === "finance_lead" && lead.status === "tech_approved") {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setReviewTarget({ lead, kind: "financial" })}
        >
          Review
        </Button>
      );
    }

    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Leads
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
            Everyone can view leads across the org; approval actions are
            scoped to the role responsible for that step.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add lead
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
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Temperature</th>
              <th className="px-5 py-3 font-medium">Approval</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {leads === null ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  Loading leads&hellip;
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  No leads yet.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">
                    {lead.title}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {lead.companyName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {lead.ownerName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {STATUS_LABELS[lead.status] ?? lead.status}
                    {lead.status === "rejected" ? (
                      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                        {lead.techDecision === "rejected"
                          ? `Tech: ${lead.techNotes || "no notes"}`
                          : lead.financeDecision === "rejected"
                            ? `Finance: ${lead.financeNotes || "no notes"}`
                            : null}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">
                    {lead.ownerId === currentUserId ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={lead.temperature === "hot" ? "default" : "outline"}
                          disabled={taggingId === lead.id}
                          onClick={() => handleTag(lead, "hot")}
                          aria-label="Tag hot"
                        >
                          <Flame className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={lead.temperature === "cold" ? "default" : "outline"}
                          disabled={taggingId === lead.id}
                          onClick={() => handleTag(lead, "cold")}
                          aria-label="Tag cold"
                        >
                          <Snowflake className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : lead.temperature === "hot" ? (
                      <span className="inline-flex items-center gap-1 text-[var(--ink-soft)]">
                        <Flame className="h-3.5 w-3.5" /> Hot
                      </span>
                    ) : lead.temperature === "cold" ? (
                      <span className="inline-flex items-center gap-1 text-[var(--ink-soft)]">
                        <Snowflake className="h-3.5 w-3.5" /> Cold
                      </span>
                    ) : (
                      <span className="text-[var(--ink-soft)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{renderApprovalAction(lead)}</td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {formatRelativeTime(lead.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isAdmin || lead.ownerId === currentUserId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(lead)}
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

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companies={companies}
        contacts={contacts}
        editingLead={editingLead}
        onSaved={refresh}
      />

      <EscalateDialog
        open={escalateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEscalateTarget(null);
        }}
        lead={escalateTarget}
        techLeads={techLeads}
        onSaved={refresh}
      />

      <LeadReviewDialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        lead={reviewTarget?.lead ?? null}
        kind={reviewTarget?.kind ?? "technical"}
        onSubmit={(leadId, decision, notes) =>
          reviewTarget?.kind === "technical"
            ? reviewTechnicalFeasibility({ data: { leadId, decision, notes } })
            : reviewFinancialViability({ data: { leadId, decision, notes } })
        }
        onSaved={refresh}
      />
    </div>
  );
}
