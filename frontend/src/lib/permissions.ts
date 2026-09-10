/** Mirrors backend `src/types/permissions.ts` for client-side checks. */

export const PERMISSION_MODULES = [
  "Dashboard",
  "Leads",
  "Bookings",
  "Calendar",
  "Users",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "import",
  "manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type ModulePermissionFlags = Record<PermissionAction, boolean>;

export type UserPermissions = Record<PermissionModule, ModulePermissionFlags>;

export function createEmptyModulePermissions(
  overrides: Partial<ModulePermissionFlags> = {}
): ModulePermissionFlags {
  return {
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    import: false,
    manage: false,
    ...overrides,
  };
}

export function createOwnerPermissions(): UserPermissions {
  const full = createEmptyModulePermissions({
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    import: true,
    manage: true,
  });
  return {
    Dashboard: { ...full },
    Leads: { ...full },
    Bookings: { ...full },
    Calendar: { ...full },
    Users: { ...full },
  };
}

export function createStaffPermissions(): UserPermissions {
  return {
    Dashboard: createEmptyModulePermissions({ view: true }),
    Leads: createEmptyModulePermissions({
      view: true,
      create: true,
      edit: true,
      export: true,
    }),
    Bookings: createEmptyModulePermissions({
      view: true,
      edit: true,
      export: true,
    }),
    Calendar: createEmptyModulePermissions({
      view: true,
      create: true,
      edit: true,
    }),
    Users: createEmptyModulePermissions({ view: false }),
  };
}

export function defaultPermissionsForRole(role: string): UserPermissions {
  if (
    role === "Owner" ||
    role === "Administrator" ||
    role === "administrator"
  ) {
    return createOwnerPermissions();
  }
  return createStaffPermissions();
}

/**
 * Fill any missing modules/actions from role defaults.
 * Keeps legacy user docs working when new modules (e.g. Bookings) are added.
 */
export function normalizeUserPermissions(
  permissions: Partial<UserPermissions> | null | undefined,
  role = "Staff"
): UserPermissions {
  const defaults = defaultPermissionsForRole(role);
  const normalized = {} as UserPermissions;

  for (const moduleName of PERMISSION_MODULES) {
    const existing = permissions?.[moduleName];
    normalized[moduleName] = {
      ...defaults[moduleName],
      ...(existing ?? {}),
    };
  }

  return normalized;
}

export function hasModulePermission(
  permissions: UserPermissions | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
  options?: { isOwner?: boolean }
): boolean {
  if (options?.isOwner) return true;
  // Explicit deny when permissions object is missing
  if (!permissions) return false;
  return permissions[module]?.[action] === true;
}
