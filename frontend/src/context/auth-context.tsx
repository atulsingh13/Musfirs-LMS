import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types";
import {
  hasPermission,
  ROLE_LABELS,
  type Permission,
} from "@/lib/rbac";
import { type AuthUser, type SignupInput } from "@/lib/auth-store";
import {
  clearAuthSession,
  fetchCurrentUser,
  getStoredUser,
  persistAuthSession,
} from "@/lib/auth-session";
import { getAccessToken } from "@/lib/auth-token";
import { setAuthRefreshHandler } from "@/lib/auth-refresh";
import { applyAccessToken, api } from "@/services/api";
import { loginApi, logoutApi, mapApiUserToAuthUser } from "@/services/auth-api";
import type { ApiUser } from "@/services/auth-api";
import axios from "axios";

const API_BASE = api.defaults.baseURL ?? "http://localhost:5000/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  roleLabel: string;
  checkInAt: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (input: SignupInput) => Promise<{ error?: string }>;
  signup: (input: SignupInput) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateSessionUser: (apiUser: ApiUser) => void;
  /** Re-fetch `/auth/me` and sync permissions into context. */
  refreshUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  /** Bumped on login/logout so in-flight bootstrap cannot wipe a fresh session. */
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const epochAtStart = sessionEpochRef.current;

    async function bootstrap() {
      let accessToken = getAccessToken();
      const cached = getStoredUser();

      // Restore identity for layout, but strip permissions until /me confirms
      // so revoked access cannot flash from a stale localStorage cache.
      if (cached && accessToken) {
        setUser({ ...cached, permissions: undefined });
      }

      // Access token missing — try refresh cookie once (does not use api interceptor).
      if (!accessToken) {
        try {
          const { data } = await axios.post<{
            success: boolean;
            data: { accessToken: string };
          }>(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
          const refreshed = data?.data?.accessToken;
          if (refreshed) {
            applyAccessToken(refreshed);
            accessToken = refreshed;
            if (cached) {
              setUser({ ...cached, permissions: undefined });
            }
          }
        } catch {
          // Guest or expired refresh — fall through to signed-out state
        }
      }

      if (!accessToken) {
        if (!cancelled && sessionEpochRef.current === epochAtStart) {
          clearAuthSession();
          setUser(null);
          setCheckInAt(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await fetchCurrentUser();
        if (cancelled || sessionEpochRef.current !== epochAtStart) return;
        if (me) {
          persistAuthSession(me);
          setUser(me);
        } else {
          clearAuthSession();
          setUser(null);
        }
      } catch {
        if (cancelled || sessionEpochRef.current !== epochAtStart) return;
        // Only clear if login did not win the race and store a newer token.
        if (!getAccessToken()) {
          clearAuthSession();
          setUser(null);
        }
      } finally {
        if (!cancelled && sessionEpochRef.current === epochAtStart) {
          setCheckInAt(null);
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refetch permissions when the tab becomes visible again (Owner may have edited access).
  useEffect(() => {
    if (isLoading) return;

    let lastFetchAt = 0;
    const THROTTLE_MS = 30_000;
    let cancelled = false;

    async function refreshMe() {
      if (!getAccessToken()) return;
      const now = Date.now();
      if (now - lastFetchAt < THROTTLE_MS) return;
      lastFetchAt = now;

      try {
        const me = await fetchCurrentUser();
        if (cancelled) return;
        if (me) {
          persistAuthSession(me);
          setUser(me);
        }
      } catch {
        // Ignore transient focus-refresh failures; bootstrap/login remain source of truth.
      }
    }

    function onFocus() {
      void refreshMe();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshMe();
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await loginApi(email, password);
        if (!response.success || !response.data?.user) {
          return { error: response.message || "Login failed" };
        }

        const accessToken = response.data.accessToken;
        if (!accessToken) {
          return { error: "Login succeeded but no access token was returned" };
        }

        // Invalidate in-flight bootstrap before persisting so it cannot clear us.
        sessionEpochRef.current += 1;

        // 1–2. Save token + set Axios default Authorization immediately
        applyAccessToken(accessToken);

        // 3. Update global auth state (user profile + session cache)
        const authUser = mapApiUserToAuthUser(response.data.user);
        persistAuthSession(authUser, accessToken);
        setUser(authUser);
        setCheckInAt(null);
        setIsLoading(false);

        // 4. Navigate only after token + state are ready
        navigate("/dashboard", { replace: true });
        return {};
      } catch (err) {
        return { error: getErrorMessage(err, "Invalid email or password") };
      }
    },
    [navigate]
  );

  const register = useCallback(async (_input: SignupInput) => {
    return {
      error: "Self-registration is disabled. Ask an administrator for access.",
    };
  }, []);

  const signup = register;

  const logout = useCallback(async () => {
    sessionEpochRef.current += 1;
    try {
      await logoutApi();
    } catch {
      // Always clear client state even if the network call fails
    }
    setCheckInAt(null);
    clearAuthSession();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const updateSessionUser = useCallback((apiUser: ApiUser) => {
    const authUser = mapApiUserToAuthUser(apiUser);
    setUser(authUser);
    persistAuthSession(authUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (!getAccessToken()) return;
      const me = await fetchCurrentUser();
      if (me) {
        persistAuthSession(me);
        setUser(me);
      }
    } catch {
      // Leave existing session on transient /me failures
    }
  }, []);

  useEffect(() => {
    setAuthRefreshHandler(refreshUser);
    return () => setAuthRefreshHandler(null);
  }, [refreshUser]);

  const role = user?.role ?? null;

  const can = useCallback(
    (permission: Permission) => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      role,
      roleLabel: role ? ROLE_LABELS[role] : "",
      checkInAt,
      login,
      register,
      signup,
      logout,
      updateSessionUser,
      refreshUser,
      can,
    }),
    [
      user,
      isLoading,
      role,
      checkInAt,
      login,
      register,
      signup,
      logout,
      updateSessionUser,
      refreshUser,
      can,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
