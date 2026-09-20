import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { DEAL_STAGE_LABELS, type DealStage } from "#/lib/supabase/deals.ts";
import { getReports, type ReportSummary } from "#/lib/supabase/reports.ts";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 90);
  return { from: isoDay(from), to: isoDay(to) };
}

const money = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}

function Stat({ label, value, hint, tone = "default" }: StatProps) {
  const color =
    tone === "good"
      ? "text-[var(--ink)]"
      : tone === "bad"
        ? "text-[var(--destructive)]"
        : "text-[var(--ink)]";
  return (
    <div className="panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--ink-soft)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** US-25: conversion rate, lost rate and budget totals over a period. */
export function ReportsView() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextFrom: string, nextTo: string) {
    setLoading(true);
    const result = await getReports({ data: { from: nextFrom, to: nextTo } });
    setLoading(false);
    if (result.success) {
      setReport(result.report);
      setError(null);
    } else {
      setError(result.message);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    load(initial.from, initial.to);
  }, []);

  return (
    <div>
      <div>
        <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
          Reports
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
          Conversion, lost rate and budget totals for a period you choose.
        </p>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(from, to);
        }}
      >
        <div>
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Apply"}
        </Button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Conversion rate"
              value={`${report.conversionRate}%`}
              hint={`${report.leadsConverted} of ${report.leadsCreated} leads converted`}
            />
            <Stat
              label="Lost rate"
              value={`${report.lostRate}%`}
              tone={report.lostRate > 50 ? "bad" : "default"}
              hint={`${report.dealsLost} of ${report.dealsClosed} closed deals lost`}
            />
            <Stat
              label="Won budget"
              value={money(report.wonBudget)}
              hint={`${report.dealsWon} deals won`}
            />
            <Stat
              label="Lost budget"
              value={money(report.lostBudget)}
              hint={`${report.dealsLost} deals lost`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Leads created" value={String(report.leadsCreated)} />
            <Stat label="Leads rejected" value={String(report.leadsRejected)} />
            <Stat
              label="Open pipeline value"
              value={money(report.openBudget)}
              hint="All open deals, not period-bound"
            />
            <Stat label="Deals closed" value={String(report.dealsClosed)} />
          </div>

          <div className="panel mt-6 rounded-2xl p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
              Open pipeline by stage
            </p>
            {report.stageTotals.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                No open deals.
              </p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
                    <th className="py-2 font-medium">Stage</th>
                    <th className="py-2 font-medium">Deals</th>
                    <th className="py-2 font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stageTotals.map((row) => (
                    <tr
                      key={row.stage}
                      className="border-b border-[var(--line)] last:border-0"
                    >
                      <td className="py-2 text-[var(--ink)]">
                        {DEAL_STAGE_LABELS[row.stage as DealStage] ?? row.stage}
                      </td>
                      <td className="py-2 text-[var(--ink-soft)]">
                        {row.count}
                      </td>
                      <td className="py-2 text-[var(--ink-soft)]">
                        {money(row.budget)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
