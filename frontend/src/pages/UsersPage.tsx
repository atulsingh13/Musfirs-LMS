import { PageShell } from "@/components/layout/page-shell";
import { UsersTable } from "@/components/admin/users-table";

export function UsersPage() {
  return (
    <PageShell
      title="Users"
      description="Manage your organization members and their access."
    >
      <UsersTable />
    </PageShell>
  );
}
