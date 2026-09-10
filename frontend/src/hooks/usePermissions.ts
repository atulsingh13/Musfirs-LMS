import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  createEmptyModulePermissions,
  hasModulePermission,
  type PermissionAction,
  type PermissionModule,
  type UserPermissions,
} from "@/lib/permissions";

/** All module/action flags false — used when session has no permissions object. */
function createDeniedPermissions(): UserPermissions {
  const denied = createEmptyModulePermissions({
    view: false,
    create: false,
    edit: false,
    delete: false,
    export: false,
    import: false,
    manage: false,
  });
  return {
    Dashboard: { ...denied },
    Leads: { ...denied },
    Bookings: { ...denied },
    Calendar: { ...denied },
    Users: { ...denied },
  };
}

export interface UsePermissionsResult {
  permissions: UserPermissions;
  /** True when the signed-in user is Owner / Administrator. */
  isOwner: boolean;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  canView: (module: PermissionModule) => boolean;
  canCreate: (module: PermissionModule) => boolean;
  canEdit: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
  canExport: (module: PermissionModule) => boolean;
  canImport: (module: PermissionModule) => boolean;
  canManage: (module: PermissionModule) => boolean;
}

/**
 * Reads the logged-in user's module permissions from Auth Context.
 * Missing `user.permissions` denies all module access (Owners still bypass).
 */
export function usePermissions(): UsePermissionsResult {
  const { user, role } = useAuth();

  const isOwner = role === "administrator";

  const permissions = useMemo<UserPermissions>(() => {
    if (user?.permissions) return user.permissions;
    // Deny-by-default — never invent staff grants from role alone
    return createDeniedPermissions();
  }, [user?.permissions]);

  const can = useCallback(
    (module: PermissionModule, action: PermissionAction) => {
      if (isOwner) return true;
      if (!user?.permissions) return false;
      return hasModulePermission(user.permissions, module, action);
    },
    [user?.permissions, isOwner]
  );

  return {
    permissions,
    isOwner,
    can,
    canView: (module) => can(module, "view"),
    canCreate: (module) => can(module, "create"),
    canEdit: (module) => can(module, "edit"),
    canDelete: (module) => can(module, "delete"),
    canExport: (module) => can(module, "export"),
    canImport: (module) => can(module, "import"),
    canManage: (module) => can(module, "manage"),
  };
}

export default usePermissions;
