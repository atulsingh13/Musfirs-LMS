import { CrmDashboard } from "@/components/dashboard/crm-dashboard";

/**
 * Staff / Employee dashboard — same CRM KPI grid as Admin,
 * with API-scoped metrics (assignedTo OR createdBy).
 */
export function EmployeeDashboard() {
  return <CrmDashboard />;
}
