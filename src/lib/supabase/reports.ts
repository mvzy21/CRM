import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireRole } from "./access.ts";

// US-25: conversion rate, lost rate and budget totals over a selected
// period. The story's actor is "Leadership", which maps onto the existing
// Sales Manager role (plus Admin) rather than introducing a sixth role for
// one read-only screen.

export interface ReportSummary {
  from: string;
  to: string;
  leadsCreated: number;
  leadsConverted: number;
  leadsRejected: number;
  /** Converted / created, as a percentage of leads raised in the period. */
  conversionRate: number;
  dealsClosed: number;
  dealsWon: number;
  dealsLost: number;
  /** Lost / closed, as a percentage of deals that reached a decision. */
  lostRate: number;
  wonBudget: number;
  lostBudget: number;
  openBudget: number;
  stageTotals: { stage: string; count: number; budget: number }[];
}

const reportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
});

export const getReports = createServerFn({ method: "GET" })
  .validator(reportSchema)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; report: ReportSummary }
      | { success: false; message: string }
    > => {
      const check = await requireRole(["sales_manager", "admin"]);
      if (!check.ok) return { success: false, message: check.message };

      if (data.from > data.to) {
        return {
          success: false,
          message: "The start date must be on or before the end date.",
        };
      }

      // `to` is an inclusive calendar day, so the upper bound is the start
      // of the following day -- otherwise everything logged after midnight
      // on the last day falls outside the range.
      const fromIso = `${data.from}T00:00:00.000Z`;
      const toExclusive = new Date(`${data.to}T00:00:00.000Z`);
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      const toIso = toExclusive.toISOString();

      const [leadsResult, closedResult, openResult] = await Promise.all([
        check.supabase
          .from("leads")
          .select("status")
          .gte("created_at", fromIso)
          .lt("created_at", toIso),
        // Closed deals are counted by when they closed, not when they were
        // created -- a deal won this quarter belongs in this quarter's
        // numbers even if it was opened before it.
        check.supabase
          .from("deals")
          .select("status, budget")
          .in("status", ["won", "lost"])
          .gte("closed_at", fromIso)
          .lt("closed_at", toIso),
        check.supabase
          .from("deals")
          .select("stage, budget")
          .eq("status", "open"),
      ]);

      if (leadsResult.error || closedResult.error || openResult.error) {
        return { success: false, message: "Failed to build the report." };
      }

      const leads = leadsResult.data ?? [];
      const leadsCreated = leads.length;
      const leadsConverted = leads.filter(
        (l) => l.status === "converted",
      ).length;
      const leadsRejected = leads.filter((l) => l.status === "rejected").length;

      const closed = closedResult.data ?? [];
      const won = closed.filter((d) => d.status === "won");
      const lost = closed.filter((d) => d.status === "lost");
      const sumBudget = (rows: { budget: number | null }[]) =>
        rows.reduce((total, row) => total + (row.budget ?? 0), 0);

      const open = openResult.data ?? [];
      const byStage = new Map<string, { count: number; budget: number }>();
      for (const deal of open) {
        const stage = deal.stage as string;
        const entry = byStage.get(stage) ?? { count: 0, budget: 0 };
        entry.count += 1;
        entry.budget += deal.budget ?? 0;
        byStage.set(stage, entry);
      }

      const rate = (numerator: number, denominator: number) =>
        denominator === 0
          ? 0
          : Math.round((numerator / denominator) * 1000) / 10;

      return {
        success: true,
        report: {
          from: data.from,
          to: data.to,
          leadsCreated,
          leadsConverted,
          leadsRejected,
          conversionRate: rate(leadsConverted, leadsCreated),
          dealsClosed: closed.length,
          dealsWon: won.length,
          dealsLost: lost.length,
          lostRate: rate(lost.length, closed.length),
          wonBudget: sumBudget(won),
          lostBudget: sumBudget(lost),
          openBudget: sumBudget(open),
          stageTotals: [...byStage.entries()].map(([stage, entry]) => ({
            stage,
            count: entry.count,
            budget: entry.budget,
          })),
        },
      };
    },
  );
