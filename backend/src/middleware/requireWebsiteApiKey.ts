import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Public website capture — validates `x-api-key` against WEBSITE_API_KEY. */
export function requireWebsiteApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.WEBSITE_API_KEY ?? "";
  const provided = String(req.headers["x-api-key"] ?? "");

  if (!expected || !safeEqual(provided, expected)) {
    res.status(403).json({ success: false, message: "Unauthorized" });
    return;
  }

  next();
}

export default requireWebsiteApiKey;
