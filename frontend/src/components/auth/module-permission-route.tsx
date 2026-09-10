import { Link, Outlet } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { AuthLoadingSpinner } from "@/components/auth/auth-loading-spinner";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const glassCard =
  "rounded-2xl border border-white/40 bg-white/20 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5";

interface ModulePermissionRouteProps {
  module: PermissionModule;
  action?: "view" | "create" | "edit" | "delete" | "manage";
}

/**
 * Route guard for Mongo module permissions.
 * Denies with a glass 403 when `permissions[module][action]` is not true.
 */
export function ModulePermissionRoute({
  module,
  action = "view",
}: ModulePermissionRouteProps) {
  const { isLoading } = useAuth();
  const { can } = usePermissions();
  const canViewDashboard = can("Dashboard", "view");
  const fallbackPath = canViewDashboard ? "/dashboard" : "/profile";
  const fallbackLabel = canViewDashboard
    ? "Back to Dashboard"
    : "Back to Profile";

  if (isLoading) {
    return <AuthLoadingSpinner message="Loading..." />;
  }

  if (!can(module, action)) {
    return (
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.08),_transparent_45%)]"
        />
        <div className={cn(glassCard, "max-w-md px-8 py-10 text-center")}>
          <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 ring-1 ring-red-400/30">
            <ShieldOff className="size-7" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            403 — Unauthorized
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to {action} {module}. Ask an Owner to
            update your access if you need this module.
          </p>
          <Button
            className="mt-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white"
            render={<Link to={fallbackPath} />}
            nativeButton={false}
          >
            {fallbackLabel}
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ModulePermissionRoute;
