import axios from "axios";
import { api } from "@/services/api";
import type { ApiUser } from "@/services/auth-api";

export interface ApiUserRef {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  designation?: string;
  department?: string | null;
  profilePicture?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface UsersResponse {
  success: boolean;
  count: number;
  data: { users: ApiUserRef[] };
}

export interface UserMutationResponse {
  success: boolean;
  message: string;
  data: { user: ApiUserRef };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  department?: string | null;
}

export interface UpdateProfileInput {
  name: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  profilePicture?: File;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileMutationResponse {
  success: boolean;
  message: string;
  data: { user: ApiUser };
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data?: { user: ApiUser };
}

const API_ORIGIN =
  (import.meta.env.VITE_API_URL ?? "http://localhost:5000/api").replace(
    /\/api\/?$/,
    ""
  );

export function getProfilePictureUrl(
  profilePicture?: string | null
): string | null {
  if (!profilePicture) return null;
  if (
    profilePicture.startsWith("http://") ||
    profilePicture.startsWith("https://") ||
    profilePicture.startsWith("blob:")
  ) {
    return profilePicture;
  }
  return `${API_ORIGIN}${profilePicture}`;
}

export async function updateUserProfile(
  formData: FormData
): Promise<ProfileMutationResponse> {
  const { data } = await api.put<ProfileMutationResponse>(
    "/users/profile",
    formData
  );
  return data;
}

export async function changeUserPassword(
  payload: ChangePasswordInput
): Promise<ChangePasswordResponse> {
  const { data } = await api.put<ChangePasswordResponse>(
    "/users/profile/password",
    payload
  );
  return data;
}

export async function getUsersByRole(
  role: string,
  options?: { includeInactive?: boolean }
): Promise<UsersResponse> {
  const { data } = await api.get<UsersResponse>("/users", {
    params: {
      role,
      ...(options?.includeInactive ? { includeInactive: "true" } : {}),
    },
  });
  return data;
}

export async function getAllUsers(): Promise<UsersResponse> {
  const { data } = await api.get<UsersResponse>("/users");
  return data;
}

export async function getBDEs(
  options?: { includeInactive?: boolean }
): Promise<UsersResponse> {
  return getUsersByRole("BDE", options);
}

export async function getEmployeesByDepartment(
  department: string,
  options?: { includeInactive?: boolean }
): Promise<UsersResponse> {
  const { data } = await api.get<UsersResponse>("/users", {
    params: {
      role: "Employee",
      department,
      ...(options?.includeInactive ? { includeInactive: "true" } : {}),
    },
  });
  return data;
}

export async function createUser(
  payload: CreateUserInput
): Promise<UserMutationResponse> {
  const { data } = await api.post<UserMutationResponse>("/users", payload);
  return data;
}

export function getUsersErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
