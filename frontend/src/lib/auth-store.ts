import type { Department, UserRole } from "@/types";
import type { UserPermissions } from "@/lib/permissions";
import { MOCK_CREDENTIALS } from "@/lib/static-data/credentials";

export interface AuthUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  officialEmail?: string;
  personalEmail?: string;
  phone?: string;
  mobileNumber?: string;
  emergencyContact?: string;
  profilePicture?: string;
  dob?: string | null;
  gender?: string;
  address?: string;
  timezone?: string;
  employeeId: string;
  designation?: string;
  joiningDate?: string | null;
  ctc?: string;
  salary?: number | null;
  bankAccount?: string;
  ifsc?: string;
  bankDetails?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  allocatedAssets?: string;
  role: UserRole;
  department: Department | null;
  departmentName?: string | null;
  status?: "Active" | "Pending invite" | "Suspended";
  mustChangePassword?: boolean;
  /** Module/action flags from MongoDB (Owner-managed). */
  permissions?: UserPermissions;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

const USERS_KEY = "divniq_users";
const SESSION_KEY = "divniq_session";
const USERS_VERSION_KEY = "divniq_users_version";
/** Bump to re-seed mock users after credential changes. */
const USERS_VERSION = "4-mock-credentials";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Fixed IDs for mock data linking */
export const SEED_USER_IDS = {
  administrator: "usr_admin",
  manager: "usr_manager",
  hr: "usr_hr",
  employee: "usr_employee",
  client: "usr_client",
} as const;

function buildSeedUsers(): StoredUser[] {
  return MOCK_CREDENTIALS.map((cred) => ({
    id: cred.id,
    name: cred.name,
    email: cred.email,
    password: cred.password,
    employeeId: cred.employeeId,
    role: cred.role,
    department: cred.department,
    joiningDate: cred.joiningDate,
    status: "Active" as const,
    mustChangePassword: false,
    timezone: "Asia/Kolkata",
  }));
}

function isBrowser() {
  return typeof window !== "undefined";
}

function generateId() {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateEmployeeId() {
  return `EMP${Math.floor(1000 + Math.random() * 9000)}`;
}

function createToken(userId: string) {
  const payload = { userId, iat: Date.now() };
  return btoa(JSON.stringify(payload));
}

function seedUsers(): StoredUser[] {
  return buildSeedUsers();
}

function getUsers(): StoredUser[] {
  if (!isBrowser()) return [];

  const version = localStorage.getItem(USERS_VERSION_KEY);
  if (version !== USERS_VERSION) {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("divniq_ids_linked");
    localStorage.removeItem("divniq_data_version");
    const seeded = seedUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    localStorage.setItem(USERS_VERSION_KEY, USERS_VERSION);
    return seeded;
  }

  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    const seeded = seedUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    localStorage.setItem(USERS_VERSION_KEY, USERS_VERSION);
    return seeded;
  }

  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    const seeded = seedUsers();
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveUsers(users: StoredUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toAuthUser(user: StoredUser): AuthUser {
  const { password: _password, ...authUser } = user;
  return authUser;
}

function saveSession(userId: string): string {
  const token = createToken(userId);
  const session: Session = {
    token,
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return token;
}

export function getSession(): Session | null {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Session;
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getAllUsers(): AuthUser[] {
  return getUsers().map(toAuthUser);
}

export function login(
  identifier: string,
  password: string
): { user: AuthUser; token: string } | { error: string } {
  const normalized = identifier.trim().toLowerCase();
  const users = getUsers();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.employeeId.toLowerCase() === normalized
  );

  if (!user || user.password !== password) {
    return { error: "Invalid email/employee ID or password." };
  }

  const token = saveSession(user.id);
  return { user: toAuthUser(user), token };
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Department | null;
}

export function signup(
  input: SignupInput
): { user: AuthUser; token: string } | { error: string } {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const users = getUsers();

  if (!name) {
    return { error: "Name is required." };
  }

  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { error: "An account with this email already exists." };
  }

  if (input.password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const newUser: StoredUser = {
    id: generateId(),
    name,
    email,
    password: input.password,
    employeeId: generateEmployeeId(),
    role: input.role,
    department: input.department ?? null,
    joiningDate: new Date().toISOString().split("T")[0],
    status: "Active",
    mustChangePassword: false,
    timezone: "Asia/Kolkata",
  };

  saveUsers([...users, newUser]);
  const token = saveSession(newUser.id);
  return { user: toAuthUser(newUser), token };
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

export const DEMO_CREDENTIALS = MOCK_CREDENTIALS.map((u) => ({
  email: u.email,
  password: u.password,
  label: u.label,
}));
