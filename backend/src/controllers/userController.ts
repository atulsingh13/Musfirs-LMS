import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { toPublicUser } from "../repositories/user.repository.js";
import { notifyOwnersOfPasswordReset } from "../services/security.service.js";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  defaultPermissionsForRole,
  normalizeUserPermissions,
  type PermissionAction,
  type PermissionModule,
  type UserPermissions,
} from "../types/permissions.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Normalize/validate a permissions payload from the admin UI. */
function sanitizePermissions(input: unknown): UserPermissions {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Permissions object is required", 400);
  }

  const raw = input as Record<string, unknown>;
  const sanitized = {} as UserPermissions;

  for (const moduleName of PERMISSION_MODULES) {
    const moduleRaw = raw[moduleName];
    if (!moduleRaw || typeof moduleRaw !== "object" || Array.isArray(moduleRaw)) {
      throw new AppError(
        `Permissions for module "${moduleName}" are required`,
        400
      );
    }

    const flags = moduleRaw as Record<string, unknown>;
    const moduleFlags = {} as UserPermissions[PermissionModule];

    for (const action of PERMISSION_ACTIONS) {
      const value = flags[action];
      if (typeof value !== "boolean") {
        throw new AppError(
          `Permission "${moduleName}.${action}" must be a boolean`,
          400
        );
      }
      moduleFlags[action as PermissionAction] = value;
    }

    sanitized[moduleName] = moduleFlags;
  }

  return sanitized;
}

function buildPermissionAuditLogs(
  targetUserId: string,
  changedById: string,
  previous: UserPermissions,
  next: UserPermissions
) {
  const entries: Array<{
    targetUser: Types.ObjectId;
    changedBy: Types.ObjectId;
    moduleName: PermissionModule;
    action: PermissionAction;
    changeType: "Granted" | "Restricted";
  }> = [];

  for (const moduleName of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      const oldValue = previous[moduleName][action];
      const newValue = next[moduleName][action];
      if (oldValue === newValue) continue;

      entries.push({
        targetUser: new Types.ObjectId(targetUserId),
        changedBy: new Types.ObjectId(changedById),
        moduleName,
        action,
        changeType: newValue ? "Granted" : "Restricted",
      });
    }
  }

  return entries;
}

