import type { MockAdminUser } from "@/lib/static-data/users";

export interface UserOverviewStats {
  totalProjects: number;
  tasksCompleted: number;
  clientMeetings: number;
  attendancePercent: number;
}

export interface UserPersonalExtras {
  bloodGroup: string;
  maritalStatus: string;
  languages: string[];
  alternatePhone: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  username: string;
  permissions: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
}

export interface PerformanceMetric {
  label: string;
  value: number;
}

export interface TaskSummarySlice {
  name: string;
  value: number;
  color: string;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
}

export interface ProjectInvolvement {
  id: string;
  name: string;
  role: string;
  status: "In Progress" | "Completed" | "On Hold";
  progress: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  uploadedOn: string;
  size: string;
}

export interface UserOverviewData {
  stats: UserOverviewStats;
  personal: UserPersonalExtras;
  performanceOverall: number;
  performanceMetrics: PerformanceMetric[];
  taskSummary: TaskSummarySlice[];
  taskTotal: number;
  attendance: AttendanceSummary;
  projects: ProjectInvolvement[];
  activity: ActivityItem[];
  documents: DocumentItem[];
}

function hashSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Deterministic mock overview payload per user (UI-only). */
export function getUserOverviewData(user: MockAdminUser): UserOverviewData {
  const seed = hashSeed(user.id);
  const attendanceRate = 88 + (seed % 10);
  const overall = 78 + (seed % 15);
  const completed = 60 + (seed % 30);
  const inProgress = 15 + (seed % 15);
  const pending = 8 + (seed % 12);
  const overdue = seed % 4;
  const taskTotal = completed + inProgress + pending + overdue;

  const first = user.firstName?.toLowerCase() || user.name.split(" ")[0]?.toLowerCase() || "user";
  const last = user.lastName?.toLowerCase() || user.name.split(" ")[1]?.toLowerCase() || "divniq";

  return {
    stats: {
      totalProjects: 6 + (seed % 10),
      tasksCompleted: 80 + (seed % 90),
      clientMeetings: 12 + (seed % 25),
      attendancePercent: attendanceRate,
    },
    personal: {
      bloodGroup: ["A+", "B+", "O+", "AB+", "B-"][seed % 5],
      maritalStatus: seed % 2 === 0 ? "Single" : "Married",
      languages: seed % 2 === 0 ? ["English", "Hindi"] : ["English", "Hindi", "Marathi"],
      alternatePhone: "+91 98" + String(70000000 + (seed % 9999999)).slice(0, 8),
      emergencyContactName:
        seed % 2 === 0
          ? `${user.lastName ?? "Family"} Contact`
          : "Emergency Contact",
      emergencyContactRelation: ["Sibling", "Spouse", "Parent", "Friend"][seed % 4],
      username: `${first}.${last}`,
      permissions: "View / Edit / Assign",
      lastLogin: "Today, 09:42 AM",
      twoFactorEnabled: seed % 3 !== 0,
    },
    performanceOverall: overall,
    performanceMetrics: [
      { label: "Task Completion", value: Math.min(98, overall + 5) },
      { label: "Project Delivery", value: overall },
      { label: "Quality of Work", value: Math.max(70, overall - 3) },
      { label: "Team Collaboration", value: Math.min(96, overall + 2) },
      { label: "Client Satisfaction", value: Math.max(72, overall - 1) },
    ],
    taskSummary: [
      { name: "Completed", value: completed, color: "#22c55e" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Overdue", value: overdue, color: "#ef4444" },
    ],
    taskTotal,
    attendance: {
      totalWorkingDays: 22,
      present: Math.round((attendanceRate / 100) * 22),
      absent: Math.max(0, 22 - Math.round((attendanceRate / 100) * 22) - (seed % 2)),
      leave: seed % 2,
      rate: attendanceRate,
    },
    projects: [
      {
        id: "p1",
        name: "Website Development",
        role: user.designation || user.role,
        status: "In Progress",
        progress: 65 + (seed % 20),
      },
      {
        id: "p2",
        name: "CRM Integration",
        role: "Contributor",
        status: "Completed",
        progress: 100,
      },
      {
        id: "p3",
        name: "Mobile App Redesign",
        role: "Reviewer",
        status: seed % 2 === 0 ? "In Progress" : "On Hold",
        progress: 35 + (seed % 30),
      },
      {
        id: "p4",
        name: "Client Portal",
        role: "Lead",
        status: "Completed",
        progress: 100,
      },
    ],
    activity: [
      {
        id: "a1",
        title: "Updated project status",
        description: "Website Development → In Progress",
        time: "2 hours ago",
      },
      {
        id: "a2",
        title: "Completed task",
        description: "Homepage hero animation",
        time: "Yesterday",
      },
      {
        id: "a3",
        title: "Uploaded document",
        description: "Experience Letter.pdf",
        time: "2 days ago",
      },
      {
        id: "a4",
        title: "Joined team standup",
        description: "Daily sync with Operations",
        time: "3 days ago",
      },
    ],
    documents: [
      {
        id: "d1",
        name: "Resume.pdf",
        uploadedOn: "12 Jan 2024",
        size: "240 KB",
      },
      {
        id: "d2",
        name: "Offer Letter.pdf",
        uploadedOn: "15 Jan 2024",
        size: "180 KB",
      },
      {
        id: "d3",
        name: "ID Proof.pdf",
        uploadedOn: "16 Jan 2024",
        size: "420 KB",
      },
      {
        id: "d4",
        name: "Experience Letter.pdf",
        uploadedOn: "20 Jan 2024",
        size: "156 KB",
      },
    ],
  };
}
