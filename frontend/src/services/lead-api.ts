import axios from "axios";
import { api } from "@/services/api";

export type LeadSourcePreset =
  | "Meta"
  | "Website"
  | "Referral"
  | "Google"
  | "Others"
  | "Meta Ads"
  | "Google Ads";

/** Preset or custom lead source saved on the lead record. */
export type LeadSource = LeadSourcePreset | string;

export type LeadGender = "Male" | "Female" | "Other";

export type LeadStatus =
  | "New Lead"
  | "Qualification Pending"
  | "Qualified"
  | "Plan Shared"
  | "Hot / Payment Pending"
  | "Payment Pending"
  | "Advance Paid"
  | "Booked"
  | "Follow-up Later"
  | "Not Interested"
  | "Not Qualified"
  | "Closed"
  | "Travel Completed";

export interface LeadUserRef {
  _id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

export interface ApiLead {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  age: number;
  gender: LeadGender;
  destination: string;
  numberOfPax: number;
  pax?: number;
  contactNumber: string;
  dateOfTravel: string;
  email: string;
  city: string;
  leadSource: LeadSource;
  source?: LeadSource;
  campaign: string;
  status: LeadStatus;
  nextFollowUp?: string | null;
  isFollowUpCompleted?: boolean;
  assignedTo?: LeadUserRef | null;
  assignedToName?: string;
  createdBy?: LeadUserRef | null;
  statusUpdatedBy?: LeadUserRef | null;
  statusUpdatedByName?: string;
  statusUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadInput {
  name: string;
  firstName?: string;
  lastName?: string;
  age: number;
  gender: LeadGender;
  destination: string;
  numberOfPax: number;
  pax?: number;
  contactNumber: string;
  dateOfTravel: string;
  email: string;
  city: string;
  leadSource?: LeadSource;
  source?: LeadSource;
  campaign: string;
  status?: LeadStatus;
  nextFollowUp?: string | null;
}

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  isFollowUpCompleted?: boolean;
};

export interface LeadStats {
  totalLeads: number;
  newLeadsThisMonth: number;
  newThisMonth?: number;
  inProgress: number;
  dealWon: number;
  booked?: number;
  lostLeads: number;
  closedLeads?: number;
}

export interface LeadPagination {
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

export interface LeadsResponse {
  success: boolean;
  count: number;
  leads?: ApiLead[];
  total?: number;
  pages?: number;
  currentPage?: number;
  stats?: LeadStats;
  data: {
    leads: ApiLead[];
    pagination?: LeadPagination;
    stats?: LeadStats;
  };
}

export interface LeadStatsResponse {
  success: boolean;
  data: { stats: LeadStats };
}

export interface LeadMutationResponse {
  success: boolean;
  message: string;
  data: { lead: ApiLead };
}

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  leadSource?: string;
  startDate?: string;
  endDate?: string;
  travelDate?: string;
  destination?: string;
  numberOfPax?: string;
  followUpsDueToday?: boolean;
  createdToday?: boolean;
}

export const LEAD_SOURCE_SELECT_OPTIONS: LeadSourcePreset[] = [
  "Meta",
  "Website",
  "Referral",
  "Google",
  "Others",
];

/** Includes presets for filters; legacy values may still appear in stored leads. */
export const LEAD_SOURCE_OPTIONS: LeadSource[] = [
  ...LEAD_SOURCE_SELECT_OPTIONS,
];

export const LEAD_GENDER_OPTIONS: LeadGender[] = ["Male", "Female", "Other"];

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  "New Lead",
  "Qualification Pending",
  "Qualified",
  "Plan Shared",
  "Hot / Payment Pending",
  "Payment Pending",
  "Advance Paid",
  "Booked",
  "Follow-up Later",
  "Not Interested",
  "Not Qualified",
  "Closed",
  "Travel Completed",
];

export const LEAD_ACTIVE_STATUSES: LeadStatus[] = [
  "Qualification Pending",
  "Qualified",
  "Plan Shared",
  "Hot / Payment Pending",
  "Payment Pending",
  "Advance Paid",
  "Follow-up Later",
];

