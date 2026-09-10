import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import type { AppError } from "../utils/AppError.js";

/** Central JSON error handler — matches frontend envelope `{ success, message }`. */
export function errorHandler(
  err: Error & Partial<AppError>,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message =
    err.message || "Something went wrong. Please try again later.";
  const isOperational = err.isOperational === true;
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (env.nodeEnv !== "production") {
    if (isOperational && isClientError) {
      // Expected auth/validation failures — one line, no stack dump
      console.warn(
        `[${statusCode}] ${req.method} ${req.originalUrl} — ${message}`
      );
    } else {
      console.error(err);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === "development" && !isClientError && err.stack
      ? { stack: err.stack }
      : {}),
  });
}

export default errorHandler;
