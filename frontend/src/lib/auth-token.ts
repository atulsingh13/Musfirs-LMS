const ACCESS_TOKEN_KEY = "musafir_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  // legacy keys
  localStorage.removeItem("divniq_token");
  localStorage.removeItem("token");
}

export { ACCESS_TOKEN_KEY };
