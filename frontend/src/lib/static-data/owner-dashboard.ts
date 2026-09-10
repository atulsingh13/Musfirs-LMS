export interface OwnerKpiMetrics {
  totalActiveProjects: number;
  totalEmployees: number;
  presentToday: number;
  totalStaffToday: number;
  monthlyRevenue: number;
}

export type OwnerProjectStatus = "pending" | "active" | "completed";

export interface OwnerRecentProject {
  id: string;
  name: string;
  managerName: string;
  status: OwnerProjectStatus;
  deadline: string;
  clientName?: string;
}

export const OWNER_KPI_METRICS: OwnerKpiMetrics = {
  totalActiveProjects: 12,
  totalEmployees: 45,
  presentToday: 42,
  totalStaffToday: 45,
  monthlyRevenue: 850000,
};

export const OWNER_RECENT_PROJECTS: OwnerRecentProject[] = [
  {
    id: "1",
    name: "TechNova Website Redesign",
    managerName: "Priya Mehta",
    status: "active",
    deadline: "2026-06-30",
    clientName: "TechNova Solutions",
  },
  {
    id: "2",
    name: "GreenLeaf Brand Campaign",
    managerName: "Priya Mehta",
    status: "pending",
    deadline: "2026-07-15",
    clientName: "GreenLeaf Corp",
  },
  {
    id: "3",
    name: "Apex Digital SEO Overhaul",
    managerName: "Rahul Verma",
    status: "active",
    deadline: "2026-05-20",
    clientName: "Apex Digital",
  },
  {
    id: "4",
    name: "StarBridge Mobile App",
    managerName: "Rahul Verma",
    status: "completed",
    deadline: "2026-03-10",
    clientName: "StarBridge Media",
  },
  {
    id: "5",
    name: "CloudSync CRM Integration",
    managerName: "Ananya Patel",
    status: "pending",
    deadline: "2026-08-01",
    clientName: "CloudSync Ltd",
  },
  {
    id: "6",
    name: "UrbanFit E-commerce Launch",
    managerName: "Ananya Patel",
    status: "active",
    deadline: "2026-06-18",
    clientName: "UrbanFit",
  },
];

export const MOCK_MANAGERS = [
  { id: "mgr_1", name: "Priya Mehta" },
  { id: "mgr_2", name: "Rahul Verma" },
  { id: "mgr_3", name: "Ananya Patel" },
  { id: "mgr_4", name: "Vikram Shah" },
];

export const USER_ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "employee", label: "Employee" },
] as const;
