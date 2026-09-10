import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { triggerAuthRefresh } from "@/lib/auth-refresh";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/** Persist access token and set Axios default Authorization immediately. */
export function applyAccessToken(accessToken: string): void {
  setAccessToken(accessToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

/** Clear stored access token and remove Axios default Authorization. */
export function clearApiAccessToken(): void {
  clearAccessToken();
  delete api.defaults.headers.common.Authorization;
}

const glassForbiddenToastClass =
  "border border-red-400/40 bg-red-500/15 text-red-950 shadow-[0_8px_32px_rgba(127,29,29,0.18)] backdrop-blur-xl dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-50";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/me") ||
    url.includes("/auth/register") ||
    url.includes("/auth/forgot-password")
  );
}

function shouldSkipSilentRefresh(url?: string) {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/register") ||
    url.includes("/auth/forgot-password")
  );
}

function isPermissionForbiddenMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("access denied") ||
    normalized.includes("permission") ||
    normalized.includes("forbidden") ||
    normalized.includes("do not have")
  );
}

function readAuthorizationHeader(
  headers: InternalAxiosRequestConfig["headers"]
): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof AxiosHeaders) {
    const value = headers.get("Authorization") ?? headers.get("authorization");
    return typeof value === "string" ? value : undefined;
  }
  const record = headers as Record<string, unknown>;
  const value = record.Authorization ?? record.authorization;
  return typeof value === "string" ? value : undefined;
}

function setAuthorizationHeader(
  headers: InternalAxiosRequestConfig["headers"],
  token: string
): void {
  const value = `Bearer ${token}`;
  if (!headers) return;
  if (headers instanceof AxiosHeaders) {
    headers.set("Authorization", value);
    return;
  }
  (headers as Record<string, string>).Authorization = value;
}

function forceLogoutRedirect() {
  // Inline clear to avoid circular import with auth-session → api
  clearApiAccessToken();
  try {
    localStorage.removeItem("musafir_user");
    localStorage.removeItem("divniq_user");
    localStorage.removeItem("divniq_token");
  } catch {
    // ignore storage errors
  }
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login";
  }
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ success: boolean; data: { accessToken: string } }>(
        `${api.defaults.baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      .then((response) => {
        const token = response.data?.data?.accessToken;
        if (!token) {
          throw new Error("Missing access token from refresh");
        }
        applyAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use(
  (config) => {
    // Always read the freshest token at request time (never cache on init).
    const token = getAccessToken();
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      setAuthorizationHeader(config.headers, token);
    }

    if (config.data instanceof FormData) {
      if (config.headers instanceof AxiosHeaders) {
        config.headers.delete("Content-Type");
      } else if (config.headers) {
        delete (config.headers as Record<string, unknown>)["Content-Type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError | unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipSilentRefresh(requestUrl)
    ) {
      const hadBearer = Boolean(
        readAuthorizationHeader(originalRequest.headers) || getAccessToken()
      );

      // Guest / pre-login 401s must not trigger refresh + hard logout.
      // That race was wiping a freshly issued access token after login.
      if (!hadBearer) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        if (!originalRequest.headers) {
          originalRequest.headers = new AxiosHeaders();
        }
        setAuthorizationHeader(originalRequest.headers, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        forceLogoutRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (status === 403) {
      if (!isAuthEndpoint(requestUrl)) {
        const serverMessage =
          typeof error.response?.data === "object" &&
          error.response.data &&
          "message" in error.response.data &&
          typeof (error.response.data as { message?: unknown }).message ===
            "string"
            ? String(
                (error.response.data as { message: string }).message
              ).trim()
            : "";

        if (
          !serverMessage ||
          isPermissionForbiddenMessage(serverMessage) ||
          serverMessage.toLowerCase().includes("owner")
        ) {
          toast.error(
            serverMessage ||
              "Action blocked: Permission recently revoked by Administrator",
            {
              className: glassForbiddenToastClass,
              duration: 5000,
            }
          );
          void triggerAuthRefresh();
        }
      }
    }

    return Promise.reject(error);
  }
);