function toApiPermissionLog(log: Record<string, unknown>) {
  const changedByRaw = log.changedBy;
  let changedBy: {
    _id: string;
    first_name: string;
    last_name: string;
  } | null = null;

  if (
    changedByRaw &&
    typeof changedByRaw === "object" &&
    !Array.isArray(changedByRaw)
  ) {
    const actor = changedByRaw as Record<string, unknown>;
    changedBy = {
      _id: String(actor._id ?? ""),
      first_name: String(actor.first_name ?? ""),
      last_name: String(actor.last_name ?? ""),
    };
  }

  return {
    _id: String(log._id),
    targetUser: String(log.targetUser),
    changedBy,
    moduleName: String(log.moduleName ?? ""),
    action: String(log.action ?? ""),
    changeType: String(log.changeType ?? "") as "Granted" | "Restricted",
    createdAt: log.createdAt
      ? new Date(log.createdAt as Date).toISOString()
      : new Date().toISOString(),
  };
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseLanguages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function displayName(user: {
  first_name?: string;
  last_name?: string;
}): string {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
}

/** Map Mongo user document to frontend AdminUser shape. */
export function toAdminUser(user: Record<string, unknown>) {
  const id = String(user._id);
  const firstName = String(user.first_name ?? "");
  const lastName = String(user.last_name ?? "");
  const workEmail = String(user.work_email ?? "");
  const status = String(user.status ?? "Active");
  const languages = Array.isArray(user.languages)
    ? (user.languages as string[]).join(", ")
    : String(user.languages ?? "");

  return {
    _id: id,
    id,
    name: displayName({ first_name: firstName, last_name: lastName }),
    firstName,
    lastName,
    email: workEmail,
    officialEmail: workEmail,
    work_email: workEmail,
    personalEmail: user.personal_email
      ? String(user.personal_email)
      : undefined,
    role: String(user.role ?? "Staff"),
    status: status as "Active" | "Pending invite" | "Suspended",
    employeeId: user.employee_id ? String(user.employee_id) : undefined,
    employee_id: user.employee_id ? String(user.employee_id) : undefined,
    phone: user.phone ? String(user.phone) : undefined,
    mobileNumber: user.phone ? String(user.phone) : undefined,
    alternatePhone: user.alternate_phone
      ? String(user.alternate_phone)
      : undefined,
    dateOfBirth: user.date_of_birth
      ? new Date(user.date_of_birth as Date).toISOString()
      : null,
    dob: user.date_of_birth
      ? new Date(user.date_of_birth as Date).toISOString()
      : null,
    gender: user.gender ? String(user.gender) : undefined,
    bloodGroup: user.blood_group ? String(user.blood_group) : undefined,
    maritalStatus: user.marital_status
      ? String(user.marital_status)
      : undefined,
    languages: languages || undefined,
    address: user.address ? String(user.address) : undefined,
    emergencyContactName: (() => {
      const value =
        user.emergencyContactName ?? user.emergency_contact_name;
      return value ? String(value) : undefined;
    })(),
    emergencyPhone: (() => {
      const value = user.emergencyPhone ?? user.emergency_phone;
      return value ? String(value) : undefined;
    })(),
    joiningDate: user.date_of_joining
      ? new Date(user.date_of_joining as Date).toISOString().slice(0, 10)
      : null,
    joinedDate: user.date_of_joining
      ? new Date(user.date_of_joining as Date).toISOString().slice(0, 10)
      : null,
    isActive: status === "Active",
    createdAt: user.createdAt
      ? new Date(user.createdAt as Date).toISOString()
      : undefined,
    permissions: normalizeUserPermissions(
      user.permissions as UserPermissions | undefined,
      String(user.role ?? "Staff")
    ),
    team: undefined,
    department: undefined,
    workspace: [],
  };
}

function pickCreatePayload(body: Record<string, unknown>) {
  const firstName = String(
    body.first_name ?? body.firstName ?? ""
  ).trim();
  const lastName = String(body.last_name ?? body.lastName ?? "").trim();
  const workEmail = String(
    body.work_email ?? body.officialEmail ?? body.email ?? ""
  )
    .trim()
    .toLowerCase();

  const optionalString = (value: unknown) => {
    const trimmed = String(value ?? "").trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const languages = parseLanguages(body.languages);

  // Build a clean object — omit empty optionals so sparse unique indexes
  // are not polluted with "" (sparse only skips null/missing, not empty string).
  const payload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    work_email: workEmail,
    role: optionalString(body.role) ?? "Staff",
    status: optionalString(body.status) ?? "Pending invite",
  };

  const employeeId = optionalString(body.employee_id ?? body.employeeId);
  if (employeeId) payload.employee_id = employeeId;

  const personalEmail = optionalString(
    body.personal_email ?? body.personalEmail
  );
  if (personalEmail) payload.personal_email = personalEmail.toLowerCase();

  const phone = optionalString(body.phone ?? body.mobileNumber);
  if (phone) payload.phone = phone;

  const alternatePhone = optionalString(
    body.alternate_phone ?? body.alternatePhone
  );
  if (alternatePhone) payload.alternate_phone = alternatePhone;

  const dob = parseDate(body.date_of_birth ?? body.dateOfBirth ?? body.dob);
  if (dob) payload.date_of_birth = dob;

  const gender = optionalString(body.gender);
  if (gender) payload.gender = gender;

  const bloodGroup = optionalString(body.blood_group ?? body.bloodGroup);
  if (bloodGroup) payload.blood_group = bloodGroup;

  const maritalStatus = optionalString(
    body.marital_status ?? body.maritalStatus
  );
  if (maritalStatus) payload.marital_status = maritalStatus;

  if (languages.length > 0) payload.languages = languages;

  const address = optionalString(body.address);
  if (address) payload.address = address;

  const emergencyName = optionalString(
    body.emergencyContactName ?? body.emergency_contact_name
  );
  if (emergencyName) payload.emergencyContactName = emergencyName;

  const emergencyPhone = optionalString(
    body.emergencyPhone ?? body.emergency_phone
  );
  if (emergencyPhone) payload.emergencyPhone = emergencyPhone;

  const joining = parseDate(
    body.date_of_joining ?? body.joiningDate ?? body.joinedDate
  );
  if (joining) payload.date_of_joining = joining;

  return payload as {
    first_name: string;
    last_name: string;
    work_email: string;
    role: string;
    status: string;
    employee_id?: string;
    personal_email?: string;
    phone?: string;
    alternate_phone?: string;
    date_of_birth?: Date;
    gender?: string;
    blood_group?: string;
    marital_status?: string;
    languages?: string[];
    address?: string;
    emergencyContactName?: string;
    emergencyPhone?: string;
    date_of_joining?: Date;
  };
}

function duplicateFieldMessage(error: {
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}): string {
  const keys = Object.keys(error.keyPattern ?? error.keyValue ?? {});
  if (keys.includes("employee_id")) return "Employee ID already in use";
  if (keys.includes("personal_email")) {
    return "Personal email already in use";
  }
  if (keys.includes("work_email") || keys.includes("email")) {
    return "Email already in use";
  }
  return "A unique field already exists for this user";
}

/** Escape special regex characters in user-supplied search strings. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GET /api/users */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  const searchTerm = String(req.query.search ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const role = String(req.query.role ?? "").trim();
  const status = String(req.query.status ?? "").trim();

  if (role && role !== "all") filter.role = role;
  if (status && status !== "all") filter.status = status;
  if (searchTerm) {
    const escaped = escapeRegex(searchTerm);
    const fieldRegex = { $regex: escaped, $options: "i" };

    // first_name + last_name are separate — concat before matching full names
    // like "atul singh". Keep single-field matches for partial queries.
    filter.$or = [
      {
        $expr: {
          $regexMatch: {
            input: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$first_name", ""] },
                    " ",
                    { $ifNull: ["$last_name", ""] },
                  ],
                },
              },
            },
            regex: escaped,
            options: "i",
          },
        },
      },
      { first_name: fieldRegex },
      { last_name: fieldRegex },
      { work_email: fieldRegex },
      { employee_id: fieldRegex },
      { phone: fieldRegex },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).lean().exec();

  res.status(200).json({
    success: true,
    count: users.length,
    data: {
      users: users.map((user) => toAdminUser(user as Record<string, unknown>)),
    },
  });
});

