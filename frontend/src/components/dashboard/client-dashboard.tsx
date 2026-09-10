import { useAuth } from "@/context/auth-context";
import { PageShell } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ClientDashboard() {
  const { user } = useAuth();

  return (
    <PageShell
      title="Client Portal"
      description={`Welcome, ${user?.name ?? "Client"}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Your workspace</CardTitle>
          <CardDescription>
            Contact your account manager for the latest delivery updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use Calendar and profile settings from the sidebar while we finish
            connecting live client data.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
