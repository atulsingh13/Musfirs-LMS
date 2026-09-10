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

/** Shared Mongoose sub-schema shape for one module's action flags. */
export const modulePermissionSchemaDefinition = {
  view: { type: Boolean, default: true },
  create: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  import: { type: Boolean, default: false },
  manage: { type: Boolean, default: false },
} as const;

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

/** Owner / Administrator — full access on all modules. */
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

/** Default staff permissions — view-focused, limited write. */
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
  if (role === "Owner" || role === "Administrator") {
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
