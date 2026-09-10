import { useAuth } from "@/context/auth-context";
import { CrmDashboard } from "@/components/dashboard/crm-dashboard";
import { Loader2 } from "lucide-react";

/**
 * Single dashboard for every role. KPI numbers come from
 * GET /dashboard/summary, which already scopes leads for Staff.
 */
export function DashboardPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <CrmDashboard />;
}
