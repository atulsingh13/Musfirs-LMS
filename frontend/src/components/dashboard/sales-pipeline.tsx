import type { CrmPipelineStage } from "@/lib/static-data/crm-dashboard";

const MIN_BAR_WIDTH = 42;

/**
 * Sales funnel — percent text is never truncated against the stage label
 * (fixes clipped "O0.0%" / "P0.0%" artifacts on narrow bars).
 */
export function SalesPipeline({ stages }: { stages: CrmPipelineStage[] }) {
  const total = Math.max(Number(stages[0]?.value ?? 0), 1);
  const allZero = stages.every((stage) => Number(stage.value ?? 0) === 0);

  if (stages.length === 0 || allZero) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No pipeline data for this period.
      </div>
    );
  }

  const normalized = stages.map((stage, index) => {
    const value = Number(stage.value ?? 0);
    const percent =
      index === 0
        ? 100
        : Math.round((value / total) * 1000) / 10;
    return {
      ...stage,
      value,
      percent,
    };
  });

  return (
    <div className="flex h-full w-full min-w-0 flex-col items-center overflow-hidden sm:flex-row sm:items-stretch sm:gap-4">
      <div className="mx-auto flex w-full max-w-[280px] min-w-0 flex-1 flex-col justify-center gap-2 py-1 sm:max-w-none">
        {normalized.map((stage, index) => {
          const widthPercent = Math.max(MIN_BAR_WIDTH, stage.percent);
          const isLast = index === normalized.length - 1;
          const percentLabel = `${stage.percent.toFixed(1)}%`;

          return (
            <div
              key={stage.label}
              className="mx-auto flex h-9 items-center justify-center px-2 text-[12px] font-semibold shadow-sm sm:h-11 sm:px-3 sm:text-[13px]"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: stage.color,
                clipPath: isLast
                  ? "polygon(6% 0, 94% 0, 100% 100%, 0 100%)"
                  : "polygon(0 0, 100% 0, 94% 100%, 6% 100%)",
                color: index >= 3 ? "#4C1D95" : "#FFFFFF",
              }}
              title={`${stage.label}: ${stage.value} (${percentLabel})`}
            >
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {percentLabel}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex w-full flex-wrap justify-center gap-2 sm:mt-0 sm:w-[132px] sm:shrink-0 sm:flex-col sm:justify-center sm:gap-2.5">
        {normalized.map((stage) => (
          <li key={stage.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-muted-foreground">
              {stage.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
