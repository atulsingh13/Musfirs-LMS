import type { AuthUser } from "@/lib/auth-store";
import {
  applyAccessToken,
  clearApiAccessToken,
  api,
} from "@/services/api";
import {
  mapApiUserToAuthUser,
  type AuthApiResponse,
  type MeApiResponse,
} from "@/services/auth-api";

const USER_KEY = "musafir_user";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
  // legacy keys
  localStorage.removeItem("divniq_user");
  localStorage.removeItem("divniq_token");
}

export function persistAuthSession(user: AuthUser, accessToken?: string) {
  setStoredUser(user);
  if (accessToken) {
    applyAccessToken(accessToken);
  }
}

export function clearAuthSession() {
  clearStoredUser();
  clearApiAccessToken();
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await api.get<MeApiResponse>("/auth/me");
  if (!response.data.success) return null;
  return mapApiUserToAuthUser(response.data.data.user);
}

export function saveAuthResponse(response: AuthApiResponse): AuthUser {
  const user = mapApiUserToAuthUser(response.data.user);
  persistAuthSession(user, response.data.accessToken);
  return user;
}
