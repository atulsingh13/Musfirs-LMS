import type { Request, Response } from "express";
import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import { Lead } from "../models/Lead.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { OWNER_ROLES } from "../types/user.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PIPELINE_COLORS = [
  "#7C3AED",
  "#8B5CF6",
  "#A78BFA",
  "#C4B5FD",
  "#DDD6FE",
];

const SALES_COLORS = [
  "#7C3AED",
  "#3B82F6",
  "#38BDF8",
  "#EAB308",
  "#F97316",
  "#22C55E",
  "#A855F7",
];

const PAYMENT_PENDING_STATUSES = ["Payment Pending", "Hot / Payment Pending"];
const REVENUE_STATUSES = ["Booked", "Advance Paid"];

type TrendDirection = "up" | "down";

interface MetricValue {
  value: number;
  changePercent: number;
  trend: TrendDirection;
  sparkline: number[];
}

function isOwnerRole(role?: string): boolean {
  return !!role && OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number]);
}

function isStaffRole(role?: string): boolean {
  return role === "Staff" || role === "Employee";
}

/** Merge Mongo filters with $and when multiple clauses are present. */
function mergeFilters(
  ...parts: Record<string, unknown>[]
): Record<string, unknown> {
  const active = parts.filter((part) => Object.keys(part).length > 0);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}

/**
 * Staff/Employee: only leads assigned to or created by them.
 * Owner/Admin: empty filter (company-wide).
 */
function buildLeadScopeFilter(req: Request): Record<string, unknown> {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || isOwnerRole(role) || !isStaffRole(role)) {
    return {};
  }
  const oid = new Types.ObjectId(userId);
  return {
    $or: [{ assignedTo: oid }, { createdBy: oid }],
  };
}

function parseQueryDate(value: unknown, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function calcTrend(
  current: number,
  previous: number
): { changePercent: number; trend: TrendDirection } {
  if (previous === 0) {
    if (current === 0) return { changePercent: 0, trend: "up" };
    return { changePercent: 100, trend: "up" };
  }
  const raw = ((current - previous) / previous) * 100;
  return {
    changePercent: Math.round(Math.abs(raw) * 10) / 10,
    trend: raw >= 0 ? "up" : "down",
  };
}

function buildMetric(
  current: number,
  previous: number,
  sparkline: number[] = []
): MetricValue {
  const { changePercent, trend } = calcTrend(current, previous);
  return {
    value: current,
    changePercent,
    trend,
    sparkline: sparkline.length > 0 ? sparkline : [0, 0, 0, 0, 0, 0],
  };
}

function createdAtMatch(start: Date, end: Date) {
  return { createdAt: { $gte: start, $lte: end } };
}

function leadRevenueExpression() {
  return {
    $switch: {
      branches: [
        {
          case: { $eq: ["$status", "Booked"] },
          then: { $ifNull: ["$totalAmount", 0] },
        },
        {
          case: { $eq: ["$status", "Advance Paid"] },
          then: { $ifNull: ["$advancePaid", 0] },
        },
      ],
      default: 0,
    },
  };
}

async function countLeads(filter: Record<string, unknown>): Promise<number> {
  return Lead.countDocuments(filter).exec();
}

async function sumRevenue(filter: Record<string, unknown>): Promise<number> {
  const [result] = await Lead.aggregate([
    {
      $match: mergeFilters(filter, { status: { $in: REVENUE_STATUSES } }),
    },
    { $group: { _id: null, total: { $sum: leadRevenueExpression() } } },
  ]).exec();
  return Number(result?.total ?? 0);
}

async function buildSparkline(
  baseFilter: Record<string, unknown>,
  start: Date,
  end: Date
): Promise<number[]> {
  const bucketCount = 12;
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return Array(bucketCount).fill(0);

  const bucketMs = duration / bucketCount;
  const buckets = Array(bucketCount).fill(0) as number[];

  const leads = await Lead.find(
    mergeFilters(baseFilter, createdAtMatch(start, end))
  )
    .select("createdAt")
    .lean()
    .exec();

  for (const lead of leads) {
    const createdAt = new Date(lead.createdAt as Date);
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((createdAt.getTime() - start.getTime()) / bucketMs))
    );
    buckets[index] += 1;
  }

  return buckets;
}

