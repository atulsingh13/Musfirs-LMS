import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Permission } from "@/lib/rbac";

interface PermissionRouteProps {
  permission: Permission;
}

export function PermissionRoute({ permission }: PermissionRouteProps) {
  const { isLoading, can } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
