import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Layers,
  PhoneForwarded,
  Building2,
  Users,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";
import type { PermissionModule } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Legacy role-based permission (used only when `module` is not set). */
  permission?: Permission;
  /**
   * When set, sidebar visibility is gated by module `view`
   * via `usePermissions` only.
   */
  module?: PermissionModule;
  badge?: { label: string; className?: string };
  children?: { title: string; href: string }[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    label: "",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        module: "Dashboard",
      },
    ],
  },
  {
    label: "CRM Modules",
    items: [
      {
        title: "Leads",
        href: "/leads",
        icon: Layers,
        module: "Leads",
      },
      {
        title: "Bookings",
        href: "/bookings",
        icon: CalendarCheck,
        module: "Bookings",
      },
      {
        title: "Follow-ups",
        href: "/crm/follow-ups",
        icon: PhoneForwarded,
        permission: "crm.follow_ups",
      },
      {
        title: "Clients",
        href: "/crm/clients",
        icon: Building2,
        permission: "crm.clients",
      },
    ],
  },
  {
    label: "Pages",
    items: [
      {
        title: "Calendar",
        href: "/calendar",
        icon: Calendar,
        module: "Calendar",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Users",
        href: "/users",
        icon: Users,
        module: "Users",
      },
    ],
  },
];
