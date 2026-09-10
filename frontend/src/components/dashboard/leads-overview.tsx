import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CrmChartPoint } from "@/lib/static-data/crm-dashboard";
import type { DashboardPeriodPreset } from "@/services/crm-dashboard-api";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { label: string; value: DashboardPeriodPreset }[] = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Custom", value: "custom" },
];

const CHART_PURPLE = "#8B5CF6";

function PeriodDropdown({
  value,
  onChange,
}: {
  value: DashboardPeriodPreset;
  onChange: (value: DashboardPeriodPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    PERIOD_OPTIONS.find((opt) => opt.value === value)?.label ?? "This Month";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "glass-control inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-foreground",
          "transition-colors hover:bg-white/40 dark:hover:bg-white/15"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="glass-popover absolute top-full right-0 z-30 mt-1.5 min-w-[168px] overflow-hidden rounded-xl py-1"
        >
          {PERIOD_OPTIONS.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-3.5 py-2.5 text-left text-sm text-foreground",
                    "transition-colors hover:bg-white/50 dark:hover:bg-white/10",
                    isActive && "font-medium bg-white/35 dark:bg-white/10"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? (
                    <Check className="size-4 shrink-0 text-foreground" strokeWidth={2.5} />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function LeadsOverview({
  data,
  preset,
  onPresetChange,
}: {
  data: CrmChartPoint[];
  preset: DashboardPeriodPreset;
  onPresetChange: (value: DashboardPeriodPreset) => void;
}) {
  const chartData = data.length > 0 ? data : [{ label: "—", value: 0 }];

  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-sm font-semibold text-foreground">Leads Overview</h3>
        <PeriodDropdown value={preset} onChange={onPresetChange} />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: CHART_PURPLE }} />
          Leads
        </span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="h-[200px] w-full md:h-[280px] lg:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="leadsOverviewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PURPLE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_PURPLE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#EEF2F7"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
                formatter={(value) => [Number(value), "Leads"]}
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Leads"
                stroke={CHART_PURPLE}
                strokeWidth={2.5}
                fill="url(#leadsOverviewFill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
