import type { UserRole } from "@/types";

export type Permission =
  | "dashboard"
  | "pages.calendar"
  | "pages.tasks"
  | "pages.invoice"
  | "crm.leads"
  | "crm.follow_ups"
  | "crm.meetings"
  | "crm.proposals"
  | "crm.deals"
  | "crm.clients"
  | "crm.bdes"
  | "admin.users"
  | "admin.roles"
  | "admin.auth"
  | "admin.settings";

const ALL_PERMISSIONS: Permission[] = [
  "dashboard",
  "pages.calendar",
  "pages.tasks",
  "pages.invoice",
  "crm.leads",
  "crm.follow_ups",
  "crm.meetings",
  "crm.proposals",
  "crm.deals",
  "crm.clients",
  "crm.bdes",
  "admin.users",
  "admin.roles",
  "admin.auth",
  "admin.settings",
];

const PAGES: Permission[] = ["pages.calendar", "pages.tasks", "pages.invoice"];

const CRM: Permission[] = [
  "crm.leads",
  "crm.follow_ups",
  "crm.meetings",
  "crm.proposals",
  "crm.deals",
  "crm.clients",
  "crm.bdes",
];

const OWNER_HIDDEN_PERMISSIONS: Permission[] = [
  "crm.follow_ups",
  "crm.clients",
  "pages.tasks",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  administrator: ALL_PERMISSIONS.filter(
    (permission) => !OWNER_HIDDEN_PERMISSIONS.includes(permission)
  ),
  manager: ["dashboard", ...PAGES, ...CRM, "admin.settings"],
  hr: [
    "dashboard",
    "pages.calendar",
    "pages.tasks",
    "admin.settings",
  ],
  employee: [
    "dashboard",
    "pages.calendar",
    "pages.tasks",
    "admin.settings",
  ],
  client: [
    "dashboard",
    "crm.proposals",
    "crm.clients",
    "admin.settings",
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Owner / Administrator",
  manager: "Manager",
  hr: "HR",
  employee: "Employee",
  client: "Client (Project)",
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessRoute(role: UserRole, permission: Permission): boolean {
  return hasPermission(role, permission);
}

export function canViewHrData(role: UserRole): boolean {
  return role === "administrator" || role === "hr";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "administrator";
}

export function canViewBdesPage(role: UserRole): boolean {
  return role === "administrator" || role === "manager";
}

export function canCreateBdes(role: UserRole): boolean {
  return role === "administrator";
}

export function isPendingPasswordUser(
  user: { status?: string; mustChangePassword?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return user.status === "Pending invite" || user.mustChangePassword === true;
}