async function buildRevenueSparkline(
  baseFilter: Record<string, unknown>,
  start: Date,
  end: Date
): Promise<number[]> {
  const bucketCount = 12;
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return Array(bucketCount).fill(0);

  const bucketMs = duration / bucketCount;
  const buckets = Array(bucketCount).fill(0) as number[];

  const leads = await Lead.find(
    mergeFilters(baseFilter, {
      ...createdAtMatch(start, end),
      status: { $in: REVENUE_STATUSES },
    })
  )
    .select("createdAt status totalAmount advancePaid")
    .lean()
    .exec();

  for (const lead of leads) {
    const createdAt = new Date(lead.createdAt as Date);
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((createdAt.getTime() - start.getTime()) / bucketMs))
    );
    const amount =
      lead.status === "Booked"
        ? Number(lead.totalAmount ?? 0)
        : Number(lead.advancePaid ?? 0);
    buckets[index] += amount / 100000;
  }

  return buckets;
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function activityToneForStatus(status: string): string {
  switch (status) {
    case "Advance Paid":
      return "payment";
    case "Booked":
      return "booking";
    case "Plan Shared":
      return "plan";
    case "Follow-up Later":
    case "Qualification Pending":
      return "call";
    default:
      return "lead";
  }
}

function activityTitleForLead(lead: {
  firstName?: string;
  lastName?: string;
  destination?: string;
  status?: string;
}): string {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  const destination = lead.destination ?? "trip";
  const status = String(lead.status ?? "New Lead");

  switch (status) {
    case "Advance Paid":
      return `Advance payment received for ${destination}${name ? ` — ${name}` : ""}`;
    case "Booked":
      return `Booking confirmed for ${name || "lead"} — ${destination}`;
    case "Plan Shared":
      return `Itinerary shared with ${name || "lead"} (${destination})`;
    case "Qualified":
      return `Lead qualified: ${name || "Lead"} — ${destination} enquiry`;
    case "Follow-up Later":
      return `Follow-up scheduled with ${name || "lead"} (${destination})`;
    default:
      return `New lead received from ${name || "Unknown"} for ${destination}`;
  }
}

function initialsFromName(first?: string, last?: string): string {
  const firstInitial = (first ?? "").trim().charAt(0).toUpperCase();
  const lastInitial = (last ?? "").trim().charAt(0).toUpperCase();
  return `${firstInitial}${lastInitial}`.trim() || "?";
}

