import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
import {
  type Activity,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type Deal,
  type DealStage,
  getDeal,
  listActivities,
  logActivity,
  moveDealStage,
} from "#/lib/supabase/deals.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { DealEditDialog } from "./DealEditDialog.tsx";
import { DealStageStepper } from "./DealStageStepper.tsx";

interface DealDetailViewProps {
  workspaceId: string;
  dealId: string;
  currentUserId: string;
  isAdmin: boolean;
}

const ACTIVITY_KIND_LABELS: Record<Activity["kind"], string> = {
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};

export function DealDetailView({
  workspaceId,
  dealId,
  currentUserId,
  isAdmin,
}: DealDetailViewProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "activity">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [logKind, setLogKind] = useState<Activity["kind"]>("call");
  const [logBody, setLogBody] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);

  async function refresh() {
    const [dealResult, activitiesResult] = await Promise.all([
      getDeal({ data: { dealId } }),
      listActivities({ data: { dealId } }),
    ]);

    if (dealResult.success) {
      setDeal(dealResult.deal);
      setError(null);
    } else {
      setError(dealResult.message);
    }
    if (activitiesResult.success) setActivities(activitiesResult.activities);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount + dealId change
  useEffect(() => {
    refresh();
  }, [dealId]);

  async function handleStageChange(stage: DealStage) {
    setMovingStage(true);
    const result = await moveDealStage({ data: { dealId, stage } });
    setMovingStage(false);
    if (result.success) refresh();
    else setError(result.message);
  }

  async function handleLogActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logBody.trim()) return;
    setLoggingActivity(true);
    const result = await logActivity({
      data: { dealId, kind: logKind, body: logBody.trim() },
    });
    setLoggingActivity(false);
    if (result.success) {
      setLogBody("");
      refresh();
    } else {
      setError(result.message);
    }
  }

  if (!deal) {
    return (
      <div>
        <Link
          to="/workspace/$workspaceId/deals"
          params={{ workspaceId }}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Deals
        </Link>
        <p className="mt-6 text-sm text-[var(--ink-soft)]">
          {error ?? "Loading deal…"}
        </p>
      </div>
    );
  }

  const canEdit = isAdmin || deal.ownerId === currentUserId;

  return (
    <div>
      <Link
        to="/workspace/$workspaceId/deals"
        params={{ workspaceId }}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            {deal.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {deal.companyName ?? "No company"} · Owned by{" "}
            {deal.ownerName ?? "—"}
          </p>
        </div>

        {canEdit ? (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DealStageStepper stage={deal.stage} status={deal.status} />

        {canEdit && deal.status === "open" ? (
          <Select
            value={deal.stage}
            onValueChange={(value) => handleStageChange(value as DealStage)}
          >
            <SelectTrigger className="w-44" disabled={movingStage}>
              <SelectValue placeholder="Move stage" />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DEAL_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="mt-6 flex gap-1 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={
            "px-3 py-2 text-sm font-medium " +
            (tab === "overview"
              ? "border-b-2 border-[var(--primary)] text-[var(--ink)]"
              : "text-[var(--ink-soft)]")
          }
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={
            "px-3 py-2 text-sm font-medium " +
            (tab === "activity"
              ? "border-b-2 border-[var(--primary)] text-[var(--ink)]"
              : "text-[var(--ink-soft)]")
          }
        >
          Activity
        </button>
      </div>

      {tab === "overview" ? (
        <div className="panel mt-6 grid grid-cols-1 gap-6 rounded-2xl p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Contact
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {deal.contactName ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Budget
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {deal.budget != null ? deal.budget.toLocaleString() : "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Deadline
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {deal.deadline ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Created
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {formatRelativeTime(deal.createdAt)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Requirements
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">
              {deal.requirements ?? "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <form
            onSubmit={handleLogActivity}
            className="panel flex flex-col gap-3 rounded-2xl p-4"
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
              <Button type="submit" size="sm" disabled={loggingActivity || !logBody.trim()}>
                Log
              </Button>
            </div>
            <Textarea
              value={logBody}
              onChange={(event) => setLogBody(event.target.value)}
              placeholder="What happened?"
            />
          </form>

          <div className="mt-4 flex flex-col gap-3">
            {activities.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">
                No interactions logged yet.
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="panel rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
                    <span className="font-medium text-[var(--ink)]">
                      {ACTIVITY_KIND_LABELS[activity.kind]}
                    </span>
                    <span>
                      {activity.authorName ?? "—"} ·{" "}
                      {formatRelativeTime(activity.createdAt)}
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
      )}

      <DealEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        deal={deal}
        onSaved={refresh}
      />
    </div>
  );
}
