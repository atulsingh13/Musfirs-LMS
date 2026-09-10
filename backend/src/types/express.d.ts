import "express-serve-static-core";
import type { UserPermissions } from "./permissions.js";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  permissions?: UserPermissions;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
