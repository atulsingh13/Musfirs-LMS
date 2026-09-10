import axios from "axios";
import type { UserPermissions } from "@/lib/permissions";
import { api } from "@/services/api";

export type AdminUserStatus = "Active" | "Pending invite" | "Suspended";

export interface AdminUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  department?: string | null;
  workspace?: string[];
  status: AdminUserStatus;
  joinedDate?: string | null;
  avatarUrl?: string;
  phone?: string;
  employeeId?: string;
  isActive?: boolean;
  createdAt?: string;
  permissions?: UserPermissions;
}

export interface AdminUserDetail extends AdminUser {
  firstName?: string;
  lastName?: string;
  officialEmail?: string;
  personalEmail?: string;
  mobileNumber?: string;
  designation?: string;
  joiningDate?: string | null;
  workLocation?: string;
  probationPeriod?: string;
  employeeStatus?: string;
  ctc?: string;
  bankAccount?: string;
  ifsc?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  allocatedAssets?: string;
  gender?: string;
  dob?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string;
  maritalStatus?: string;
  languages?: string;
  alternatePhone?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  address?: string;
}

export interface AdminUsersFilters {
  search?: string;
  role?: string;
  team?: string;
  status?: string;
  workspace?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AdminUsersResponse {
  success: boolean;
  count: number;
  data: { users: AdminUser[] };
}

export interface AdminUserMutationResponse {
  success: boolean;
  message: string;
  data: { user: AdminUserDetail };
}

export interface AdminResetPasswordResponse {
  success: boolean;
  message: string;
  data: {
    user: AdminUser;
    temporaryPassword: string;
  };
}

export interface CheckEmployeeIdResponse {
  success: boolean;
  isUnique: boolean;
  message?: string;
}

export interface AddAdminUserInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  officialEmail?: string;
  work_email?: string;
  personalEmail?: string;
  personal_email?: string;
  password?: string;
  temporaryPassword?: string;
  role?: string;
  phone?: string;
  mobileNumber?: string;
  alternate_phone?: string;
  alternatePhone?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  gender?: string;
  dob?: string;
  dateOfBirth?: string;
  date_of_birth?: string;
  bloodGroup?: string;
  blood_group?: string;
  maritalStatus?: string;
  marital_status?: string;
  languages?: string | string[];
  address?: string;
  joiningDate?: string;
  date_of_joining?: string;
  employeeId?: string;
  employee_id?: string;
  status?: AdminUserStatus;
}

export interface UpdateAdminUserInput extends AddAdminUserInput {
  temporaryPassword?: string;
}

export interface AdminUserDetailResponse {
  success: boolean;
  data: { user: AdminUserDetail };
}

function normalizeUser(user: AdminUser | AdminUserDetail): AdminUserDetail {
  const id = user._id || user.id;
  return {
    ...user,
    _id: id,
    id,
  };
}

export async function fetchAdminUsers(
  filters: AdminUsersFilters = {}
): Promise<AdminUsersResponse> {
  const search = filters.search?.trim().replace(/\s+/g, " ") || undefined;

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (filters.role) params.role = filters.role;
  if (filters.status) params.status = filters.status;

  // Axios serializes this as GET /users?search=atul%20singh (spaces URL-encoded)
  const { data } = await api.get<AdminUsersResponse>("/users", { params });

  return {
    ...data,
    data: {
      users: data.data.users.map((user) => normalizeUser(user)),
    },
  };
}

export async function fetchAdminUserById(
  id: string
): Promise<AdminUserDetailResponse> {
  const { data } = await api.get<AdminUserDetailResponse>(`/users/${id}`);
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export async function addNewUser(
  payload: AddAdminUserInput
): Promise<AdminUserMutationResponse> {
  const { data } = await api.post<AdminUserMutationResponse>("/users", payload);
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export async function updateUserDetails(
  id: string,
  payload: UpdateAdminUserInput
): Promise<AdminUserMutationResponse> {
  const { data } = await api.put<AdminUserMutationResponse>(
    `/users/${id}`,
    payload
  );
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export async function changeUserStatus(
  id: string,
  status: AdminUserStatus
): Promise<AdminUserMutationResponse> {
  const { data } = await api.put<AdminUserMutationResponse>(
    `/users/${id}/status`,
    { status }
  );
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export async function updateUserPermissions(
  id: string,
  permissions: UserPermissions
): Promise<AdminUserMutationResponse> {
  const { data } = await api.put<AdminUserMutationResponse>(
    `/users/${id}/permissions`,
    { permissions }
  );
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export type PermissionChangeType = "Granted" | "Restricted";

export interface PermissionAuditActor {
  _id: string;
  first_name: string;
  last_name: string;
}

export interface PermissionAuditLog {
  _id: string;
  targetUser: string;
  changedBy: PermissionAuditActor | null;
  moduleName: string;
  action: string;
  changeType: PermissionChangeType;
  createdAt: string;
}

export interface PermissionLogsResponse {
  success: boolean;
  count: number;
  data: { logs: PermissionAuditLog[] };
}

export async function fetchPermissionLogs(
  userId: string
): Promise<PermissionLogsResponse> {
  const { data } = await api.get<PermissionLogsResponse>(
    `/users/${userId}/permission-logs`
  );
  return {
    success: data?.success ?? true,
    count: data?.count ?? data?.data?.logs?.length ?? 0,
    data: {
      logs: Array.isArray(data?.data?.logs) ? data.data.logs : [],
    },
  };
}

export async function deleteAdminUser(
  id: string
): Promise<AdminUserMutationResponse> {
  const { data } = await api.delete<AdminUserMutationResponse>(`/users/${id}`);
  return {
    ...data,
    data: { user: normalizeUser(data.data.user) },
  };
}

export async function adminResetPassword(
  id: string
): Promise<AdminResetPasswordResponse> {
  const temporaryPassword = `Temp@${Math.random().toString(36).slice(2, 8)}`;
  const { data } = await api.put<AdminUserMutationResponse>(`/users/${id}`, {
    temporaryPassword,
  });
  return {
    success: true,
    message: "Temporary password generated.",
    data: {
      user: normalizeUser(data.data.user),
      temporaryPassword,
    },
  };
}

export async function checkEmployeeId(
  employeeId: string,
  excludeUserId?: string
): Promise<CheckEmployeeIdResponse> {
  const { data } = await api.get<CheckEmployeeIdResponse>(
    "/users/check-employee-id",
    {
      params: {
        employeeId,
        excludeUserId,
      },
    }
  );
  return data;
}

/** @deprecated Use checkEmployeeId instead */
export const checkEmployeeIdUnique = checkEmployeeId;

export function getAdminUsersErrorMessage(
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
