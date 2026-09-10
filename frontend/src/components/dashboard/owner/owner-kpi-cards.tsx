import {
  Briefcase,
  IndianRupee,
  UserCheck,
  Users,
} from "lucide-react";
import type { OwnerKpiMetrics } from "@/lib/owner-dashboard-mock";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCardSkeleton } from "@/components/ui/skeleton-loaders";

interface OwnerKpiCardsProps {
  metrics: OwnerKpiMetrics;
  isLoading?: boolean;
}

function formatRevenue(amount: number) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OwnerKpiCards({ metrics, isLoading }: OwnerKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  const cards = [
    {
      title: "Active Leads",
      value: metrics.totalActiveProjects.toString(),
      icon: Briefcase,
      subtitle: "Pipeline in progress",
    },
    {
      title: "Total Employees",
      value: metrics.totalEmployees.toString(),
      icon: Users,
      subtitle: "Active workforce",
    },
    {
      title: "Today's Present Staff",
      value: `${metrics.presentToday}/${metrics.totalEmployees}`,
      icon: UserCheck,
      subtitle: "Staff only · excludes Owner/Admin",
    },
    {
      title: "Monthly Revenue",
      value: formatRevenue(metrics.monthlyRevenue),
      icon: IndianRupee,
      subtitle: "Current month to date",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <card.icon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{card.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
