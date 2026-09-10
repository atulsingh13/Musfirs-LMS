import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { isPendingPasswordUser } from "@/lib/rbac";

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const mustChangePassword = isPendingPasswordUser(user);

  if (mustChangePassword && location.pathname !== "/profile") {
    return (
      <Navigate
        to="/profile"
        replace
        state={{ tab: "security" }}
      />
    );
  }

  return (
    <SidebarProvider className="bg-transparent">
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-transparent">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