export const LEAD_BOOKED_STATUSES: LeadStatus[] = [
  "Booked",
  "Travel Completed",
];

export const LEAD_CLOSED_STATUSES: LeadStatus[] = [
  "Not Interested",
  "Not Qualified",
  "Closed",
];

function normalizeUserRef(
  user?: LeadUserRef | null
): LeadUserRef | null {
  if (!user) return null;
  const firstName = user.first_name ?? "";
  const lastName = user.last_name ?? "";
  const name =
    user.name ||
    `${firstName} ${lastName}`.trim() ||
    "—";
  return {
    _id: user._id,
    first_name: firstName,
    last_name: lastName,
    name,
  };
}

function normalizeLead(lead: ApiLead): ApiLead {
  const source = (lead.leadSource || lead.source || "Website") as LeadSource;
  const assignedTo = normalizeUserRef(lead.assignedTo);
  const statusUpdatedBy = normalizeUserRef(lead.statusUpdatedBy);
  const createdBy = normalizeUserRef(lead.createdBy);

  return {
    ...lead,
    name:
      lead.name ||
      `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() ||
      "—",
    numberOfPax: lead.numberOfPax ?? lead.pax ?? 1,
    leadSource: source,
    source,
    assignedTo,
    assignedToName:
      lead.assignedToName ||
      assignedTo?.name ||
      "—",
    createdBy,
    statusUpdatedBy,
    statusUpdatedByName:
      lead.statusUpdatedByName ||
      statusUpdatedBy?.name ||
      "—",
  };
}

export async function getAllLeads(
  params: GetLeadsParams = {}
): Promise<LeadsResponse> {
  const search = params.search?.trim().replace(/\s+/g, " ") || undefined;

  const { data } = await api.get<LeadsResponse>("/leads", {
    params: {
      page: params.page,
      limit: params.limit,
      search,
      status: params.status,
      source: params.source || params.leadSource,
      leadSource: params.leadSource || params.source,
      startDate: params.startDate,
      endDate: params.endDate,
      travelDate: params.travelDate,
      destination: params.destination,
      numberOfPax: params.numberOfPax,
      followUpsDueToday: params.followUpsDueToday ? "true" : undefined,
      followUp: params.followUpsDueToday ? "today" : undefined,
      created: params.createdToday ? "today" : undefined,
    },
  });

  const leads = (data.data?.leads ?? data.leads ?? []).map(normalizeLead);

  return {
    ...data,
    data: {
      ...data.data,
      leads,
      pagination: data.data?.pagination,
    },
  };
}

export async function getLeadById(id: string): Promise<LeadMutationResponse> {
  const { data } = await api.get<LeadMutationResponse>(`/leads/${id}`);
  return {
    ...data,
    data: { lead: normalizeLead(data.data.lead) },
  };
}

export async function getLeadStats(): Promise<LeadStatsResponse> {
  const { data } = await api.get<LeadStatsResponse>("/leads/stats");
  const stats = data.data?.stats ?? {
    totalLeads: 0,
    newLeadsThisMonth: 0,
    inProgress: 0,
    dealWon: 0,
    lostLeads: 0,
  };

  return {
    success: data.success,
    data: {
      stats: {
        totalLeads: stats.totalLeads ?? 0,
        newLeadsThisMonth:
          stats.newLeadsThisMonth ?? stats.newThisMonth ?? 0,
        newThisMonth: stats.newThisMonth ?? stats.newLeadsThisMonth ?? 0,
        inProgress: stats.inProgress ?? 0,
        dealWon: stats.dealWon ?? stats.booked ?? 0,
        booked: stats.booked ?? stats.dealWon ?? 0,
        lostLeads: stats.lostLeads ?? stats.closedLeads ?? 0,
        closedLeads: stats.closedLeads ?? stats.lostLeads ?? 0,
      },
    },
  };
}

export async function createLead(
  payload: CreateLeadInput
): Promise<LeadMutationResponse> {
  const { data } = await api.post<LeadMutationResponse>("/leads", {
    ...payload,
    pax: payload.pax ?? payload.numberOfPax,
    leadSource: payload.leadSource || payload.source,
  });

  return {
    ...data,
    data: { lead: normalizeLead(data.data.lead) },
  };
}

export async function updateLead(
  id: string,
  payload: UpdateLeadInput
): Promise<LeadMutationResponse> {
  const { data } = await api.put<LeadMutationResponse>(`/leads/${id}`, {
    ...payload,
    pax: payload.pax ?? payload.numberOfPax,
    leadSource: payload.leadSource || payload.source,
  });

  return {
    ...data,
    data: { lead: normalizeLead(data.data.lead) },
  };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<LeadMutationResponse> {
  const { data } = await api.put<LeadMutationResponse>(`/leads/${id}/status`, {
    status,
  });

  return {
    ...data,
    data: { lead: normalizeLead(data.data.lead) },
  };
}

export async function assignLead(
  id: string,
  assignedTo: string
): Promise<LeadMutationResponse> {
  const { data } = await api.put<LeadMutationResponse>(`/leads/${id}/assign`, {
    assignedTo,
  });

  return {
    ...data,
    data: { lead: normalizeLead(data.data.lead) },
  };
}

export interface BulkLeadMutationResponse {
  success: boolean;
  message: string;
  data: {
    matched: number;
    modified: number;
    status?: LeadStatus;
    assignedTo?: string;
  };
}

export async function bulkUpdateLeadStatus(
  leadIds: string[],
  status: LeadStatus
): Promise<BulkLeadMutationResponse> {
  const { data } = await api.put<BulkLeadMutationResponse>(
    "/leads/bulk/status",
    { leadIds, status }
  );
  return data;
}

export async function bulkAssignLeads(
  leadIds: string[],
  assignedTo: string
): Promise<BulkLeadMutationResponse> {
  const { data } = await api.put<BulkLeadMutationResponse>(
    "/leads/bulk/assign",
    { leadIds, assignedTo }
  );
  return data;
}

export async function updateLeadFollowUp(
  id: string,
  nextFollowUp: string
): Promise<LeadMutationResponse> {
  return updateLead(id, { nextFollowUp });
}

export async function markLeadFollowUpDone(
  id: string
): Promise<LeadMutationResponse> {
  return updateLead(id, { isFollowUpCompleted: true });
}

export interface BulkImportLeadInput {
  name: string;
  contactNumber: string;
  destination: string;
  email?: string;
  numberOfPax?: number;
  pax?: number;
  leadSource?: string;
  source?: string;
  city?: string;
  dateOfTravel?: string;
  campaign?: string;
}

export interface BulkImportResponse {
  success: boolean;
  message?: string;
  data: {
    imported: number;
    skipped: number;
  };
}

export async function bulkImportLeads(
  leads: BulkImportLeadInput[]
): Promise<BulkImportResponse> {
  const { data } = await api.post<BulkImportResponse>("/leads/bulk-import", {
    leads,
  });
  return data;
}

export async function downloadLeadQuotation(leadId: string): Promise<Blob> {
  try {
    const response = await api.get<Blob>(`/leads/${leadId}/quotation`, {
      responseType: "blob",
    });
    const blob = response.data;
    if (blob.type?.includes("application/json")) {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { message?: string };
      throw new Error(parsed.message ?? "Failed to generate PDF");
    }
    return blob;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message ?? "Failed to generate PDF");
      } catch {
        throw new Error(getLeadErrorMessage(error, "Failed to generate PDF"));
      }
    }
    if (error instanceof Error) throw error;
    throw new Error(getLeadErrorMessage(error, "Failed to generate PDF"));
  }
}

export function getLeadErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function formatLeadUserName(user?: LeadUserRef | null): string {
  if (!user) return "—";
  if (user.name && user.name !== "—") return user.name;
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return full || "—";
}

export function formatLeadDateLabel(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
