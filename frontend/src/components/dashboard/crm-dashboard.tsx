import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { endOfDay, startOfDay } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  CalendarCheck,
  Clock3,
  Phone,
  Plane,
  Share2,
  UserPlus,
  Users,
  Wallet,
  IndianRupee,
  CircleDollarSign,
  FileText,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { PageShell } from "@/components/layout/page-shell";
import { DashboardSkeleton } from "@/components/skeletons";
import { LeadsOverview } from "@/components/dashboard/leads-overview";
import { SalesPipeline } from "@/components/dashboard/sales-pipeline";
import {
  type CrmActivityItem,
  type CrmKpiMetric,
  type CrmSalesCategory,
  type CrmStaffRow,
} from "@/lib/static-data/crm-dashboard";
import {
  buildKpiMetrics,
  CRM_KPI_LEADS_ROUTES,
  formatDashboardDateRangeLabel,
  formatDashboardRevenueCompact,
  getDashboardErrorMessage,
  getDashboardSummary,
  getDateRangeForPreset,
  type DashboardDateRange,
  type DashboardPeriodPreset,
  type DashboardSummaryData,
} from "@/services/crm-dashboard-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatStaffRevenue(amount: number) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricIcon({
  icon,
  color,
}: {
  icon: CrmKpiMetric["icon"];
  color: string;
}) {
  const props = { className: "size-4", style: { color } };

  switch (icon) {
    case "users":
      return <Users {...props} />;
    case "userPlus":
      return <UserPlus {...props} />;
    case "phone":
      return <Phone {...props} />;
    case "badgeCheck":
      return <BadgeCheck {...props} />;
    case "share":
      return <Share2 {...props} />;
    case "clock":
      return <Clock3 {...props} />;
    case "wallet":
      return <Wallet {...props} />;
    case "calendarCheck":
      return <CalendarCheck {...props} />;
    case "plane":
      return <Plane {...props} />;
    case "rupee":
      return <IndianRupee {...props} />;
  }
}

function Sparkline({
  data,
  color,
  trend,
  gradientId,
}: {
  data: number[];
  color: string;
  trend: "up" | "down";
  gradientId: string;
}) {
  const chartData = data.map((value, index) => ({ index, value }));
  const stroke = trend === "up" ? color : "#EF4444";

  return (
    <div className="relative z-10 h-7 w-[56px] shrink-0 md:h-9 md:w-[72px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  metric,
  onClick,
}: {
  metric: CrmKpiMetric;
  onClick?: () => void;
}) {
  const isUp = metric.trend === "up";
  const isClickable = Boolean(onClick);

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all duration-300 hover:bg-white/40 md:p-5 dark:border-white/15 dark:bg-white/10 dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] dark:hover:bg-white/15",
        isClickable && "cursor-pointer hover:scale-[1.02]"
      )}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start gap-2 md:gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm ring-1 ring-white/60 backdrop-blur-sm md:size-10 md:rounded-xl dark:bg-white/15 dark:ring-white/10">
          <MetricIcon icon={metric.icon} color={metric.accent} />
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-700 md:text-sm dark:text-slate-200">
            {metric.title}
          </p>
          <p className="mt-0.5 text-lg leading-none font-bold tracking-tight text-gray-900 md:text-2xl dark:text-white">
            {metric.value}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-end justify-between gap-2">
        <div
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold",
            isUp ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {isUp ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          <span>{metric.changePercent}%</span>
        </div>
        <Sparkline
          data={metric.sparkline}
          color={metric.accent}
          trend={metric.trend}
          gradientId={`spark-${metric.id}`}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
  action,
  subtitle,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-6",
        className
      )}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle}
        </div>
        {action}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}

const DASHBOARD_PERIOD_OPTIONS: {
  label: string;
  value: DashboardPeriodPreset;
}[] = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Custom", value: "custom" },
];

