import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flame, Snowflake, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { RemindersPanel } from "#/components/views/reminders/RemindersPanel.tsx";
import { TimelineFeed } from "#/components/views/timeline/TimelineFeed.tsx";
import {
  type Activity,
  deleteActivity,
  listActivities,
  logActivity,
} from "#/lib/supabase/activities.ts";
import { type Company, listCompanies } from "#/lib/supabase/companies.ts";
import { type Contact, listContacts } from "#/lib/supabase/contacts.ts";
import {
  convertLead,
  getLead,
  type Lead,
  listSalesReps,
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
import { ReassignOwnerDialog } from "./ReassignOwnerDialog.tsx";

const ACTIVITY_KIND_LABELS: Record<Activity["kind"], string> = {
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};

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
  const [salesReps, setSalesReps] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logKind, setLogKind] = useState<Activity["kind"]>("call");
  const [logBody, setLogBody] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);

  async function refresh() {
    const [
      leadResult,
      companiesResult,
      contactsResult,
      techLeadsResult,
      salesRepsResult,
      timelineResult,
      activitiesResult,
    ] = await Promise.all([
      getLead({ data: { leadId } }),
      listCompanies(),
      listContacts(),
      listTechLeads(),
      listSalesReps(),
      listLeadTimeline({ data: { leadId } }),
      listActivities({ data: { leadId } }),
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
    if (salesRepsResult.success) setSalesReps(salesRepsResult.users);
    if (timelineResult.success) setTimelineEvents(timelineResult.events);
    if (activitiesResult.success) setActivities(activitiesResult.activities);
  }

  async function handleLogActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logBody.trim()) return;
    setLoggingActivity(true);
    const result = await logActivity({
      data: { leadId, kind: logKind, body: logBody.trim() },
    });
    setLoggingActivity(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setLogBody("");
    refresh();
  }

  async function handleDeleteNote(activityId: string) {
    if (!confirm("Delete this note? This can't be undone.")) return;
    const result = await deleteActivity({ data: { activityId } });
    if (!result.success) {
      setError(result.message);
      return;
    }
    refresh();
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
  // Mirrors the activities_insert_deal_access RLS lead branch: the owning
  // Sales Rep, a Sales Manager (oversight), or an Admin.
  const canLogInteraction =
    isAdmin ||
    currentUserRole === "sales_manager" ||
    lead.ownerId === currentUserId;

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
          {isAdmin ? (
            <Button variant="outline" onClick={() => setReassignOpen(true)}>
              Reassign Owner
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
        {currentUserRole === "sales_manager" &&
        lead.status !== "finance_approved" &&
        lead.status !== "converted" ? (
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            Convert to Deal becomes available once this lead is Finance
            Approved.
          </p>
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

      <div className="panel mt-6 grid grid-cols-1 gap-6 rounded-2xl p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Contact
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {lead.contactName ?? "—"}
          </p>
          {lead.contactEmail || lead.contactPhone ? (
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              {[lead.contactEmail, lead.contactPhone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
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

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Indicative budget
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {lead.budget === null ? "—" : lead.budget.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Expected close
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            {lead.expectedCloseDate ?? "—"}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
            Requirements
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">
            {lead.requirements ?? "—"}
          </p>
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
          Client interactions
        </p>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Log the calls and meetings behind this lead — this is the history the
          Tech and Finance reviewers read before deciding.
        </p>

        {canLogInteraction ? (
          <form
            onSubmit={handleLogActivity}
            className="mt-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <Select
                value={logKind}
                onValueChange={(value) => setLogKind(value as Activity["kind"])}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                disabled={loggingActivity || !logBody.trim()}
              >
                Log
              </Button>
            </div>
            <Textarea
              value={logBody}
              onChange={(event) => setLogBody(event.target.value)}
              placeholder="What happened?"
            />
          </form>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {activities.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              No interactions logged yet.
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-[var(--border)] p-4"
              >
                <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
                  <span className="font-medium text-[var(--ink)]">
                    {ACTIVITY_KIND_LABELS[activity.kind]}
                  </span>
                  <span className="flex items-center gap-2">
                    {activity.authorName ?? "—"} ·{" "}
                    {formatRelativeTime(activity.createdAt)}
                    {activity.kind === "note" && canLogInteraction ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(activity.id)}
                        aria-label="Delete note"
                        className="text-[var(--ink-soft)] hover:text-[var(--destructive)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink)]">
                  {activity.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

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

      <ReassignOwnerDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        lead={lead}
        salesReps={salesReps}
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
        activities={activities}
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
