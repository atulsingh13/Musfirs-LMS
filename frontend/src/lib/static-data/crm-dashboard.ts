export type CrmTrendDirection = "up" | "down";

export interface CrmKpiMetric {
  id: string;
  title: string;
  value: string;
  changePercent: number;
  trend: CrmTrendDirection;
  icon:
    | "users"
    | "userPlus"
    | "phone"
    | "badgeCheck"
    | "share"
    | "clock"
    | "wallet"
    | "calendarCheck"
    | "plane"
    | "rupee";
  accent: string;
  sparkline: number[];
}

export interface CrmPipelineStage {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface CrmChartPoint {
  label: string;
  value: number;
}

export interface CrmSalesCategory {
  name: string;
  value: number;
  color: string;
}

export interface CrmStaffRow {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  leads: number;
  booked: number;
  revenue: number;
}

export interface CrmActivityItem {
  id: string;
  title: string;
  timeAgo: string;
  tone: "lead" | "payment" | "booking" | "call" | "plan";
}

export const CRM_KPI_METRICS: CrmKpiMetric[] = [
  {
    id: "total-leads",
    title: "Total Leads",
    value: "1,248",
    changePercent: 18.6,
    trend: "up",
    icon: "users",
    accent: "#3B82F6",
    sparkline: [42, 48, 45, 52, 58, 55, 62, 70, 68, 74, 80, 78],
  },
  {
    id: "new-today",
    title: "New Today",
    value: "36",
    changePercent: 12.4,
    trend: "up",
    icon: "userPlus",
    accent: "#22C55E",
    sparkline: [12, 14, 11, 16, 18, 15, 20, 22, 19, 24, 28, 36],
  },
  {
    id: "calls-due",
    title: "Calls Due Today",
    value: "28",
    changePercent: 5.2,
    trend: "down",
    icon: "phone",
    accent: "#F97316",
    sparkline: [34, 32, 30, 33, 31, 29, 28, 30, 27, 26, 29, 28],
  },
  {
    id: "qualified",
    title: "Qualified",
    value: "186",
    changePercent: 14.8,
    trend: "up",
    icon: "badgeCheck",
    accent: "#0EA5E9",
    sparkline: [90, 95, 100, 110, 120, 125, 140, 150, 160, 170, 180, 186],
  },
  {
    id: "plan-shared",
    title: "Plan Shared",
    value: "142",
    changePercent: 11.3,
    trend: "up",
    icon: "share",
    accent: "#A855F7",
    sparkline: [70, 75, 80, 88, 92, 100, 110, 118, 125, 132, 138, 142],
  },
  {
    id: "payment-pending",
    title: "Payment Pending",
    value: "64",
    changePercent: 8.1,
    trend: "down",
    icon: "clock",
    accent: "#EAB308",
    sparkline: [80, 78, 74, 72, 70, 68, 66, 65, 67, 66, 65, 64],
  },
  {
    id: "advance-paid",
    title: "Advance Paid",
    value: "88",
    changePercent: 16.7,
    trend: "up",
    icon: "wallet",
    accent: "#84CC16",
    sparkline: [40, 45, 48, 52, 55, 60, 65, 70, 74, 78, 84, 88],
  },
  {
    id: "booked",
    title: "Booked",
    value: "112",
    changePercent: 9.5,
    trend: "up",
    icon: "calendarCheck",
    accent: "#2563EB",
    sparkline: [60, 65, 70, 74, 78, 82, 88, 92, 98, 104, 108, 112],
  },
  {
    id: "travel-completed",
    title: "Travel Completed",
    value: "94",
    changePercent: 13.2,
    trend: "up",
    icon: "plane",
    accent: "#6366F1",
    sparkline: [40, 45, 50, 55, 58, 62, 68, 74, 80, 85, 90, 94],
  },
  {
    id: "revenue",
    title: "Revenue",
    value: "₹ 24,58,000",
    changePercent: 22.5,
    trend: "up",
    icon: "rupee",
    accent: "#16A34A",
    sparkline: [12, 14, 15, 16, 18, 17, 19, 21, 20, 22, 23, 25],
  },
];

export const CRM_PIPELINE_STAGES: CrmPipelineStage[] = [
  { label: "Leads", value: 1248, percent: 100, color: "#7C3AED" },
  { label: "Qualified", value: 186, percent: 14.9, color: "#8B5CF6" },
  { label: "Plan Shared", value: 142, percent: 11.4, color: "#A78BFA" },
  { label: "Booked", value: 112, percent: 9.0, color: "#C4B5FD" },
  { label: "Travel Completed", value: 94, percent: 7.5, color: "#DDD6FE" },
];

export const CRM_LEADS_OVERVIEW: CrmChartPoint[] = [
  { label: "1", value: 28 },
  { label: "3", value: 34 },
  { label: "5", value: 30 },
  { label: "7", value: 42 },
  { label: "9", value: 38 },
  { label: "11", value: 48 },
  { label: "13", value: 45 },
  { label: "15", value: 56 },
  { label: "17", value: 52 },
  { label: "19", value: 61 },
  { label: "21", value: 58 },
  { label: "23", value: 70 },
  { label: "25", value: 66 },
  { label: "27", value: 74 },
  { label: "29", value: 68 },
  { label: "31", value: 72 },
];

export const CRM_REVENUE_OVERVIEW: CrmChartPoint[] = [
  { label: "1", value: 42 },
  { label: "3", value: 55 },
  { label: "5", value: 38 },
  { label: "7", value: 72 },
  { label: "9", value: 48 },
  { label: "11", value: 64 },
  { label: "13", value: 90 },
  { label: "15", value: 58 },
  { label: "17", value: 76 },
  { label: "19", value: 50 },
  { label: "21", value: 84 },
  { label: "23", value: 62 },
  { label: "25", value: 96 },
  { label: "27", value: 70 },
  { label: "29", value: 88 },
  { label: "31", value: 78 },
];

export const CRM_SALES_PERFORMANCE: CrmSalesCategory[] = [
  { name: "Flights", value: 34, color: "#7C3AED" },
  { name: "Hotels", value: 26, color: "#3B82F6" },
  { name: "Packages", value: 24, color: "#38BDF8" },
  { name: "Visa", value: 9, color: "#EAB308" },
  { name: "Others", value: 7, color: "#F97316" },
];

export const CRM_TOP_STAFF: CrmStaffRow[] = [
  {
    id: "1",
    name: "Rahul Sharma",
    initials: "RS",
    avatarColor: "#3B82F6",
    leads: 148,
    booked: 32,
    revenue: 485000,
  },
  {
    id: "2",
    name: "Priya Singh",
    initials: "PS",
    avatarColor: "#A855F7",
    leads: 132,
    booked: 28,
    revenue: 412000,
  },
  {
    id: "3",
    name: "Vikram Kumar",
    initials: "VK",
    avatarColor: "#22C55E",
    leads: 121,
    booked: 24,
    revenue: 368000,
  },
  {
    id: "4",
    name: "Ananya Patel",
    initials: "AP",
    avatarColor: "#F97316",
    leads: 110,
    booked: 21,
    revenue: 325000,
  },
  {
    id: "5",
    name: "Suresh Mehta",
    initials: "SM",
    avatarColor: "#6366F1",
    leads: 98,
    booked: 18,
    revenue: 278000,
  },
];

export const CRM_RECENT_ACTIVITIES: CrmActivityItem[] = [
  {
    id: "1",
    title: "New lead received from Rahul Verma for Bali package",
    timeAgo: "2 mins ago",
    tone: "lead",
  },
  {
    id: "2",
    title: "Advance payment received for Dubai trip — Priya Nair",
    timeAgo: "18 mins ago",
    tone: "payment",
  },
  {
    id: "3",
    title: "Itinerary shared with Meera Joshi (Maldives honeymoon)",
    timeAgo: "45 mins ago",
    tone: "plan",
  },
  {
    id: "4",
    title: "Booking confirmed for Arjun Patel — Goa family trip",
    timeAgo: "1 hour ago",
    tone: "booking",
  },
  {
    id: "5",
    title: "Follow-up call completed with Vikram Singh",
    timeAgo: "2 hours ago",
    tone: "call",
  },
  {
    id: "6",
    title: "Lead qualified: Neha Kapoor — Singapore enquiry",
    timeAgo: "3 hours ago",
    tone: "lead",
  },
];

export const CRM_DATE_RANGE_LABEL = "May 1 – May 31, 2025";
export const CRM_REVENUE_TOTAL_LABEL = "₹ 24,58,000";
export const CRM_REVENUE_CENTER_LABEL = "₹ 24.58L";