function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value: DashboardPeriodPreset;
  onChange: (value: DashboardPeriodPreset) => void;
  className?: string;
}) {
  const selectedLabel =
    DASHBOARD_PERIOD_OPTIONS.find((opt) => opt.value === value)?.label ||
    "Select Date";

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        onChange((next as DashboardPeriodPreset) ?? "this_month")
      }
    >
      <SelectTrigger className={cn("h-8 w-[120px] max-md:w-full text-xs", className)}>
        <SelectValue placeholder="Period">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {DASHBOARD_PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function activityIcon(tone: CrmActivityItem["tone"]) {
  switch (tone) {
    case "lead":
      return { Icon: UserPlus, color: "#3B82F6", bg: "#3B82F618" };
    case "payment":
      return { Icon: CircleDollarSign, color: "#16A34A", bg: "#16A34A18" };
    case "booking":
      return { Icon: CalendarCheck, color: "#7C3AED", bg: "#7C3AED18" };
    case "call":
      return { Icon: PhoneCall, color: "#F97316", bg: "#F9731618" };
    case "plan":
      return { Icon: FileText, color: "#A855F7", bg: "#A855F718" };
  }
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EMPTY_SUMMARY: DashboardSummaryData = {
  dateRange: { startDate: "", endDate: "" },
  metrics: {
    totalLeads: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    newToday: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    callsDueToday: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    qualified: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    planShared: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    paymentPending: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    advancePaid: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    booked: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    travelCompleted: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
    revenue: { value: 0, changePercent: 0, trend: "up", sparkline: [] },
  },
  pipeline: [],
  leadsOverview: [],
  revenueOverview: [],
  revenueTotal: 0,
  revenueChangePercent: 0,
  revenueTrend: "up",
  salesPerformance: [],
  topStaff: [],
  recentActivities: [],
};

export function CrmDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Auth maps backend Owner/Administrator → frontend role "administrator"
  const isAdmin = user?.role === "administrator";
  const [filterPreset, setFilterPreset] =
    useState<DashboardPeriodPreset>("this_month");
  const [customRange, setCustomRange] = useState<DashboardDateRange>(() =>
    getDateRangeForPreset("this_month")
  );
  const [summary, setSummary] = useState<DashboardSummaryData>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const dateRange = useMemo(
    () => getDateRangeForPreset(filterPreset, customRange),
    [filterPreset, customRange]
  );

  const dateRangeLabel = useMemo(
    () => formatDashboardDateRangeLabel(dateRange),
    [dateRange]
  );

  const kpiMetrics = useMemo(
    () =>
      buildKpiMetrics(summary.metrics, {
        includeRevenue: isAdmin,
      }),
    [summary.metrics, isAdmin]
  );

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getDashboardSummary(dateRange);
      setSummary(response.data);
    } catch (error) {
      toast.error(
        getDashboardErrorMessage(error, "Failed to load dashboard data.")
      );
      setSummary(EMPTY_SUMMARY);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  function handlePresetChange(next: DashboardPeriodPreset) {
    setFilterPreset(next);
    if (next !== "custom") {
      setCustomRange(getDateRangeForPreset(next));
    }
  }

  function handleCustomStartChange(value: string) {
    const start = startOfDay(new Date(`${value}T00:00:00`));
    if (Number.isNaN(start.getTime())) return;
    setCustomRange((prev) => ({ ...prev, start }));
  }

  function handleCustomEndChange(value: string) {
    const end = endOfDay(new Date(`${value}T00:00:00`));
    if (Number.isNaN(end.getTime())) return;
    setCustomRange((prev) => ({ ...prev, end }));
  }

  const revenueTotalLabel = formatDashboardRevenueCompact(summary.revenueTotal);
  const revenueCenterLabel = formatDashboardRevenueCompact(summary.revenueTotal);
  const revenueIsUp = summary.revenueTrend === "up";

  return (
    <PageShell
      title="CRM Dashboard"
      description="Overview of leads, sales performance and key business metrics."
      className="px-3 py-4 md:px-6 md:py-8"
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <PeriodSelect
            value={filterPreset}
            onChange={handlePresetChange}
            className="h-9 w-[140px] max-md:min-w-[9rem] max-md:flex-1 text-sm"
          />
          {filterPreset === "custom" ? (
            <>
              <Input
                type="date"
                className="glass-control h-9 w-[150px] max-md:min-w-0 max-md:flex-1 text-sm"
                value={toDatetimeLocalValue(dateRange.start).slice(0, 10)}
                onChange={(e) => handleCustomStartChange(e.target.value)}
              />
              <Input
                type="date"
                className="glass-control h-9 w-[150px] max-md:min-w-0 max-md:flex-1 text-sm"
                value={toDatetimeLocalValue(dateRange.end).slice(0, 10)}
                onChange={(e) => handleCustomEndChange(e.target.value)}
              />
            </>
          ) : null}
          <div className="glass-control inline-flex h-9 min-w-0 max-w-full items-center gap-2 rounded-md px-3 text-sm text-muted-foreground">
            <Calendar className="size-4 shrink-0" />
            <span className="truncate">{dateRangeLabel}</span>
          </div>
        </div>
      }
    >
      <div className="relative space-y-5">
        {isLoading ? (
          <DashboardSkeleton isAdmin={isAdmin} />
        ) : (
          <>
        {/* Standard cards — visible to everyone (API-scoped for Staff) */}
        <div
          className={cn(
            "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6",
            isAdmin ? "lg:grid-cols-4" : "xl:grid-cols-3"
          )}
        >
          {kpiMetrics.map((metric) => {
            const route = CRM_KPI_LEADS_ROUTES[metric.id];
            return (
              <KpiCard
                key={metric.id}
                metric={metric}
                onClick={
                  route
                    ? () => {
                        navigate(route);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* Pipeline + Leads always shown; Revenue Overview only for Admin */}
        <div
          className={cn(
            "grid grid-cols-1 items-stretch gap-4",
            isAdmin ? "lg:grid-cols-3" : "md:grid-cols-2"
          )}
        >
          <ChartCard title="Sales Pipeline">
            <div
              className={cn(
                "flex w-full min-w-0 flex-col items-center overflow-hidden",
                isAdmin ? "h-auto min-h-[220px] md:h-[250px]" : "h-auto min-h-[240px] md:h-[280px]"
              )}
            >
              <SalesPipeline stages={summary.pipeline} />
            </div>
          </ChartCard>

          <LeadsOverview
            data={summary.leadsOverview}
            preset={filterPreset}
            onPresetChange={handlePresetChange}
          />

          {/* Sensitive — Owner / Administrator only */}
          {isAdmin ? (
          <ChartCard
            title="Revenue Overview"
            subtitle={
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {revenueTotalLabel}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold",
                    revenueIsUp ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {revenueIsUp ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {summary.revenueChangePercent}%
                </span>
              </div>
            }
          >
            <div className="h-[220px] w-full md:h-[250px]">
              {summary.revenueOverview.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No revenue in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.revenueOverview}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#EEF2F7"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        formatDashboardRevenueCompact(Number(value)),
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      name="Revenue"
                      fill="#7C3AED"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
          ) : null}
        </div>

        {/* Sensitive cards — Owner / Administrator only */}
        {isAdmin ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Sales Performance">
            <div className="flex h-auto min-h-[16rem] flex-col items-center justify-center gap-4 md:h-[280px] md:gap-5">
              <div className="relative mx-auto flex h-64 w-full max-w-[16rem] items-center justify-center md:h-72 md:max-w-[18rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.salesPerformance}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="52%"
                      outerRadius="88%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {summary.salesPerformance.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Share"]}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:text-xs">
                    Total Revenue
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground md:text-2xl">
                    {revenueCenterLabel}
                  </p>
                </div>
              </div>

              <ul className="grid w-full grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-4">
                {summary.salesPerformance.map((item: CrmSalesCategory) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      {item.value}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ChartCard>

          <ChartCard title="Top Performing Staff">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Staff Member</th>
                    <th className="pb-3 font-semibold">Leads</th>
                    <th className="pb-3 font-semibold">Booked</th>
                    <th className="pb-3 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        No staff performance data for this period.
                      </td>
                    </tr>
                  ) : (
                    summary.topStaff.map((staff: CrmStaffRow) => (
                      <tr
                        key={staff.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: staff.avatarColor }}
                            >
                              {staff.initials}
                            </span>
                            <span className="min-w-0 truncate font-medium text-foreground">
                              {staff.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 tabular-nums text-muted-foreground">
                          {staff.leads}
                        </td>
                        <td className="py-3 tabular-nums text-muted-foreground">
                          {staff.booked}
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatStaffRevenue(staff.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Recent Activities">
            <ul className="space-y-4">
              {summary.recentActivities.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No recent activity for this period.
                </li>
              ) : (
                summary.recentActivities.map((activity) => {
                  const { Icon, color, bg } = activityIcon(activity.tone);
                  return (
                    <li key={activity.id} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: bg, color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-foreground">
                          {activity.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.timeAgo}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </ChartCard>
        </div>
        ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
