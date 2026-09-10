import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import {
  normalizeUserPermissions,
  type PermissionAction,
  type PermissionModule,
  type UserPermissions,
} from "../types/permissions.js";
import { OWNER_ROLES } from "../types/user.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthJwtPayload } from "../controllers/authController.js";

function isOwnerRole(role?: string): boolean {
  return !!role && OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number]);
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return undefined;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) return undefined;
  return token.trim();
}

/**
 * JWT authentication middleware.
 * Reads the Bearer access token, verifies type === "access", loads live
 * role/permissions/status from MongoDB, and attaches `req.user`.
 *
 * Must run before `checkPermission`.
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);

    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    let decoded: AuthJwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as AuthJwtPayload;
    } catch {
      throw new AppError("Unauthorized", 401);
    }

    if (decoded.type !== "access" || !decoded.id) {
      throw new AppError("Unauthorized", 401);
    }

    const dbUser = await User.findById(decoded.id)
      .select("_id work_email role status permissions")
      .lean()
      .exec();

    if (!dbUser) {
      throw new AppError("Unauthorized", 401);
    }

    if (String(dbUser.status).toLowerCase() === "suspended") {
      throw new AppError("Account suspended", 403);
    }

    const permissions = normalizeUserPermissions(
      dbUser.permissions as UserPermissions | undefined,
      String(dbUser.role)
    );

    req.user = {
      id: String(dbUser._id),
      email: String(dbUser.work_email),
      role: String(dbUser.role),
      status: String(dbUser.status ?? "Active"),
      permissions,
    };

    next();
  }
);

/** @deprecated Prefer `requireAuth` — alias for existing imports. */
export const protect = requireAuth;

/**
 * Granular permission gate — run after `requireAuth`.
 *
 * Usage:
 *   router.delete("/:id", requireAuth, checkPermission("Leads", "delete"), deleteLead)
 *
 * Checks `req.user.permissions[moduleName][action]`.
 * Owner / Administrator always pass (absolute control).
 */
export function checkPermission(
  moduleName: PermissionModule,
  action: PermissionAction
): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    if (isOwnerRole(req.user.role)) {
      next();
      return;
    }

    const allowed = req.user.permissions?.[moduleName]?.[action] === true;

    if (!allowed) {
      throw new AppError(
        `Access Denied: You do not have permission to ${action} ${moduleName}`,
        403
      );
    }

    next();
  });
}

/** @deprecated Prefer `checkPermission` — kept as an alias for existing imports. */
export const authorize = checkPermission;

/** Convenience: auth + one permission check for route spreading. */
export function requirePermission(
  moduleName: PermissionModule,
  action: PermissionAction
): RequestHandler[] {
  return [requireAuth, checkPermission(moduleName, action)];
}

/** True if the current request user may perform the action. */
export function hasPermission(
  req: Request,
  moduleName: PermissionModule,
  action: PermissionAction
): boolean {
  if (!req.user) return false;
  if (isOwnerRole(req.user.role)) return true;
  return req.user.permissions?.[moduleName]?.[action] === true;
}

export default {
  requireAuth,
  protect,
  checkPermission,
  authorize,
  requirePermission,
  hasPermission,
};
