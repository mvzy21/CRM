import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DealsPipelineChart } from "#/components/views/deals/DealsPipelineChart.tsx";
import { type Company, listCompanies } from "#/lib/supabase/companies.ts";
import { type Contact, listContacts } from "#/lib/supabase/contacts.ts";
import { DEAL_STAGE_LABELS, type Deal, listDeals } from "#/lib/supabase/deals.ts";
import { type Lead, listLeads } from "#/lib/supabase/leads.ts";
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

const OPEN_LEAD_STATUSES = new Set([
  "new",
  "escalated",
  "tech_approved",
  "finance_approved",
]);

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [deals, setDeals] = useState<Deal[] | null>(null);

  useEffect(() => {
    listCompanies().then((r) => r.success && setCompanies(r.companies));
    listContacts().then((r) => r.success && setContacts(r.contacts));
    listLeads().then((r) => r.success && setLeads(r.leads));
    listDeals().then((r) => r.success && setDeals(r.deals));
  }, []);

  const openLeads = leads?.filter((l) => OPEN_LEAD_STATUSES.has(l.status)) ?? [];
  const openDeals = deals?.filter((d) => d.status === "open") ?? [];

  const stats = [
    { label: "Companies", value: companies?.length ?? null },
    { label: "Contacts", value: contacts?.length ?? null },
    { label: "Open Leads", value: leads ? openLeads.length : null },
    { label: "Open Deals", value: deals ? openDeals.length : null },
  ];

  const recentLeads = leads?.slice(0, 5) ?? [];
  const recentDeals = deals?.slice(0, 5) ?? [];

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

      {deals && deals.length > 0 ? <DealsPipelineChart deals={deals} /> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Recent Leads
          </h2>
          {leads === null ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : recentLeads.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">No leads yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-2.5">
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
          {deals === null ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : recentDeals.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No deals yet — convert a finance-approved lead to create one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {recentDeals.map((deal) => (
                <li key={deal.id} className="flex items-center justify-between py-2.5">
                  <Link
                    to="/workspace/$workspaceId/deals/$dealId"
                    params={{ workspaceId, dealId: deal.id }}
                    className="text-sm font-medium text-[var(--ink)] hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <span className="text-xs text-[var(--ink-soft)]">
                    {DEAL_STAGE_LABELS[deal.stage]} · {formatRelativeTime(deal.createdAt)}
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
