import type { CookieOptions, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  findUserByEmail,
  findUserById,
  toPublicUser,
  type LeanAuthUser,
} from "../repositories/user.repository.js";
import {
  createSecurityAuditLog,
  notifyAdminsPasswordResetRequest,
  notifyAdminsSystemAlert,
} from "../services/security.service.js";

/** Legacy access cookie — cleared on login/logout during migration. */
const LEGACY_ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refreshToken";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If your email matches an active account, a password reset request has been sent to the administrators.";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const MAX_RESET_REQUESTS_PER_WINDOW = 3;

export type JwtTokenType = "access" | "refresh";

export interface AuthJwtPayload {
  id: string;
  email: string;
  role: string;
  type: JwtTokenType;
}

function refreshCookieOptions(): CookieOptions {
  const sameSite = env.cookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === "none",
    sameSite,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/",
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

function clearCookieOptions(): CookieOptions {
  const sameSite = env.cookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === "none",
    sameSite,
    path: "/",
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

function signAccessToken(
  user: Pick<LeanAuthUser, "_id" | "work_email" | "role">
): string {
  const payload: AuthJwtPayload = {
    id: String(user._id),
    email: user.work_email,
    role: user.role,
    type: "access",
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(
  user: Pick<LeanAuthUser, "_id" | "work_email" | "role">
): string {
  const payload: AuthJwtPayload = {
    id: String(user._id),
    email: user.work_email,
    role: user.role,
    type: "refresh",
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  res.clearCookie(LEGACY_ACCESS_COOKIE, clearCookieOptions());
}

function isSuspended(status?: string): boolean {
  return String(status ?? "") === "Suspended";
}

async function handleFailedLogin(user: LeanAuthUser): Promise<void> {
  const nextAttempts = (user.failedLoginAttempts ?? 0) + 1;
  const shouldSuspend = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

  const update: Record<string, unknown> = {
    failedLoginAttempts: nextAttempts,
  };
  if (shouldSuspend) {
    update.status = "Suspended";
  }

  await User.findByIdAndUpdate(user._id, { $set: update }).exec();

  if (shouldSuspend) {
    const email = user.work_email;
    const message = `User ${email} has been suspended due to 5 consecutive failed login attempts.`;
    await Promise.all([
      createSecurityAuditLog(user._id, "Account Suspended"),
      notifyAdminsSystemAlert(message, user._id),
    ]);
  }
}

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (isSuspended(user.status)) {
    throw new AppError(
      "Your account has been suspended due to suspicious activity. Please contact your administrator.",
      403
    );
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    await handleFailedLogin(user);
    throw new AppError("Invalid credentials", 401);
  }

  if ((user.failedLoginAttempts ?? 0) > 0) {
    await User.findByIdAndUpdate(user._id, {
      $set: { failedLoginAttempts: 0 },
    }).exec();
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Drop legacy cookie-based access JWT if present.
  res.clearCookie(LEGACY_ACCESS_COOKIE, clearCookieOptions());
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: {
      user: toPublicUser(user),
      accessToken,
    },
  });
});

/** POST /api/auth/refresh-token */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    let decoded: AuthJwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as AuthJwtPayload;
    } catch {
      throw new AppError("Unauthorized", 401);
    }

    if (decoded.type !== "refresh" || !decoded.id) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await findUserById(decoded.id);
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    if (isSuspended(user.status)) {
      clearAuthCookies(res);
      throw new AppError("Account suspended", 403);
    }

    const accessToken = signAccessToken(user);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  }
);

/** POST /api/auth/forgot-password */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const respondGeneric = () => {
      res.status(200).json({
        success: true,
        message: GENERIC_FORGOT_PASSWORD_MESSAGE,
      });
    };

    const user = await User.findOne({ work_email: email })
      .select(
        "+password_hash _id first_name last_name work_email role status resetRequestCount firstResetRequestDate"
      )
      .exec();

    if (!user || isSuspended(user.status)) {
      respondGeneric();
      return;
    }

    const now = Date.now();
    const windowStart = user.firstResetRequestDate
      ? new Date(user.firstResetRequestDate).getTime()
      : null;

    if (
      !windowStart ||
      now - windowStart > TWENTY_FOUR_HOURS_MS
    ) {
      user.resetRequestCount = 0;
      user.firstResetRequestDate = new Date(now);
    }

    user.resetRequestCount += 1;

    if (user.resetRequestCount > MAX_RESET_REQUESTS_PER_WINDOW) {
      user.status = "Suspended";
      await user.save();

      const message = `User ${user.work_email} has been suspended due to exceeding the 24-hour password reset limit.`;
      await Promise.all([
        createSecurityAuditLog(user._id, "Account Suspended"),
        notifyAdminsSystemAlert(message, user._id),
      ]);

      respondGeneric();
      return;
    }

    await user.save();
    await notifyAdminsPasswordResetRequest(user);

    respondGeneric();
  }
);

/** POST /api/auth/logout */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/** GET /api/auth/me — Requires protect middleware (req.user set from JWT). */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: toPublicUser(user),
    },
  });
});

export { REFRESH_COOKIE, LEGACY_ACCESS_COOKIE, signAccessToken };

/** @deprecated Use REFRESH_COOKIE — kept for any residual imports during migration. */
export const COOKIE_NAME = LEGACY_ACCESS_COOKIE;

export default { login, logout, getMe, forgotPassword, refreshToken };
