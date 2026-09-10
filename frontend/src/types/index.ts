// ─── User Roles & RBAC ───────────────────────────────────────────────────────

export type UserRole =
  | "administrator"
  | "manager"
  | "hr"
  | "employee"
  | "client";

export type Department =
  | "design"
  | "development"
  | "marketing"
  | "social_media_marketing"
  | "sales"
  | "operations"
  | "hr";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  design: "Design",
  development: "Development",
  marketing: "Marketing",
  social_media_marketing: "Social Media & Digital Marketing",
  sales: "Sales",
  operations: "Operations",
  hr: "Human Resources",
};

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department?: Department | null;
  role: UserRole;
  joiningDate: string;
  status: "active" | "inactive" | "suspended";
  profilePhoto?: string;
}

// ─── HR: Attendance & Leave ──────────────────────────────────────────────────

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "leave";

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  department?: Department | null;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  markedById?: string;
  notes?: string;
}

export type LeaveType = "sick" | "casual" | "earned" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  applicantRole: UserRole;
  department?: Department | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ─── Complaints & Grievances ─────────────────────────────────────────────────

export type ComplaintEscalation = "hr" | "owner";
export type ComplaintStatus = "pending" | "under_review" | "resolved";

export interface Complaint {
  id: string;
  raisedById: string;
  raisedByName: string;
  raisedByRole: UserRole;
  againstId: string;
  againstName: string;
  againstRole: UserRole;
  escalateTo: ComplaintEscalation;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface ComplaintTarget {
  id: string;
  name: string;
  role: UserRole;
}

// ─── Expense Claims ────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "office_supplies"
  | "travel"
  | "meals"
  | "software"
  | "other";

export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface ExpenseClaim {
  id: string;
  claimedById: string;
  claimedByName: string;
  claimedByRole: UserRole;
  title: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: string;
  description: string;
  receiptFileName?: string;
  status: ExpenseStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ─── Lead Management (CRM) ───────────────────────────────────────────────────

export type LeadSource =
  | "website"
  | "facebook"
  | "instagram"
  | "google_ads"
  | "whatsapp"
  | "referral"
  | "manual";

export type LeadStatus =
  | "new"
  | "contacted"
  | "follow_up"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  service: string;
  leadSource: LeadSource;
  assignedUser?: string;
  leadValue: number;
  status: LeadStatus;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineStage =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface PipelineDeal {
  id: string;
  title: string;
  client: string;
  amount: number;
  stage: PipelineStage;
  assignedTo: string;
  expectedCloseDate?: string;
  probability?: number;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  clientName: string;
  company: string;
  phone: string;
  email: string;
  gst?: string;
  address?: string;
  createdAt: string;
}

// ─── Follow-up & Meeting ─────────────────────────────────────────────────────

export type FollowUpChannel =
  | "call"
  | "whatsapp"
  | "email"
  | "meeting"
  | "video_call";

export interface FollowUp {
  id: string;
  leadId: string;
  channel: FollowUpChannel;
  scheduledAt: string;
  outcome?: string;
  nextFollowUp?: string;
  assignedTo: string;
}

export interface Meeting {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  assignedTo: string;
}

// ─── Proposals & Deals ───────────────────────────────────────────────────────

export interface Proposal {
  id: string;
  clientId: string;
  services: string[];
  price: number;
  gst: number;
  discount?: number;
  terms?: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  createdAt: string;
}

export interface Deal {
  id: string;
  dealName: string;
  clientId: string;
  amount: number;
  salesPerson: string;
  stage: PipelineStage;
  closingDate?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  todaysFollowUps: number;
  todaysMeetings: number;
  wonDeals: number;
  lostDeals: number;
  revenue: number;
  employees: number;
}

export interface LeadSourceMetric {
  source: LeadSource;
  count: number;
  fill: string;
}

export interface ActivityItem {
  id: string;
  type: "lead" | "meeting" | "proposal" | "deal" | "task" | "leave";
  message: string;
  timestamp: string;
}
