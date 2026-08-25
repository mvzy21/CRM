import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flame, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { RemindersPanel } from "#/components/views/reminders/RemindersPanel.tsx";
import { TimelineFeed } from "#/components/views/timeline/TimelineFeed.tsx";
import { type Company, listCompanies } from "#/lib/supabase/companies.ts";
import { type Contact, listContacts } from "#/lib/supabase/contacts.ts";
import {
  convertLead,
  getLead,
  type Lead,
  listTechLeads,
  reverseLeadStatus,
  reviewFinancialViability,
  reviewTechnicalFeasibility,
  tagLeadTemperature,
  type UserOption,
} from "#/lib/supabase/leads.ts";
import type { AppRole } from "#/lib/supabase/roles.ts";
import {
  listLeadTimeline,
  type TimelineEvent,
} from "#/lib/supabase/timeline.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { EscalateDialog } from "./EscalateDialog.tsx";
import { LeadDialog } from "./LeadDialog.tsx";
import { LeadReviewDialog } from "./LeadReviewDialog.tsx";
import { LeadStatusStepper } from "./LeadStatusStepper.tsx";
import { MarkColdDialog } from "./MarkColdDialog.tsx";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  escalated: "Escalated",
  tech_approved: "Tech Approved",
  finance_approved: "Finance Approved",
  rejected: "Rejected",
  converted: "Converted",
};

interface LeadDetailViewProps {
  workspaceId: string;
  leadId: string;
  currentUserId: string;
  currentUserRole: AppRole;
  isAdmin: boolean;
}

