const STEPS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "escalated", label: "Escalated" },
  { key: "tech_approved", label: "Tech Approved" },
  { key: "finance_approved", label: "Finance Approved" },
  { key: "converted", label: "Converted" },
];

export function LeadStatusStepper({ status }: { status: string }) {
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2 text-sm font-medium text-[var(--destructive)]">
        Rejected -- awaiting Sales Manager to mark Cold
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <div className="flex items-center overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--muted)]/40 px-2 py-1.5">
      {STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isPast = activeIndex >= 0 && index < activeIndex;
        return (
          <div key={step.key} className="flex items-center">
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
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
