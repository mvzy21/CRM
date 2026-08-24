import { FunnelChart } from "#/components/charts/funnel-chart.tsx";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
  type DealStatus,
} from "#/lib/supabase/deals.ts";

/** Only what bucketing needs -- a full Deal satisfies this too. */
interface PipelineDeal {
  stage: DealStage;
  status: DealStatus;
}

interface DealsPipelineChartProps {
  deals: PipelineDeal[];
}

export function DealsPipelineChart({ deals }: DealsPipelineChartProps) {
  const pipelineDeals = deals.filter((d) => d.status !== "lost");

  const data = DEAL_STAGES.map((stage, index) => {
    const value = pipelineDeals.filter(
      (d) => DEAL_STAGES.indexOf(d.stage) >= index,
    ).length;
    return {
      label: DEAL_STAGE_LABELS[stage],
      value,
      displayValue: String(value),
    };
  });

  if (data.every((d) => d.value === 0)) return null;

  return (
    <div className="panel mt-6 rounded-2xl p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
        Pipeline
      </p>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        How many open deals are currently at each stage or further.
      </p>
      <div className="mt-4">
        <FunnelChart color="var(--primary)" data={data} />
      </div>
    </div>
  );
}
