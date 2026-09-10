import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { OWNER_ROLES } from "../types/user.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "./authMiddleware.js";

/**
 * Must be authenticated AND Owner/Administrator.
 * Prefer `checkPermission("Users", "manage")` for permission-based checks;
 * keep this for Owner-only operations that should never be delegated.
 */
export const requireOwner = [
  requireAuth,
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number])) {
      throw new AppError("Forbidden: only Owners can perform this action", 403);
    }
    next();
  }),
];
