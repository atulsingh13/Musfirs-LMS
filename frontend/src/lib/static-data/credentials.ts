import type { Department, UserRole } from "@/types";

export interface MockCredential {
  id: string;
  name: string;
  email: string;
  password: string;
  employeeId: string;
  role: UserRole;
  department: Department | null;
  label: string;
  joiningDate: string;
}

/** Demo login accounts — use these until backend is connected. */
export const MOCK_CREDENTIALS: MockCredential[] = [
  {
    id: "usr_admin",
    name: "Atul Sharma",
    email: "admin@divniq.com",
    password: "admin123",
    employeeId: "EMP1001",
    role: "administrator",
    department: "operations",
    label: "Administrator",
    joiningDate: "2024-01-15",
  },
  {
    id: "usr_manager",
    name: "Priya Mehta",
    email: "manager@divniq.com",
    password: "manager123",
    employeeId: "EMP1002",
    role: "manager",
    department: "operations",
    label: "Manager",
    joiningDate: "2024-03-02",
  },
  {
    id: "usr_hr",
    name: "Sneha Kapoor",
    email: "hr@divniq.com",
    password: "hr12345",
    employeeId: "EMP1003",
    role: "hr",
    department: "hr",
    label: "HR",
    joiningDate: "2024-04-10",
  },
  {
    id: "usr_employee",
    name: "Rahul Singh",
    email: "employee@divniq.com",
    password: "employee123",
    employeeId: "EMP1004",
    role: "employee",
    department: "development",
    label: "Employee",
    joiningDate: "2024-06-18",
  },
  {
    id: "usr_client",
    name: "Client User",
    email: "client@divniq.com",
    password: "client123",
    employeeId: "EMP1005",
    role: "client",
    department: null,
    label: "Client",
    joiningDate: "2025-02-14",
  },
];
