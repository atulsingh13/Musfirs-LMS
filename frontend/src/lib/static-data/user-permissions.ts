export type ModulePermissionStatus = "Full Access" | "Custom";

export interface ModulePermissionRow {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
  manage: boolean;
  status: ModulePermissionStatus;
}

export interface PermissionSummary {
  roleLabel: string;
  roleSubtitle: string;
  total: number;
  granted: number;
  grantedPercent: number;
  restricted: number;
  restrictedPercent: number;
  custom: number;
}

export interface PermissionSourceSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface RestrictedPermissionItem {
  id: string;
  action: string;
  module: string;
}

export interface PermissionChangeItem {
  id: string;
  actorName: string;
  actorInitials: string;
  actorColor: string;
  action: "Updated" | "Restricted" | "Granted";
  description: string;
  timestamp: string;
}

export interface UserProfileHeaderMock {
  name: string;
  role: string;
  employeeId: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  joiningDate: string;
  status: "Active" | "Pending invite" | "Suspended";
  stats: {
    totalProjects: number;
    tasksCompleted: number;
    clientMeetings: number;
    attendancePercent: number;
  };
}

/** Reference profile used by Permissions mock (Atul Singh). */
export const ATUL_SINGH_PROFILE: UserProfileHeaderMock = {
  name: "Atul Singh",
  role: "Administrator",
  employeeId: "EMP-0001",
  department: "Development Department",
  email: "atul.singh@divniqcrm.com",
  phone: "+91 98765 43210",
  location: "Gurugram, Haryana, India",
  joiningDate: "01 Jan 2024",
  status: "Active",
  stats: {
    totalProjects: 18,
    tasksCompleted: 234,
    clientMeetings: 42,
    attendancePercent: 98,
  },
};

export const PERMISSION_SUMMARY: PermissionSummary = {
  roleLabel: "Administrator",
  roleSubtitle: "Full System Access",
  total: 128,
  granted: 124,
  grantedPercent: 97,
  restricted: 4,
  restrictedPercent: 3,
  custom: 12,
};

/** Live CRM modules shown in the permissions matrix. */
export const MODULE_PERMISSIONS: ModulePermissionRow[] = [
  {
    module: "Dashboard",
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    import: true,
    manage: true,
    status: "Full Access",
  },
  {
    module: "Leads",
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    import: true,
    manage: true,
    status: "Custom",
  },
  {
    module: "Bookings",
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    import: true,
    manage: true,
    status: "Full Access",
  },
  {
    module: "Calendar",
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: false,
    import: false,
    manage: true,
    status: "Custom",
  },
  {
    module: "Users",
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    import: true,
    manage: false,
    status: "Custom",
  },
];

export const PERMISSION_SOURCES: PermissionSourceSlice[] = [
  { label: "Default Permissions", count: 96, percent: 75, color: "#8b5cf6" },
  { label: "Role Based", count: 20, percent: 16, color: "#3b82f6" },
  { label: "Custom Permissions", count: 12, percent: 9, color: "#22c55e" },
];

export const RESTRICTED_PERMISSIONS: RestrictedPermissionItem[] = [
  { id: "r1", action: "Delete Users", module: "Users" },
  { id: "r2", action: "Manage Users", module: "Users" },
  { id: "r3", action: "Delete Leads", module: "Leads" },
  { id: "r4", action: "Import Calendar", module: "Calendar" },
];

export const RECENT_PERMISSION_CHANGES: PermissionChangeItem[] = [
  {
    id: "c1",
    actorName: "Sanket Singh",
    actorInitials: "SS",
    actorColor: "bg-violet-500",
    action: "Updated",
    description: "updated export permission for Calendar",
    timestamp: "09 May 2024, 10:30 AM",
  },
  {
    id: "c2",
    actorName: "Priya Sharma",
    actorInitials: "PS",
    actorColor: "bg-sky-500",
    action: "Restricted",
    description: "restricted delete permission for Leads",
    timestamp: "08 May 2024, 03:15 PM",
  },
  {
    id: "c3",
    actorName: "Atul Singh",
    actorInitials: "AS",
    actorColor: "bg-emerald-500",
    action: "Granted",
    description: "granted import permission for Users",
    timestamp: "07 May 2024, 11:20 AM",
  },
];

export const MODULE_ACTION_KEYS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "import",
  "manage",
] as const;

export type ModuleActionKey = (typeof MODULE_ACTION_KEYS)[number];
