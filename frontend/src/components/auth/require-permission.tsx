import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type {
  PermissionAction,
  PermissionModule,
} from "@/lib/permissions";

interface RequirePermissionProps {
  module: PermissionModule;
  action: PermissionAction;
  children: ReactNode;
  /** Optional fallback when permission is missing (default: render nothing). */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children when the current user has
 * `permissions[module][action] === true` (Owners always pass).
 *
 * @example
 * <RequirePermission module="Leads" action="create">
 *   <Button>Add Lead</Button>
 * </RequirePermission>
 */
export function RequirePermission({
  module,
  action,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { can } = usePermissions();

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/** Alias matching the PermissionGuard naming from the enforcement plan. */
export const PermissionGuard = RequirePermission;

export default RequirePermission;