/** GET /api/users/:id */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req.params.id);
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("User not found", 404);
  }

  const user = await User.findById(id).lean().exec();
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: { user: toAdminUser(user as Record<string, unknown>) },
  });
});

/** GET /api/users/check-employee-id?employeeId= */
export const checkEmployeeId = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = String(req.query.employeeId ?? "").trim();
    const excludeId = String(req.query.excludeUserId ?? "").trim();

    if (!employeeId) {
      res.status(200).json({ success: true, isUnique: false, message: "Employee ID is required." });
      return;
    }

    const existing = await User.findOne({
      employee_id: { $regex: `^${employeeId}$`, $options: "i" },
    })
      .select("_id")
      .lean()
      .exec();

    const isUnique =
      !existing ||
      (excludeId !== "" && String(existing._id) === excludeId);

    res.status(200).json({
      success: true,
      isUnique,
      message: isUnique ? undefined : "Employee ID already exists.",
    });
  }
);

/** POST /api/users — Owner only */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (env.nodeEnv !== "production") {
    console.log("Incoming Payload:", body);
  }

  const temporaryPassword = String(
    body.temporaryPassword ?? body.password ?? ""
  );

  if (!temporaryPassword || temporaryPassword.length < 6) {
    throw new AppError("Temporary password must be at least 6 characters", 400);
  }

  const payload = pickCreatePayload(body);

  if (!payload.first_name || !payload.last_name) {
    throw new AppError("First name and last name are required", 400);
  }
  if (!payload.work_email) {
    throw new AppError("Work email is required", 400);
  }

  // Explicit check against the real unique login email field
  const existingEmail = await User.findOne({
    work_email: payload.work_email,
  })
    .select("_id work_email")
    .lean()
    .exec();

  if (existingEmail) {
    throw new AppError("Email already in use", 409);
  }

  const password_hash = await bcrypt.hash(temporaryPassword, 12);
  const permissions =
    (body.permissions as Record<string, unknown> | undefined) ??
    defaultPermissionsForRole(payload.role);

  try {
    const user = await User.create({
      ...payload,
      status: payload.status || "Pending invite",
      password_hash,
      permissions,
      must_change_password: true,
    });

    void notifyOwnersOfPasswordReset(
      user.toObject() as unknown as {
        _id: Types.ObjectId;
        first_name?: string;
        last_name?: string;
        work_email?: string;
      }
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: toAdminUser(user.toObject() as unknown as Record<string, unknown>),
      },
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      const mongoError = error as {
        keyPattern?: Record<string, number>;
        keyValue?: Record<string, unknown>;
      };
      if (env.nodeEnv !== "production") {
        console.error("Mongo duplicate key:", mongoError.keyPattern, mongoError.keyValue);
      }
      throw new AppError(duplicateFieldMessage(mongoError), 409);
    }
    throw error;
  }
});

