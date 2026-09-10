import dotenv from "dotenv";

dotenv.config();

const DEV_JWT_SECRET = "dev-only-change-me-musafir-jwt-secret-min-32-chars";
const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = isProduction
  ? required("JWT_SECRET")
  : required("JWT_SECRET", DEV_JWT_SECRET);

if (isProduction && (jwtSecret === DEV_JWT_SECRET || jwtSecret.length < 32)) {
  throw new Error(
    "JWT_SECRET must be a strong secret (at least 32 characters) in production"
  );
}

/** Cookie SameSite for auth refresh cookie. Use `none` only for true cross-site SPA+API. */
const cookieSameSiteRaw = (
  process.env.COOKIE_SAMESITE ?? "strict"
).toLowerCase();
const cookieSameSite =
  cookieSameSiteRaw === "lax" ||
  cookieSameSiteRaw === "none" ||
  cookieSameSiteRaw === "strict"
    ? cookieSameSiteRaw
    : "strict";

export const env = {
  nodeEnv,
  isProduction,
  port: Number(required("PORT", "5000")),
  frontendUrl: isProduction
    ? required("FRONTEND_URL")
    : required("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret,
  /** Optional: host-only by default. Set e.g. `.example.com` for subdomain sharing. */
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  cookieSameSite: cookieSameSite as "strict" | "lax" | "none",
  mongoUri: required(
    "MONGODB_URI",
    process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/musafir_crm"
  ),
  mongoDbName: required("MONGODB_DB_NAME", "musafir_crm"),
  websiteApiKey: process.env.WEBSITE_API_KEY ?? "",
  websiteOrigin: process.env.WEBSITE_ORIGIN ?? "",
  /** Meta Lead Ads webhook verification token (Facebook "Verify Token"). */
  metaVerifyToken: process.env.META_VERIFY_TOKEN ?? "",
  /** Meta Graph API user/page token used to fetch leadgen details. */
  metaAccessToken: process.env.META_ACCESS_TOKEN ?? "",
  /** Shared secret Google Ads Lead Form Extension sends as `google-key` header. */
  googleWebhookKey: process.env.GOOGLE_WEBHOOK_KEY ?? "",
} as const;

export default env;
