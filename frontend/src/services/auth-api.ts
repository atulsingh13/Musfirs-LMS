import type { Department, UserRole } from "@/types";
import { DEPARTMENT_LABELS } from "@/types";
import type { UserPermissions } from "@/lib/permissions";
import { api } from "@/services/api";
import type { AuthUser } from "@/lib/auth-store";

/** User document shape returned by the Express API */
export interface ApiUser {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  officialEmail?: string;
  personalEmail?: string;
  phone?: string;
  mobileNumber?: string;
  emergencyContact?: string;
  profilePicture?: string;
  dob?: string | null;
  gender?: string;
  address?: string;
  timezone?: string;
  employeeId?: string;
  designation?: string;
  joiningDate?: string | null;
  ctc?: string;
  salary?: number | null;
  bankAccount?: string;
  ifsc?: string;
  bankDetails?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  allocatedAssets?: string;
  role: string;
  department?: string | null;
  isActive?: boolean;
  status?: string;
  mustChangePassword?: boolean;
  permissions?: UserPermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data: {
    user: ApiUser;
    accessToken: string;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

export interface MeApiResponse {
  success: boolean;
  data: {
    user: ApiUser;
  };
}

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  Owner: "administrator",
  Administrator: "administrator",
  HR: "hr",
  Manager: "manager",
  Staff: "employee",
  Employee: "employee",
};

const FRONTEND_TO_BACKEND_ROLE: Partial<Record<UserRole, string>> = {
  administrator: "Owner",
  hr: "HR",
  manager: "Manager",
  employee: "Staff",
};

const DEPARTMENT_FROM_API: Record<string, Department> = {
  design: "design",
  development: "development",
  marketing: "marketing",
  sales: "sales",
  operations: "operations",
  hr: "hr",
  "human resources": "hr",
  "social media marketing": "social_media_marketing",
  "social media & digital marketing": "social_media_marketing",
};

export function mapApiRoleToFrontend(role: string): UserRole {
  return BACKEND_TO_FRONTEND_ROLE[role] ?? "employee";
}

export function mapFrontendRoleToApi(role: UserRole): string | null {
  return FRONTEND_TO_BACKEND_ROLE[role] ?? null;
}

function mapApiDepartment(department?: string | null): Department | null {
  if (!department) return null;
  const key = department.trim().toLowerCase();
  return DEPARTMENT_FROM_API[key] ?? null;
}

export function mapApiUserToAuthUser(apiUser: ApiUser): AuthUser {
  const role = mapApiRoleToFrontend(apiUser.role);
  const firstName =
    apiUser.firstName?.trim() ||
    apiUser.name?.trim().split(/\s+/)[0] ||
    "";
  const lastName =
    apiUser.lastName?.trim() ||
    apiUser.name?.trim().split(/\s+/).slice(1).join(" ") ||
    "";

  return {
    id: apiUser._id,
    name: apiUser.name,
    firstName,
    lastName,
    email: apiUser.email,
    officialEmail: apiUser.officialEmail || apiUser.email,
    personalEmail: apiUser.personalEmail ?? "",
    phone: apiUser.phone || apiUser.mobileNumber || "",
    mobileNumber: apiUser.mobileNumber || apiUser.phone || "",
    emergencyContact: apiUser.emergencyContact ?? "",
    profilePicture: apiUser.profilePicture ?? "",
    dob: apiUser.dob ?? null,
    gender: apiUser.gender ?? "",
    address: apiUser.address ?? "",
    timezone: apiUser.timezone ?? "Asia/Kolkata",
    employeeId:
      apiUser.employeeId?.trim() ||
      apiUser._id.slice(-8).toUpperCase(),
    designation: apiUser.designation ?? "",
    joiningDate: apiUser.joiningDate ?? null,
    ctc: apiUser.ctc ?? "",
    salary: apiUser.salary ?? null,
    bankAccount: apiUser.bankAccount ?? "",
    ifsc: apiUser.ifsc ?? "",
    bankDetails: apiUser.bankDetails ?? "",
    panNumber: apiUser.panNumber ?? "",
    aadhaarNumber: apiUser.aadhaarNumber ?? "",
    allocatedAssets: apiUser.allocatedAssets ?? "",
    role,
    department: mapApiDepartment(apiUser.department),
    departmentName: apiUser.department?.trim() || null,
    status:
      apiUser.status === "Active" ||
      apiUser.status === "Pending invite" ||
      apiUser.status === "Suspended"
        ? apiUser.status
        : apiUser.mustChangePassword
          ? "Pending invite"
          : "Active",
    mustChangePassword: apiUser.mustChangePassword ?? false,
    // Only trust explicit server permissions — never invent grants on the client
    permissions: apiUser.permissions,
  };
}

export function mapDepartmentToApi(
  department: Department | null | undefined
): string | null {
  if (!department) return null;
  return DEPARTMENT_LABELS[department];
}

export async function loginApi(email: string, password: string) {
  const { data } = await api.post<AuthApiResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function refreshTokenApi() {
  const { data } = await api.post<RefreshTokenResponse>("/auth/refresh-token");
  return data;
}

export async function logoutApi() {
  const { data } = await api.post<{ success: boolean; message: string }>(
    "/auth/logout"
  );
  return data;
}

export async function forgotPasswordApi(email: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    "/auth/forgot-password",
    { email }
  );
  return data;
}

export async function registerApi(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Department | null;
}) {
  const backendRole = mapFrontendRoleToApi(input.role);
  if (!backendRole) {
    throw new Error("This role cannot be registered through the API.");
  }

  const { data } = await api.post<AuthApiResponse>("/auth/register", {
    name: input.name,
    email: input.email,
    password: input.password,
    role: backendRole,
    department: mapDepartmentToApi(input.department),
  });
  return data;
}