/** PUT /api/users/:id — Owner only (partial update) */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req.params.id);
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("User not found", 404);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates = pickCreatePayload(body);

  // Don't overwrite email/name with empties from sparse edit payloads
  const $set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== "") {
      $set[key] = value;
    }
  }

  if (body.temporaryPassword && String(body.temporaryPassword).length >= 6) {
    $set.password_hash = await bcrypt.hash(String(body.temporaryPassword), 12);
    $set.must_change_password = true;
    if (!$set.status) {
      $set.status = "Pending invite";
    }
  }

  const issuedTempPassword = Boolean(
    body.temporaryPassword && String(body.temporaryPassword).length >= 6
  );

  try {
    const user = await User.findByIdAndUpdate(id, { $set }, { new: true })
      .lean()
      .exec();

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (issuedTempPassword) {
      void notifyOwnersOfPasswordReset(
        user as {
          _id: Types.ObjectId;
          first_name?: string;
          last_name?: string;
          work_email?: string;
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user: toAdminUser(user as Record<string, unknown>) },
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new AppError("Email already in use", 409);
    }
    throw error;
  }
});

/** PUT /api/users/:id/status */
export const updateUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = paramId(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new AppError("User not found", 404);
    }

    const status = String(req.body?.status ?? "").trim();
    if (!status) {
      throw new AppError("Status is required", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    )
      .lean()
      .exec();

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: `User marked as ${status}`,
      data: { user: toAdminUser(user as Record<string, unknown>) },
    });
  }
);

/**
 * PUT /api/users/:id/permissions — Owner only.
 * Body: `{ permissions: UserPermissions }` (or the permissions object itself).
 */
export const updateUserPermissions = asyncHandler(
  async (req: Request, res: Response) => {
    const id = paramId(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new AppError("User not found", 404);
    }

    const changedById = req.user?.id;
    if (!changedById) {
      throw new AppError("Unauthorized", 401);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const permissionsInput =
      body.permissions !== undefined ? body.permissions : body;

    const permissions = sanitizePermissions(permissionsInput);

    const existing = await User.findById(id)
      .select("permissions role")
      .lean()
      .exec();

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    const previousPermissions = normalizeUserPermissions(
      existing.permissions as UserPermissions | undefined,
      String(existing.role ?? "Staff")
    );

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { permissions } },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const auditEntries = buildPermissionAuditLogs(
      id,
      changedById,
      previousPermissions,
      permissions
    );

    if (auditEntries.length > 0) {
      void AuditLog.insertMany(auditEntries).catch((err) => {
        console.error("Failed to write permission audit logs:", err);
      });
    }

    res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: { user: toAdminUser(user as Record<string, unknown>) },
    });
  }
);

/**
 * GET /api/users/:id/permission-logs — Owner only.
 * Latest permission change audit entries for a user.
 */
export const getPermissionLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const id = paramId(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new AppError("User not found", 404);
    }

    const targetUser = await User.findById(id).select("_id").lean().exec();
    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    const logs = await AuditLog.find({ targetUser: id })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("changedBy", "first_name last_name")
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: {
        logs: logs.map((log) =>
          toApiPermissionLog(log as Record<string, unknown>)
        ),
      },
    });
  }
);

/**
 * PUT /api/users/profile/password — authenticated user changes own password.
 * Clears temporary-password lock so new users can enter the CRM.
 */
export const changeOwnPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters", 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        "New password must be different from the current password",
        400
      );
    }

    const dbUser = await User.findById(userId)
      .select("+password_hash first_name last_name work_email role status employee_id permissions must_change_password createdAt")
      .exec();

    if (!dbUser) {
      throw new AppError("User not found", 404);
    }

    const matches = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!matches) {
      throw new AppError("Current password is incorrect", 401);
    }

    dbUser.password_hash = await bcrypt.hash(newPassword, 12);
    dbUser.must_change_password = false;
    if (String(dbUser.status) === "Pending invite") {
      dbUser.status = "Active";
    }
    await dbUser.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: {
        user: toPublicUser({
          _id: dbUser._id,
          first_name: dbUser.first_name,
          last_name: dbUser.last_name,
          work_email: dbUser.work_email,
          role: String(dbUser.role),
          status: dbUser.status,
          employee_id: dbUser.employee_id,
          permissions: dbUser.permissions,
          must_change_password: dbUser.must_change_password,
          createdAt: dbUser.createdAt,
        }),
      },
    });
  }
);

/** DELETE /api/users/:id */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req.params.id);
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("User not found", 404);
  }

  const user = await User.findByIdAndDelete(id).lean().exec();
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: { user: toAdminUser(user as Record<string, unknown>) },
  });
});

export default {
  getUsers,
  getUserById,
  checkEmployeeId,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserPermissions,
  getPermissionLogs,
  changeOwnPassword,
  deleteUser,
};
