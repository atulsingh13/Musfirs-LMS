import axios from "axios";
import { api } from "@/services/api";

export interface OwnerDashboardStats {
  activeProjects: number;
  totalEmployees: number;
  /** Staff checked in today (excludes Owner/Administrator) */
  presentToday: number;
  /** Alias of presentToday from API */
  todaysPresentStaff?: number;
  totalRevenue: number;
}

export interface OwnerDashboardStatsResponse {
  success: boolean;
  data: OwnerDashboardStats;
}

export async function getOwnerDashboardStats(): Promise<OwnerDashboardStatsResponse> {
  const { data } = await api.get<OwnerDashboardStatsResponse>(
    "/dashboard/owner-stats"
  );
  return data;
}

export function formatOwnerRevenue(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDashboardErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
