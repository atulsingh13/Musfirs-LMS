import { PageShell } from "@/components/layout/page-shell";
import { CalendarClient } from "@/components/pages/calendar-client";

export function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      description="Schedule meetings, deadlines, and events"
    >
      <CalendarClient />
    </PageShell>
  );
}
