import type { UserPermissions } from "./permissions.js";

export type UserRole =
  | "Owner"
  | "Administrator"
  | "Manager"
  | "HR"
  | "Staff"
  | "Employee";

export const USER_ROLES: UserRole[] = [
  "Owner",
  "Administrator",
  "Manager",
  "HR",
  "Staff",
  "Employee",
];

export const OWNER_ROLES: UserRole[] = ["Owner", "Administrator"];

export const USER_STATUSES = [
  "Active",
  "Pending invite",
  "Suspended",
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  status: string;
  mustChangePassword: boolean;
  permissions?: UserPermissions;
  createdAt?: Date | string;
}
