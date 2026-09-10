import axios from "axios";
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from "date-fns";
import { api } from "@/services/api";
import type {
  CrmActivityItem,
  CrmChartPoint,
  CrmKpiMetric,
  CrmPipelineStage,
  CrmSalesCategory,
  CrmStaffRow,
  CrmTrendDirection,
} from "@/lib/static-data/crm-dashboard";

export type DashboardPeriodPreset =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface DashboardDateRange {
  start: Date;
  end: Date;
}

export interface DashboardMetricValue {
  value: number;
  changePercent: number;
  trend: CrmTrendDirection;
  sparkline: number[];
}

export interface DashboardSummaryData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalLeads: DashboardMetricValue;
    newToday: DashboardMetricValue;
    callsDueToday: DashboardMetricValue;
    qualified: DashboardMetricValue;
    planShared: DashboardMetricValue;
    paymentPending: DashboardMetricValue;
    advancePaid: DashboardMetricValue;
    booked: DashboardMetricValue;
    travelCompleted: DashboardMetricValue;
    /** Owner/Administrator only — omitted for Staff */
    revenue?: DashboardMetricValue;
  };
  pipeline: CrmPipelineStage[];
  leadsOverview: CrmChartPoint[];
  revenueOverview: CrmChartPoint[];
  revenueTotal: number;
  revenueChangePercent: number;
  revenueTrend: CrmTrendDirection;
  salesPerformance: CrmSalesCategory[];
  topStaff: CrmStaffRow[];
  recentActivities: CrmActivityItem[];
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummaryData;
}

export function getDateRangeForPreset(
  preset: DashboardPeriodPreset,
  customRange?: DashboardDateRange
): DashboardDateRange {
  const now = new Date();

  switch (preset) {
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case "this_quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return (
        customRange ?? {
          start: startOfMonth(now),
          end: endOfMonth(now),
        }
      );
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function formatDashboardDateRangeLabel(range: DashboardDateRange): string {
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  if (sameYear) {
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
  }
  return `${format(range.start, "MMM d, yyyy")} – ${format(range.end, "MMM d, yyyy")}`;
}

export function formatDashboardCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDashboardRevenue(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDashboardRevenueCompact(amount: number): string {
  if (amount >= 100000) {
    return `₹ ${(amount / 100000).toFixed(2)}L`;
  }
  return formatDashboardRevenue(amount);
}

export async function getDashboardSummary(
  range: DashboardDateRange
): Promise<DashboardSummaryResponse> {
  const { data } = await api.get<DashboardSummaryResponse>(
    "/dashboard/summary",
    {
      params: {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      },
    }
  );
  return data;
}

export function getDashboardErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Static card layout metadata for KPI tiles. */
export interface CrmKpiCardMeta {
  id: string;
  key: keyof DashboardSummaryData["metrics"];
  title: string;
  icon: CrmKpiMetric["icon"];
  accent: string;
}

export const CRM_KPI_CARD_META: CrmKpiCardMeta[] = [
  {
    id: "total-leads",
    key: "totalLeads",
    title: "Total Leads",
    icon: "users",
    accent: "#3B82F6",
  },
  {
    id: "new-today",
    key: "newToday",
    title: "New Today",
    icon: "userPlus",
    accent: "#22C55E",
  },
  {
    id: "calls-due",
    key: "callsDueToday",
    title: "Calls Due Today",
    icon: "phone",
    accent: "#F97316",
  },
  {
    id: "qualified",
    key: "qualified",
    title: "Qualified",
    icon: "badgeCheck",
    accent: "#0EA5E9",
  },
  {
    id: "plan-shared",
    key: "planShared",
    title: "Plan Shared",
    icon: "share",
    accent: "#A855F7",
  },
  {
    id: "payment-pending",
    key: "paymentPending",
    title: "Payment Pending",
    icon: "clock",
    accent: "#EAB308",
  },
  {
    id: "advance-paid",
    key: "advancePaid",
    title: "Advance Paid",
    icon: "wallet",
    accent: "#84CC16",
  },
  {
    id: "booked",
    key: "booked",
    title: "Booked",
    icon: "calendarCheck",
    accent: "#2563EB",
  },
  {
    id: "travel-completed",
    key: "travelCompleted",
    title: "Travel Completed",
    icon: "plane",
    accent: "#6366F1",
  },
  {
    id: "revenue",
    key: "revenue",
    title: "Revenue",
    icon: "rupee",
    accent: "#16A34A",
  },
];

/** Build `/leads?...` with correctly encoded query params. */
export function leadsListRoute(
  query: Record<string, string> = {}
): string {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

/**
 * KPI card → Leads list with matching URL filters.
 * Revenue is intentionally omitted (non-clickable).
 */
export const CRM_KPI_LEADS_ROUTES: Record<string, string> = {
  "total-leads": leadsListRoute(),
  "new-today": leadsListRoute({ created: "today" }),
  "calls-due": leadsListRoute({ followUp: "today" }),
  qualified: leadsListRoute({ status: "Qualified" }),
  "plan-shared": leadsListRoute({ status: "Plan Shared" }),
  "payment-pending": leadsListRoute({ status: "Payment Pending" }),
  "advance-paid": leadsListRoute({ status: "Advance Paid" }),
  booked: leadsListRoute({ status: "Booked" }),
  "travel-completed": leadsListRoute({ status: "Travel Completed" }),
};

export function buildKpiMetrics(
  metrics: DashboardSummaryData["metrics"],
  options?: { includeRevenue?: boolean }
): CrmKpiMetric[] {
  const includeRevenue = options?.includeRevenue ?? true;

  return CRM_KPI_CARD_META.filter(
    (meta) => includeRevenue || meta.key !== "revenue"
  ).map((meta) => {
    const metric = metrics[meta.key];
    const safeMetric: DashboardMetricValue = metric ?? {
      value: 0,
      changePercent: 0,
      trend: "up",
      sparkline: [],
    };
    const value =
      meta.key === "revenue"
        ? formatDashboardRevenue(safeMetric.value)
        : formatDashboardCount(safeMetric.value);

    return {
      id: meta.id,
      title: meta.title,
      icon: meta.icon,
      accent: meta.accent,
      value,
      changePercent: safeMetric.changePercent,
      trend: safeMetric.trend,
      sparkline: safeMetric.sparkline,
    };
  });
}