function avatarColorFromSeed(seed: string): string {
  const palette = [
    "#3B82F6",
    "#A855F7",
    "#22C55E",
    "#F97316",
    "#6366F1",
    "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/** GET /api/dashboard/summary */
export const getDashboardSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const defaultStart = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
    const defaultEnd = endOfDay(
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
    );

    const start = startOfDay(parseQueryDate(req.query.startDate, defaultStart));
    const end = endOfDay(parseQueryDate(req.query.endDate, defaultEnd));

    if (start > end) {
      throw new AppError("startDate must be before endDate", 400);
    }

    const periodMs = end.getTime() - start.getTime() + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs + 1);

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Staff: { $or: [assignedTo, createdBy] }; Admin/Owner: {}
    const baseFilter = buildLeadScopeFilter(req);
    const isAdmin = isOwnerRole(req.user?.role);
    const staffScoped = isStaffRole(req.user?.role);
    const userObjectId = req.user?.id
      ? new Types.ObjectId(req.user.id)
      : null;

    // Date-range picker periods always include baseFilter
    const periodMatch = mergeFilters(baseFilter, createdAtMatch(start, end));
    const prevMatch = mergeFilters(
      baseFilter,
      createdAtMatch(prevStart, prevEnd)
    );

    // New Today = baseFilter + createdAt today
    const newTodayMatch = mergeFilters(
      baseFilter,
      createdAtMatch(todayStart, todayEnd)
    );

    // Calls Due Today = baseFilter + nextFollowUpDate today
    const callsDueTodayMatch = mergeFilters(baseFilter, {
      $or: [
        { nextFollowUpDate: { $gte: todayStart, $lte: todayEnd } },
        { nextFollowUp: { $gte: todayStart, $lte: todayEnd } },
      ],
    });

    // Status cards = baseFilter + period + status
    const withStatus = (
      period: Record<string, unknown>,
      status: string | { $in: string[] }
    ) => mergeFilters(period, { status });

    const taskDueFilter: Record<string, unknown> = {
      isCompleted: false,
      deadline: { $gte: todayStart, $lte: todayEnd },
    };
    if (staffScoped && userObjectId) {
      taskDueFilter.createdBy = userObjectId;
    }

    const [
      totalLeadsCurrent,
      totalLeadsPrev,
      newToday,
      callsDueTasks,
      callsDueLeads,
      qualifiedCurrent,
      qualifiedPrev,
      planSharedCurrent,
      planSharedPrev,
      paymentPendingCurrent,
      paymentPendingPrev,
      advancePaidCurrent,
      advancePaidPrev,
      bookedCurrent,
      bookedPrev,
      travelCompletedCurrent,
      travelCompletedPrev,
      pipelineAgg,
      leadsSeriesAgg,
      totalSparkline,
    ] = await Promise.all([
      // Total Leads: baseFilter + selected period
      countLeads(periodMatch),
      countLeads(prevMatch),
      // New Today
      countLeads(newTodayMatch),
      Task.countDocuments(taskDueFilter).exec(),
      // Calls Due Today
      Lead.countDocuments(callsDueTodayMatch).exec(),
      // Status cards (Qualified, Plan Shared, etc.)
      countLeads(withStatus(periodMatch, "Qualified")),
      countLeads(withStatus(prevMatch, "Qualified")),
      countLeads(withStatus(periodMatch, "Plan Shared")),
      countLeads(withStatus(prevMatch, "Plan Shared")),
      countLeads(withStatus(periodMatch, { $in: PAYMENT_PENDING_STATUSES })),
      countLeads(withStatus(prevMatch, { $in: PAYMENT_PENDING_STATUSES })),
      countLeads(withStatus(periodMatch, "Advance Paid")),
      countLeads(withStatus(prevMatch, "Advance Paid")),
      countLeads(withStatus(periodMatch, "Booked")),
      countLeads(withStatus(prevMatch, "Booked")),
      countLeads(withStatus(periodMatch, "Travel Completed")),
      countLeads(withStatus(prevMatch, "Travel Completed")),
      Lead.aggregate([
        { $match: periodMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            qualified: {
              $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] },
            },
            planShared: {
              $sum: { $cond: [{ $eq: ["$status", "Plan Shared"] }, 1, 0] },
            },
            booked: {
              $sum: { $cond: [{ $eq: ["$status", "Booked"] }, 1, 0] },
            },
            travelCompleted: {
              $sum: {
                $cond: [{ $eq: ["$status", "Travel Completed"] }, 1, 0],
              },
            },
          },
        },
      ]).exec(),
      buildLeadsTimeSeries(baseFilter, start, end),
      buildSparkline(baseFilter, start, end),
    ]);

    // Sensitive financial / company-wide aggregations — Owner/Admin only
    let revenueCurrent = 0;
    let revenuePrev = 0;
    let revenueSeriesAgg: { label: string; value: number }[] = [];
    let salesPerformanceAgg: { _id?: string; revenue?: number }[] = [];
    let topStaffAgg: {
      _id?: Types.ObjectId | null;
      leads?: number;
      booked?: number;
      revenue?: number;
    }[] = [];
    let recentLeads: {
      _id: Types.ObjectId;
      firstName?: string;
      lastName?: string;
      destination?: string;
      status?: string;
      updatedAt?: Date;
      createdAt?: Date;
    }[] = [];
    let recentAuditLogs: Awaited<ReturnType<typeof AuditLog.find>> = [];
    let revenueSparkline: number[] = [];

    if (isAdmin) {
      [
        revenueCurrent,
        revenuePrev,
        revenueSeriesAgg,
        salesPerformanceAgg,
        topStaffAgg,
        recentLeads,
        recentAuditLogs,
        revenueSparkline,
      ] = await Promise.all([
        sumRevenue(periodMatch),
        sumRevenue(prevMatch),
        buildRevenueTimeSeries(baseFilter, start, end),
        Lead.aggregate([
          {
            $match: withStatus(periodMatch, { $in: REVENUE_STATUSES }),
          },
          {
            $group: {
              _id: "$leadSource",
              revenue: { $sum: leadRevenueExpression() },
            },
          },
          { $sort: { revenue: -1 } },
        ]).exec(),
        Lead.aggregate([
          { $match: periodMatch },
          {
            $group: {
              _id: "$createdBy",
              leads: { $sum: 1 },
              booked: {
                $sum: { $cond: [{ $eq: ["$status", "Booked"] }, 1, 0] },
              },
              revenue: { $sum: leadRevenueExpression() },
            },
          },
          { $sort: { revenue: -1, leads: -1 } },
          { $limit: 5 },
        ]).exec(),
        Lead.find(periodMatch)
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("firstName lastName destination status updatedAt createdAt")
          .lean()
          .exec(),
        AuditLog.find({})
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("changedBy", "first_name last_name")
          .lean()
          .exec(),
        buildRevenueSparkline(baseFilter, start, end),
      ]);
    }

    const pipelineRow = pipelineAgg[0] ?? {
      total: 0,
      qualified: 0,
      planShared: 0,
      booked: 0,
      travelCompleted: 0,
    };

    const pipelineTotal = Math.max(Number(pipelineRow.total ?? 0), 1);
    const pipelineRaw = [
      { stage: "Leads", value: Number(pipelineRow.total ?? 0) },
      { stage: "Qualified", value: Number(pipelineRow.qualified ?? 0) },
      { stage: "Plan Shared", value: Number(pipelineRow.planShared ?? 0) },
      { stage: "Booked", value: Number(pipelineRow.booked ?? 0) },
      {
        stage: "Travel Completed",
        value: Number(pipelineRow.travelCompleted ?? 0),
      },
    ];

    const pipelineStages = pipelineRaw.map((stage, index) => ({
      label: stage.stage,
      value: stage.value,
      percent:
        index === 0
          ? 100
          : Math.round((stage.value / pipelineTotal) * 1000) / 10,
      color: PIPELINE_COLORS[index] ?? PIPELINE_COLORS[0],
    }));

    const salesTotal = salesPerformanceAgg.reduce(
      (sum, row) => sum + Number(row.revenue ?? 0),
      0
    );
    const salesPerformance = isAdmin
      ? salesTotal > 0
        ? salesPerformanceAgg.slice(0, 5).map((row, index) => ({
            name: String(row._id ?? "Other"),
            value:
              Math.round((Number(row.revenue ?? 0) / salesTotal) * 1000) / 10,
            color: SALES_COLORS[index % SALES_COLORS.length],
          }))
        : [{ name: "No revenue", value: 100, color: SALES_COLORS[0] }]
      : [];

    const staffIds = topStaffAgg
      .map((row) => row._id)
      .filter((id): id is Types.ObjectId => id != null);

    const staffUsers = staffIds.length
      ? await User.find({ _id: { $in: staffIds } })
          .select("first_name last_name")
          .lean()
          .exec()
      : [];

    const staffUserMap = new Map(
      staffUsers.map((user) => [String(user._id), user])
    );

    const topStaff = isAdmin
      ? topStaffAgg.map((row) => {
          const user = row._id ? staffUserMap.get(String(row._id)) : undefined;
          const firstName = String(user?.first_name ?? "Unassigned");
          const lastName = String(user?.last_name ?? "");
          const name = `${firstName} ${lastName}`.trim();
          return {
            id: String(row._id ?? "unassigned"),
            name,
            initials: initialsFromName(
              firstName,
              lastName === "Unassigned" ? "" : lastName
            ),
            avatarColor: avatarColorFromSeed(name),
            leads: Number(row.leads ?? 0),
            booked: Number(row.booked ?? 0),
            revenue: Number(row.revenue ?? 0),
          };
        })
      : [];

    const leadActivities = recentLeads.map((lead) => ({
      id: String(lead._id),
      title: activityTitleForLead(lead),
      timeAgo: formatTimeAgo(new Date(lead.updatedAt as Date)),
      tone: activityToneForStatus(String(lead.status ?? "New Lead")),
      sortAt: new Date(lead.updatedAt as Date).getTime(),
    }));

    const auditActivities = (recentAuditLogs as Array<Record<string, unknown>>).map(
      (log) => {
        const actor = log.changedBy as
          | { first_name?: string; last_name?: string }
          | undefined;
        const actorName = actor
          ? `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim()
          : "Admin";
        const verb = log.changeType === "Granted" ? "granted" : "restricted";
        return {
          id: String(log._id),
          title: `${actorName} ${verb} ${log.action} permission for ${log.moduleName}`,
          timeAgo: formatTimeAgo(new Date(log.createdAt as Date)),
          tone: "plan",
          sortAt: new Date(log.createdAt as Date).getTime(),
        };
      }
    );

    const recentActivities = isAdmin
      ? [...leadActivities, ...auditActivities]
          .sort((a, b) => b.sortAt - a.sortAt)
          .slice(0, 7)
          .map(({ sortAt: _sortAt, ...activity }) => activity)
      : [];

    const revenueTrend = calcTrend(revenueCurrent, revenuePrev);

    const metrics: Record<string, MetricValue> = {
      totalLeads: buildMetric(
        totalLeadsCurrent,
        totalLeadsPrev,
        totalSparkline
      ),
      newToday: buildMetric(newToday, 0, [newToday]),
      callsDueToday: buildMetric(callsDueTasks + callsDueLeads, 0, [
        callsDueTasks + callsDueLeads,
      ]),
      qualified: buildMetric(qualifiedCurrent, qualifiedPrev),
      planShared: buildMetric(planSharedCurrent, planSharedPrev),
      paymentPending: buildMetric(paymentPendingCurrent, paymentPendingPrev),
      advancePaid: buildMetric(advancePaidCurrent, advancePaidPrev),
      booked: buildMetric(bookedCurrent, bookedPrev),
      travelCompleted: buildMetric(
        travelCompletedCurrent,
        travelCompletedPrev
      ),
    };

    if (isAdmin) {
      metrics.revenue = {
        ...buildMetric(revenueCurrent, revenuePrev, revenueSparkline),
        value: revenueCurrent,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        dateRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        metrics,
        pipeline: pipelineStages,
        pipelineData: pipelineRaw,
        leadsOverview: leadsSeriesAgg,
        ...(isAdmin
          ? {
              revenueOverview: revenueSeriesAgg,
              revenueTotal: revenueCurrent,
              revenueChangePercent: revenueTrend.changePercent,
              revenueTrend: revenueTrend.trend,
              salesPerformance,
              topStaff,
              recentActivities,
            }
          : {
              revenueOverview: [],
              revenueTotal: 0,
              revenueChangePercent: 0,
              revenueTrend: "up" as const,
              salesPerformance: [],
              topStaff: [],
              recentActivities: [],
            }),
      },
    });
  }
);

async function buildLeadsTimeSeries(
  baseFilter: Record<string, unknown>,
  start: Date,
  end: Date
) {
  const spanMs = end.getTime() - start.getTime();
  const useMonthly = spanMs > 62 * 24 * 60 * 60 * 1000;

  const groupStage = useMonthly
    ? {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      }
    : {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };

  const rows = await Lead.aggregate([
    { $match: mergeFilters(baseFilter, createdAtMatch(start, end)) },
    { $group: { _id: groupStage, value: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]).exec();

  if (useMonthly) {
    const countByMonth = new Map<string, number>();
    for (const row of rows) {
      const key = `${row._id.year}-${row._id.month}`;
      countByMonth.set(key, Number(row.value ?? 0));
    }

    const points: { label: string; value: number }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const key = `${year}-${month}`;
      points.push({
        label: cursor.toLocaleDateString("en-IN", { month: "short" }),
        value: countByMonth.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return points;
  }

  const countByDay = new Map<string, number>();
  for (const row of rows) {
    const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
    countByDay.set(key, Number(row.value ?? 0));
  }

  const points: { label: string; value: number }[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const day = cursor.getDate();
    const key = `${year}-${month}-${day}`;
    points.push({
      label: String(day),
      value: countByDay.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

async function buildRevenueTimeSeries(
  baseFilter: Record<string, unknown>,
  start: Date,
  end: Date
) {
  const useMonthly = end.getTime() - start.getTime() > 62 * 24 * 60 * 60 * 1000;

  const groupStage = useMonthly
    ? {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      }
    : {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };

  const rows = await Lead.aggregate([
    {
      $match: mergeFilters(baseFilter, {
        ...createdAtMatch(start, end),
        status: { $in: REVENUE_STATUSES },
      }),
    },
    {
      $group: {
        _id: groupStage,
        value: { $sum: leadRevenueExpression() },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]).exec();

  return rows.map((row) => ({
    label: useMonthly
      ? new Date(row._id.year, row._id.month - 1, 1).toLocaleDateString(
          "en-IN",
          { month: "short" }
        )
      : String(row._id.day ?? ""),
    value: Number(row.value ?? 0),
  }));
}

export default {
  getDashboardSummary,
};
