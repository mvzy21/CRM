import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from "#/lib/supabase/deals.ts";

interface DealStageStepperProps {
  stage: DealStage;
  status: "open" | "won" | "lost";
}

export function DealStageStepper({ stage, status }: DealStageStepperProps) {
  if (status !== "open") {
    const won = status === "won";
    return (
      <div
        className={
          "flex items-center gap-2 overflow-x-auto rounded-full border px-4 py-2 text-sm font-medium " +
          (won
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            : "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]")
        }
      >
        {won ? "Won" : "Lost"}
      </div>
    );
  }

  const activeIndex = DEAL_STAGES.indexOf(stage);

  return (
    <div className="flex items-center overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--muted)]/40 px-2 py-1.5">
      {DEAL_STAGES.map((step, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        return (
          <div key={step} className="flex items-center">
            {index > 0 ? (
              <span className="mx-1.5 h-px w-4 shrink-0 bg-[var(--line)]" />
            ) : null}
            <span
              className={
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium " +
                (isActive
                  ? "bg-[var(--primary)] text-white"
                  : isPast
                    ? "text-[var(--ink)]"
                    : "text-[var(--ink-soft)]")
              }
            >
              {DEAL_STAGE_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
