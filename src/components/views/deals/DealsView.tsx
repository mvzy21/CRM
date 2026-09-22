import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "#/components/ui/input.tsx";
import { ExportButton } from "#/components/views/data-transfer/ExportButton.tsx";
import {
  DEAL_STAGE_LABELS,
  type Deal,
  listDeals,
} from "#/lib/supabase/deals.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { DealsPipelineChart } from "./DealsPipelineChart.tsx";

interface DealsViewProps {
  workspaceId: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  won: "Won",
  lost: "Lost",
};

export function DealsView({ workspaceId }: DealsViewProps) {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const filteredDeals = useMemo(() => {
    if (!deals) return deals;
    const term = filterText.trim().toLowerCase();
    if (!term) return deals;
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(term) ||
        (d.companyName ?? "").toLowerCase().includes(term) ||
        (d.ownerName ?? "").toLowerCase().includes(term) ||
        DEAL_STAGE_LABELS[d.stage].toLowerCase().includes(term) ||
        (STATUS_LABELS[d.status] ?? d.status).toLowerCase().includes(term),
    );
  }, [deals, filterText]);

  useEffect(() => {
    listDeals().then((result) => {
      if (result.success) {
        setDeals(result.deals);
      } else {
        setError(result.message);
      }
    });
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Deals
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
            Deals are created by converting a finance-approved lead. Click a
            deal to view details and move it through the pipeline.
          </p>
        </div>
        <ExportButton entity="deals" onError={setError} />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      {deals && deals.length > 0 ? <DealsPipelineChart deals={deals} /> : null}

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-soft)]" />
        <Input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter by title, company, owner, stage or status…"
          className="pl-9"
          aria-label="Filter deals"
        />
      </div>

      <div className="panel mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
              <th className="px-5 py-3 font-medium">Deal</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Stage</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals === null ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  Loading deals&hellip;
                </td>
              </tr>
            ) : filteredDeals.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  {filterText.trim()
                    ? "No deals match your filter."
                    : "No deals yet -- convert a finance-approved lead to create one."}
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">
                    <Link
                      to="/workspace/$workspaceId/deals/$dealId"
                      params={{ workspaceId, dealId: deal.id }}
                      className="hover:underline"
                    >
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {deal.companyName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {deal.ownerName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {DEAL_STAGE_LABELS[deal.stage]}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {STATUS_LABELS[deal.status] ?? deal.status}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {formatRelativeTime(deal.createdAt)}
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