export function LeadDetailView({
  workspaceId,
  leadId,
  currentUserId,
  currentUserRole,
  isAdmin,
}: LeadDetailViewProps) {
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [techLeads, setTechLeads] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [reviewKind, setReviewKind] = useState<
    "technical" | "financial" | null
  >(null);
  const [taggingTemp, setTaggingTemp] = useState(false);
  const [markColdOpen, setMarkColdOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(
    null,
  );

  async function refresh() {
    const [
      leadResult,
      companiesResult,
      contactsResult,
      techLeadsResult,
      timelineResult,
    ] = await Promise.all([
      getLead({ data: { leadId } }),
      listCompanies(),
      listContacts(),
      listTechLeads(),
      listLeadTimeline({ data: { leadId } }),
    ]);

    if (leadResult.success) {
      setLead(leadResult.lead);
      setError(null);
    } else {
      setError(leadResult.message);
    }
    if (companiesResult.success) setCompanies(companiesResult.companies);
    if (contactsResult.success) setContacts(contactsResult.contacts);
    if (techLeadsResult.success) setTechLeads(techLeadsResult.users);
    if (timelineResult.success) setTimelineEvents(timelineResult.events);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount + leadId change
  useEffect(() => {
    refresh();
  }, [leadId]);

  async function handleTag(temperature: "hot" | "cold") {
    if (!lead) return;
    setTaggingTemp(true);
    const next = lead.temperature === temperature ? null : temperature;
    const result = await tagLeadTemperature({
      data: { leadId, temperature: next },
    });
    setTaggingTemp(false);
    if (result.success) refresh();
    else setError(result.message);
  }

  async function handleConvert() {
    setConverting(true);
    const result = await convertLead({ data: { leadId } });
    setConverting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate({
      to: "/workspace/$workspaceId/deals/$dealId",
      params: { workspaceId, dealId: result.dealId },
    });
  }

  async function handleReverse() {
    if (!confirm("Reverse this lead back one step in the approval workflow?")) {
      return;
    }
    setReversing(true);
    const result = await reverseLeadStatus({ data: { leadId } });
    setReversing(false);
    if (result.success) refresh();
    else setError(result.message);
  }

  if (!lead) {
    return (
      <div>
        <Link
          to="/workspace/$workspaceId/leads"
          params={{ workspaceId }}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
        <p className="mt-6 text-sm text-[var(--ink-soft)]">
          {error ?? "Loading lead…"}
        </p>
      </div>
    );
  }

  const canEdit = isAdmin || lead.ownerId === currentUserId;
  const canEscalate =
    currentUserRole === "sales_manager" &&
    lead.status === "new" &&
    lead.temperature === "hot";
  const canMarkCold =
    currentUserRole === "sales_manager" && lead.status === "rejected";
  const canReviewTech =
    currentUserRole === "tech_lead" &&
    lead.status === "escalated" &&
    lead.techLeadId === currentUserId;
  const canReviewFinance =
    currentUserRole === "finance_lead" && lead.status === "tech_approved";
  const canConvert =
    currentUserRole === "sales_manager" && lead.status === "finance_approved";
  const canReverse =
    isAdmin && lead.status !== "new" && lead.status !== "converted";

  return (
    <div>
      <Link
        to="/workspace/$workspaceId/leads"
        params={{ workspaceId }}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            {lead.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {lead.companyName ?? "No company"} · Owned by{" "}
            {lead.ownerName ?? "—"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          ) : null}
          {canEscalate ? (
            <Button onClick={() => setEscalateOpen(true)}>Escalate</Button>
          ) : null}
          {canMarkCold ? (
            <Button onClick={() => setMarkColdOpen(true)}>Mark Cold</Button>
          ) : null}
          {canReviewTech ? (
            <Button onClick={() => setReviewKind("technical")}>Review</Button>
          ) : null}
          {canReviewFinance ? (
            <Button onClick={() => setReviewKind("financial")}>Review</Button>
          ) : null}
          {canConvert ? (
            <Button disabled={converting} onClick={handleConvert}>
              {converting ? "Converting..." : "Convert to Deal"}
            </Button>
          ) : null}
          {canReverse ? (
            <Button
              variant="outline"
              disabled={reversing}
              onClick={handleReverse}
            >
              {reversing ? "Reversing..." : "Reverse Step"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <LeadStatusStepper status={lead.status} />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      <div className="panel mt-6 grid grid-cols-1 gap-6 rounded-2xl p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Contact
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {lead.contactName ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Temperature
          </p>
          <div className="mt-1.5">
            {lead.ownerId === currentUserId ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={lead.temperature === "hot" ? "default" : "outline"}
                  disabled={taggingTemp}
                  onClick={() => handleTag("hot")}
                >
                  <Flame className="h-3.5 w-3.5" /> Hot
                </Button>
                <Button
                  size="sm"
                  variant={lead.temperature === "cold" ? "default" : "outline"}
                  disabled={taggingTemp}
                  onClick={() => handleTag("cold")}
                >
                  <Snowflake className="h-3.5 w-3.5" /> Cold
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink)]">
                {lead.temperature === "hot"
                  ? "Hot"
                  : lead.temperature === "cold"
                    ? "Cold"
                    : "—"}
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">
            {lead.description ?? "—"}
          </p>
        </div>

        {lead.techLeadName ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Technical Review
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {lead.techLeadName}
              {lead.techDecision ? ` · ${lead.techDecision}` : ""}
            </p>
            {lead.techNotes ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {lead.techNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        {lead.financeLeadName ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Financial Review
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {lead.financeLeadName}
              {lead.financeDecision ? ` · ${lead.financeDecision}` : ""}
            </p>
            {lead.financeNotes ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {lead.financeNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="sm:col-span-2 text-xs text-[var(--ink-soft)]">
          Status: {STATUS_LABELS[lead.status] ?? lead.status} · Created{" "}
          {formatRelativeTime(lead.createdAt)}
        </div>
      </div>

      <RemindersPanel leadId={leadId} />

      <div className="panel mt-6 rounded-2xl p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
          Timeline
        </p>
        <div className="mt-4">
          <TimelineFeed events={timelineEvents} />
        </div>
      </div>

      <LeadDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companies={companies}
        contacts={contacts}
        editingLead={lead}
        onSaved={refresh}
      />

      <EscalateDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        lead={lead}
        techLeads={techLeads}
        onSaved={refresh}
      />

      <LeadReviewDialog
        open={reviewKind !== null}
        onOpenChange={(open) => {
          if (!open) setReviewKind(null);
        }}
        lead={lead}
        kind={reviewKind ?? "technical"}
        onSubmit={(id, decision, notes) =>
          reviewKind === "technical"
            ? reviewTechnicalFeasibility({
                data: { leadId: id, decision, notes },
              })
            : reviewFinancialViability({
                data: { leadId: id, decision, notes },
              })
        }
        onSaved={refresh}
      />

      <MarkColdDialog
        open={markColdOpen}
        onOpenChange={setMarkColdOpen}
        lead={lead}
        onSaved={refresh}
      />
    </div>
  );
}
