import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { DEAL_STAGE_LABELS } from "#/lib/supabase/deals.ts";
import {
  getTeamPipeline,
  STALE_AFTER_DAYS,
  type TeamPipeline,
} from "#/lib/supabase/pipeline.ts";

interface TeamPipelineViewProps {
  workspaceId: string;
}

const money = (value: number) =>
  value === 0
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: 0 });

/** US-24: team deals grouped by stage, with stale deals flagged. */
export function TeamPipelineView({ workspaceId }: TeamPipelineViewProps) {
  const [pipeline, setPipeline] = useState<TeamPipeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeamPipeline().then((result) => {
      if (result.success) {
        setPipeline(result.pipeline);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }, []);

  return (
    <div>
      <div>
        <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          Team Pipeline
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
          Every open deal your team owns, grouped by stage. Anything with no
          logged interaction for {STALE_AFTER_DAYS} days is flagged as stale.
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

      {pipeline ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              Open deals
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--ink)]">
              {pipeline.totalOpen}
            </p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              Stale
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                pipeline.staleCount > 0
                  ? "text-[var(--destructive)]"
                  : "text-[var(--ink)]"
              }`}
            >
              {pipeline.staleCount}
            </p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              Team members
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--ink)]">
              {pipeline.teamSize > 0 ? pipeline.teamSize : "All"}
            </p>
          </div>
        </div>
      ) : null}

      {pipeline === null && !error ? (
        <p className="mt-6 text-sm text-[var(--ink-soft)]">
          Loading pipeline&hellip;
        </p>
      ) : null}

      {pipeline ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {pipeline.stages.map((group) => (
            <div key={group.stage} className="panel rounded-2xl p-4">
              <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-3">
                <p className="font-medium text-[var(--ink)]">
                  {DEAL_STAGE_LABELS[group.stage]}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {group.deals.length} · {money(group.totalBudget)}
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {group.deals.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--ink-soft)]">
                    No open deals.
                  </p>
                ) : (
                  group.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      to="/workspace/$workspaceId/deals/$dealId"
                      params={{ workspaceId, dealId: deal.id }}
                      className={`rounded-xl border p-3 transition-colors hover:border-[var(--ink-soft)] ${
                        deal.isStale
                          ? "border-[var(--destructive)]/40 bg-[var(--destructive)]/5"
                          : "border-[var(--line)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {deal.title}
                        </p>
                        {deal.isStale ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--destructive)]"
                            title={`No interaction logged for ${deal.daysSinceActivity} days`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Stale
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        {deal.ownerName ?? "Unassigned"} ·{" "}
                        {deal.budget === null
                          ? "No budget"
                          : money(deal.budget)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                        {deal.lastActivityAt
                          ? `Last interaction ${deal.daysSinceActivity}d ago`
                          : `No interaction logged · opened ${deal.daysSinceActivity}d ago`}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
