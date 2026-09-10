export type MockAdminUserStatus = "Active" | "Pending invite" | "Suspended";

export interface MockAdminUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  department?: string | null;
  workspace?: string[];
  status: MockAdminUserStatus;
  joinedDate?: string | null;
  avatarUrl?: string;
  phone?: string;
  employeeId?: string;
  isActive?: boolean;
  createdAt?: string;
  firstName?: string;
  lastName?: string;
  officialEmail?: string;
  personalEmail?: string;
  mobileNumber?: string;
  emergencyContact?: string;
  designation?: string;
  joiningDate?: string | null;
  workLocation?: string;
  probationPeriod?: string;
  employeeStatus?: string;
  ctc?: string;
  bankAccount?: string;
  ifsc?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  allocatedAssets?: string;
  gender?: string;
  dob?: string | null;
  address?: string;
  password?: string;
}

export interface MockAdminUsersFilters {
  search?: string;
  role?: string;
  team?: string;
  status?: string;
  workspace?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Static users for the Users tab (UI-only until backend is connected). */
export const MOCK_ADMIN_USERS: MockAdminUser[] = [
  {
    _id: "usr_admin",
    id: "usr_admin",
    name: "Atul Sharma",
    firstName: "Atul",
    lastName: "Sharma",
    email: "admin@divniq.com",
    officialEmail: "admin@divniq.com",
    personalEmail: "atul.sharma@gmail.com",
    role: "Administrator",
    team: "Platform",
    department: "Operations",
    workspace: ["WS", "S"],
    status: "Active",
    joinedDate: "2024-01-15",
    joiningDate: "2024-01-15",
    employeeId: "EMP1001",
    designation: "Owner / Administrator",
    phone: "+91 98765 43210",
    mobileNumber: "+91 98765 43210",
    emergencyContact: "+91 98765 00001",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Male",
    dob: "1990-04-12",
    address: "Andheri East, Mumbai",
    ctc: "₹28,00,000",
    bankAccount: "XXXXXX4521",
    ifsc: "HDFC0001234",
    panNumber: "ABCDE1234F",
    aadhaarNumber: "XXXX-XXXX-1234",
    allocatedAssets: "MacBook Pro 16, Monitor",
    isActive: true,
  },
  {
    _id: "usr_manager",
    id: "usr_manager",
    name: "Priya Mehta",
    firstName: "Priya",
    lastName: "Mehta",
    email: "manager@divniq.com",
    officialEmail: "manager@divniq.com",
    personalEmail: "priya.mehta@gmail.com",
    role: "Manager",
    team: "Operations",
    department: "Operations",
    workspace: ["WS"],
    status: "Active",
    joinedDate: "2024-03-02",
    joiningDate: "2024-03-02",
    employeeId: "EMP1002",
    designation: "Operations Manager",
    phone: "+91 98765 43211",
    mobileNumber: "+91 98765 43211",
    emergencyContact: "+91 98765 00002",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Female",
    dob: "1992-08-21",
    address: "Powai, Mumbai",
    ctc: "₹18,00,000",
    bankAccount: "XXXXXX7832",
    ifsc: "ICIC0002345",
    panNumber: "PQRST5678G",
    aadhaarNumber: "XXXX-XXXX-5678",
    allocatedAssets: "MacBook Air M2",
    isActive: true,
  },
  {
    _id: "usr_hr",
    id: "usr_hr",
    name: "Sneha Kapoor",
    firstName: "Sneha",
    lastName: "Kapoor",
    email: "hr@divniq.com",
    officialEmail: "hr@divniq.com",
    personalEmail: "sneha.kapoor@gmail.com",
    role: "HR",
    team: "Human Resources",
    department: "Human Resources",
    workspace: ["WS", "S"],
    status: "Active",
    joinedDate: "2024-04-10",
    joiningDate: "2024-04-10",
    employeeId: "EMP1003",
    designation: "HR Lead",
    phone: "+91 98765 43212",
    mobileNumber: "+91 98765 43212",
    emergencyContact: "+91 98765 00003",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Female",
    dob: "1991-11-03",
    address: "Bandra West, Mumbai",
    ctc: "₹14,00,000",
    bankAccount: "XXXXXX9910",
    ifsc: "SBIN0003456",
    panNumber: "KLMNO9012H",
    aadhaarNumber: "XXXX-XXXX-9012",
    allocatedAssets: "Dell Latitude 5440",
    isActive: true,
  },
  {
    _id: "usr_employee",
    id: "usr_employee",
    name: "Rahul Singh",
    firstName: "Rahul",
    lastName: "Singh",
    email: "employee@divniq.com",
    officialEmail: "employee@divniq.com",
    personalEmail: "rahul.singh@gmail.com",
    role: "Employee",
    team: "Development",
    department: "Development",
    workspace: ["WS"],
    status: "Active",
    joinedDate: "2024-06-18",
    joiningDate: "2024-06-18",
    employeeId: "EMP1004",
    designation: "Software Engineer",
    phone: "+91 98765 43213",
    mobileNumber: "+91 98765 43213",
    emergencyContact: "+91 98765 00004",
    workLocation: "Pune Office",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Male",
    dob: "1996-02-14",
    address: "Hinjewadi, Pune",
    ctc: "₹10,50,000",
    bankAccount: "XXXXXX2201",
    ifsc: "AXIS0004567",
    panNumber: "UVWXY3456I",
    aadhaarNumber: "XXXX-XXXX-3456",
    allocatedAssets: "MacBook Pro 14",
    isActive: true,
  },
  {
    _id: "usr_001",
    id: "usr_001",
    name: "Ananya Desai",
    firstName: "Ananya",
    lastName: "Desai",
    email: "ananya@divniq.com",
    officialEmail: "ananya@divniq.com",
    personalEmail: "ananya.desai@gmail.com",
    role: "Employee",
    team: "Design",
    department: "Design",
    workspace: ["WS"],
    status: "Active",
    joinedDate: "2024-08-05",
    joiningDate: "2024-08-05",
    employeeId: "EMP1006",
    designation: "Product Designer",
    phone: "+91 98765 43214",
    mobileNumber: "+91 98765 43214",
    emergencyContact: "+91 98765 00005",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Female",
    dob: "1995-07-19",
    address: "Juhu, Mumbai",
    ctc: "₹9,80,000",
    bankAccount: "XXXXXX6612",
    ifsc: "HDFC0005678",
    panNumber: "FGHIJ7890J",
    aadhaarNumber: "XXXX-XXXX-7890",
    allocatedAssets: "iPad Pro, Magic Keyboard",
    isActive: true,
  },
  {
    _id: "usr_002",
    id: "usr_002",
    name: "Vikram Patel",
    firstName: "Vikram",
    lastName: "Patel",
    email: "vikram@divniq.com",
    officialEmail: "vikram@divniq.com",
    personalEmail: "vikram.patel@gmail.com",
    role: "BDE",
    team: "Sales",
    department: "Sales",
    workspace: ["S"],
    status: "Pending invite",
    joinedDate: "2025-11-20",
    joiningDate: "2025-11-20",
    employeeId: "EMP1007",
    designation: "Business Development Executive",
    phone: "+91 98765 43215",
    mobileNumber: "+91 98765 43215",
    emergencyContact: "+91 98765 00006",
    workLocation: "Remote",
    probationPeriod: "3 months",
    employeeStatus: "Probation",
    gender: "Male",
    dob: "1994-12-01",
    address: "Ahmedabad",
    ctc: "₹7,20,000",
    bankAccount: "XXXXXX3344",
    ifsc: "YESB0006789",
    panNumber: "QRSTU2345K",
    aadhaarNumber: "XXXX-XXXX-2345",
    allocatedAssets: "Lenovo ThinkPad",
    isActive: false,
  },
  {
    _id: "usr_003",
    id: "usr_003",
    name: "Meera Iyer",
    firstName: "Meera",
    lastName: "Iyer",
    email: "meera@divniq.com",
    officialEmail: "meera@divniq.com",
    personalEmail: "meera.iyer@gmail.com",
    role: "Employee",
    team: "Marketing",
    department: "Marketing",
    workspace: ["WS"],
    status: "Pending invite",
    joinedDate: "2026-01-08",
    joiningDate: "2026-01-08",
    employeeId: "EMP1008",
    designation: "Marketing Specialist",
    phone: "+91 98765 43216",
    mobileNumber: "+91 98765 43216",
    emergencyContact: "+91 98765 00007",
    workLocation: "Bangalore Office",
    probationPeriod: "3 months",
    employeeStatus: "Probation",
    gender: "Female",
    dob: "1997-05-28",
    address: "Indiranagar, Bangalore",
    ctc: "₹8,40,000",
    bankAccount: "XXXXXX7788",
    ifsc: "KKBK0007890",
    panNumber: "LMNOP6789L",
    aadhaarNumber: "XXXX-XXXX-6789",
    allocatedAssets: "MacBook Air M1",
    isActive: false,
  },
  {
    _id: "usr_004",
    id: "usr_004",
    name: "Karan Malhotra",
    firstName: "Karan",
    lastName: "Malhotra",
    email: "karan@divniq.com",
    officialEmail: "karan@divniq.com",
    personalEmail: "karan.malhotra@gmail.com",
    role: "Employee",
    team: "Development",
    department: "Development",
    workspace: ["WS"],
    status: "Suspended",
    joinedDate: "2023-11-30",
    joiningDate: "2023-11-30",
    employeeId: "EMP1009",
    designation: "Frontend Contractor",
    phone: "+91 98765 43217",
    mobileNumber: "+91 98765 43217",
    emergencyContact: "+91 98765 00008",
    workLocation: "Remote",
    probationPeriod: "N/A",
    employeeStatus: "Suspended",
    gender: "Male",
    dob: "1993-09-09",
    address: "Noida",
    ctc: "₹6,00,000",
    bankAccount: "XXXXXX1122",
    ifsc: "IDIB0008901",
    panNumber: "ABCDE4567M",
    aadhaarNumber: "XXXX-XXXX-4567",
    allocatedAssets: "Returned",
    isActive: false,
  },
  {
    _id: "usr_005",
    id: "usr_005",
    name: "Divya Nair",
    firstName: "Divya",
    lastName: "Nair",
    email: "divya@divniq.com",
    officialEmail: "divya@divniq.com",
    personalEmail: "divya.nair@gmail.com",
    role: "Manager",
    team: "Finance",
    department: "Finance",
    workspace: ["WS", "S"],
    status: "Active",
    joinedDate: "2025-05-22",
    joiningDate: "2025-05-22",
    employeeId: "EMP1010",
    designation: "Finance Analyst",
    phone: "+91 98765 43218",
    mobileNumber: "+91 98765 43218",
    emergencyContact: "+91 98765 00009",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Female",
    dob: "1992-01-30",
    address: "Worli, Mumbai",
    ctc: "₹12,00,000",
    bankAccount: "XXXXXX9090",
    ifsc: "HDFC0009012",
    panNumber: "ZXCVB8901N",
    aadhaarNumber: "XXXX-XXXX-8901",
    allocatedAssets: "Dell XPS 13",
    isActive: true,
  },
  {
    _id: "usr_006",
    id: "usr_006",
    name: "Arjun Reddy",
    firstName: "Arjun",
    lastName: "Reddy",
    email: "arjun@divniq.com",
    officialEmail: "arjun@divniq.com",
    personalEmail: "arjun.reddy@gmail.com",
    role: "Employee",
    team: "Development",
    department: "Development",
    workspace: ["WS"],
    status: "Active",
    joinedDate: "2025-09-01",
    joiningDate: "2025-09-01",
    employeeId: "EMP1011",
    designation: "Backend Engineer",
    phone: "+91 98765 43219",
    mobileNumber: "+91 98765 43219",
    emergencyContact: "+91 98765 00010",
    workLocation: "Hyderabad Office",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Male",
    dob: "1998-03-17",
    address: "Gachibowli, Hyderabad",
    ctc: "₹11,20,000",
    bankAccount: "XXXXXX5566",
    ifsc: "UTIB0000123",
    panNumber: "HJKLQ1234O",
    aadhaarNumber: "XXXX-XXXX-0123",
    allocatedAssets: "MacBook Pro 14, Dock",
    isActive: true,
  },
  {
    _id: "usr_007",
    id: "usr_007",
    name: "Neha Joshi",
    firstName: "Neha",
    lastName: "Joshi",
    email: "neha@divniq.com",
    officialEmail: "neha@divniq.com",
    personalEmail: "neha.joshi@gmail.com",
    role: "HR",
    team: "Human Resources",
    department: "Human Resources",
    workspace: ["WS"],
    status: "Active",
    joinedDate: "2025-02-12",
    joiningDate: "2025-02-12",
    employeeId: "EMP1012",
    designation: "HR Executive",
    phone: "+91 98765 43220",
    mobileNumber: "+91 98765 43220",
    emergencyContact: "+91 98765 00011",
    workLocation: "Mumbai HQ",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Female",
    dob: "1996-10-08",
    address: "Thane West",
    ctc: "₹7,80,000",
    bankAccount: "XXXXXX4433",
    ifsc: "PUNB0001234",
    panNumber: "WXYZA5678P",
    aadhaarNumber: "XXXX-XXXX-5670",
    allocatedAssets: "HP EliteBook",
    isActive: true,
  },
  {
    _id: "usr_008",
    id: "usr_008",
    name: "Rohit Verma",
    firstName: "Rohit",
    lastName: "Verma",
    email: "rohit@divniq.com",
    officialEmail: "rohit@divniq.com",
    personalEmail: "rohit.verma@gmail.com",
    role: "BDE",
    team: "Sales",
    department: "Sales",
    workspace: ["S"],
    status: "Active",
    joinedDate: "2024-10-15",
    joiningDate: "2024-10-15",
    employeeId: "EMP1013",
    designation: "Senior BDE",
    phone: "+91 98765 43221",
    mobileNumber: "+91 98765 43221",
    emergencyContact: "+91 98765 00012",
    workLocation: "Delhi Office",
    probationPeriod: "Completed",
    employeeStatus: "Confirmed",
    gender: "Male",
    dob: "1993-06-25",
    address: "Saket, New Delhi",
    ctc: "₹9,00,000",
    bankAccount: "XXXXXX8877",
    ifsc: "BARB0002345",
    panNumber: "MNBVC9012Q",
    aadhaarNumber: "XXXX-XXXX-9010",
    allocatedAssets: "iPhone 15, Laptop",
    isActive: true,
  },
];

function matchesFilter(value: string | undefined | null, filter?: string) {
  if (!filter || filter === "all") return true;
  return (value ?? "").toLowerCase() === filter.toLowerCase();
}

function matchesWorkspace(workspaces: string[] | undefined, filter?: string) {
  if (!filter || filter === "all") return true;
  return (workspaces ?? []).some(
    (ws) => ws.toLowerCase() === filter.toLowerCase()
  );
}

export function getMockAdminUsers(
  filters: MockAdminUsersFilters = {}
): MockAdminUser[] {
  const search = filters.search?.trim().toLowerCase() ?? "";

  let users = MOCK_ADMIN_USERS.filter((user) => {
    const haystack = [
      user.name,
      user.email,
      user.employeeId,
      user.role,
      user.team,
      user.department,
      user.designation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const searchOk = !search || haystack.includes(search);
    const roleOk = matchesFilter(user.role, filters.role);
    const teamOk =
      matchesFilter(user.team, filters.team) ||
      matchesFilter(user.department, filters.team);
    const statusOk = matchesFilter(user.status, filters.status);
    const workspaceOk = matchesWorkspace(user.workspace, filters.workspace);

    return searchOk && roleOk && teamOk && statusOk && workspaceOk;
  });

  const sortBy = filters.sortBy ?? "name";
  const sortOrder = filters.sortOrder === "desc" ? -1 : 1;

  users = [...users].sort((a, b) => {
    const left = String(
      (a as unknown as Record<string, unknown>)[sortBy] ?? a.name ?? ""
    ).toLowerCase();
    const right = String(
      (b as unknown as Record<string, unknown>)[sortBy] ?? b.name ?? ""
    ).toLowerCase();
    if (left < right) return -1 * sortOrder;
    if (left > right) return 1 * sortOrder;
    return 0;
  });

  return users.map(({ password: _password, ...user }) => user);
}

export function getMockAdminUserById(id: string): MockAdminUser | null {
  const user = MOCK_ADMIN_USERS.find((u) => u.id === id || u._id === id);
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
}

export function updateMockAdminUserStatus(
  id: string,
  status: MockAdminUserStatus
): MockAdminUser | null {
  const idx = MOCK_ADMIN_USERS.findIndex((u) => u.id === id || u._id === id);
  if (idx < 0) return null;

  MOCK_ADMIN_USERS[idx] = {
    ...MOCK_ADMIN_USERS[idx],
    status,
    isActive: status === "Active",
  };

  return getMockAdminUserById(id);
}
