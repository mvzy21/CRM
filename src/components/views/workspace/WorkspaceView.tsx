import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DealsPipelineChart } from "#/components/views/deals/DealsPipelineChart.tsx";
import { DEAL_STAGE_LABELS } from "#/lib/supabase/deals.ts";
import {
  type WorkspaceOverview,
  getWorkspaceOverview,
} from "#/lib/supabase/overview.ts";
import { formatRelativeTime } from "#/lib/utils.ts";

interface WorkspaceViewProps {
  workspaceId: string;
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  escalated: "Escalated",
  tech_approved: "Tech Approved",
  finance_approved: "Finance Approved",
  rejected: "Rejected",
  converted: "Converted",
};

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);

  useEffect(() => {
    getWorkspaceOverview().then((r) => r.success && setOverview(r.overview));
  }, []);

  const stats = [
    { label: "Companies", value: overview?.companies ?? null },
    { label: "Contacts", value: overview?.contacts ?? null },
    { label: "Open Leads", value: overview?.openLeads ?? null },
    { label: "Open Deals", value: overview?.openDeals ?? null },
  ];

  return (
    <div>
      <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        Welcome to your workspace
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
        A quick overview of everything moving through the pipeline.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="feature-card rounded-2xl border border-[var(--line)] p-6"
          >
            <p className="text-2xl font-bold text-[var(--ink)]">
              {stat.value ?? "—"}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {overview && overview.pipeline.length > 0 ? (
        <DealsPipelineChart deals={overview.pipeline} />
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            My Reminders
          </h2>
          {overview === null ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : overview.reminders.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Nothing scheduled.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {overview.reminders.map((reminder) => (
                <li key={reminder.id} className="py-2.5">
                  {reminder.leadId ? (
                    <Link
                      to="/workspace/$workspaceId/leads/$leadId"
                      params={{ workspaceId, leadId: reminder.leadId }}
                      className="text-sm font-medium text-[var(--ink)] hover:underline"
                    >
                      {reminder.message}
                    </Link>
                  ) : reminder.dealId ? (
                    <Link
                      to="/workspace/$workspaceId/deals/$dealId"
                      params={{ workspaceId, dealId: reminder.dealId }}
                      className="text-sm font-medium text-[var(--ink)] hover:underline"
                    >
                      {reminder.message}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-[var(--ink)]">
                      {reminder.message}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    {formatRelativeTime(reminder.remindAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Recent Leads
          </h2>
          {overview === null ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : overview.recentLeads.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">No leads yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {overview.recentLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <Link
                    to="/workspace/$workspaceId/leads/$leadId"
                    params={{ workspaceId, leadId: lead.id }}
                    className="text-sm font-medium text-[var(--ink)] hover:underline"
                  >
                    {lead.title}
                  </Link>
                  <span className="text-xs text-[var(--ink-soft)]">
                    {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Recent Deals
          </h2>
          {overview === null ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : overview.recentDeals.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No deals yet — convert a finance-approved lead to create one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {overview.recentDeals.map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <Link
                    to="/workspace/$workspaceId/deals/$dealId"
                    params={{ workspaceId, dealId: deal.id }}
                    className="text-sm font-medium text-[var(--ink)] hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <span className="text-xs text-[var(--ink-soft)]">
                    {DEAL_STAGE_LABELS[deal.stage]} ·{" "}
                    {formatRelativeTime(deal.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
