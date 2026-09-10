import { PageShell } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase?: string;
}

export function PlaceholderPage({
  title,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <PageShell title={title} description={description}>
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="size-5 text-muted-foreground" />
            <CardTitle className="text-lg">Coming Soon</CardTitle>
          </div>
          <CardDescription>
            This module is scaffolded and ready for implementation.
            {phase && ` (${phase})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Route and navigation are configured. Feature development will be
            added in the next phase.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
