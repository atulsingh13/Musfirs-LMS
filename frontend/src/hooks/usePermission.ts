import { usePermissions } from "@/hooks/usePermissions";
import type {
  PermissionAction,
  PermissionModule,
} from "@/lib/permissions";

/**
 * Single-check permission helper.
 *
 * @example
 * const canCreateLead = usePermission("Leads", "create");
 */
export function usePermission(
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const { can } = usePermissions();
  return can(module, action);
}

export default usePermission;
