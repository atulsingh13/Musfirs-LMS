import { Types } from "mongoose";
import { User, type IUser } from "../models/User.js";
import {
  normalizeUserPermissions,
  type UserPermissions,
} from "../types/permissions.js";
import type { PublicUser } from "../types/user.js";

export type LeanAuthUser = {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  work_email: string;
  password_hash: string;
  role: string;
  status?: string;
  failedLoginAttempts?: number;
  resetRequestCount?: number;
  firstResetRequestDate?: Date | null;
  employee_id?: string;
  permissions?: UserPermissions;
  must_change_password?: boolean;
  createdAt?: Date;
};

const AUTH_PUBLIC_FIELDS =
  "_id first_name last_name work_email role status failedLoginAttempts resetRequestCount firstResetRequestDate employee_id permissions must_change_password createdAt";

export async function findUserByEmail(
  email: string
): Promise<LeanAuthUser | null> {
  return User.findOne({ work_email: email.toLowerCase() })
    .select(`+password_hash ${AUTH_PUBLIC_FIELDS}`)
    .lean<LeanAuthUser>()
    .exec();
}

export async function findUserById(
  id: string
): Promise<Omit<LeanAuthUser, "password_hash"> | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return User.findById(id)
    .select(AUTH_PUBLIC_FIELDS)
    .lean<Omit<LeanAuthUser, "password_hash">>()
    .exec();
}

function displayName(user: {
  first_name?: string;
  last_name?: string;
}): string {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
}

/** Shape DB user for API auth responses (never include password_hash). */
export function toPublicUser(
  user: Pick<
    LeanAuthUser,
    | "_id"
    | "first_name"
    | "last_name"
    | "work_email"
    | "role"
    | "employee_id"
    | "status"
    | "permissions"
    | "must_change_password"
    | "createdAt"
  >
): PublicUser {
  const id = String(user._id);
  const status = user.status || "Active";
  const mustChangePassword =
    user.must_change_password === true || status === "Pending invite";

  return {
    _id: id,
    name: displayName(user),
    email: user.work_email,
    role: user.role,
    employeeId:
      user.employee_id || `USR${id.slice(-4).toUpperCase()}`,
    status,
    mustChangePassword,
    permissions: normalizeUserPermissions(
      user.permissions,
      String(user.role)
    ),
    createdAt: user.createdAt,
  };
}

export type { IUser };

export default {
  findUserByEmail,
  findUserById,
  toPublicUser,
};
