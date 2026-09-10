/**
 * Tiny registry so Axios can trigger a permissions refresh without importing
 * React context (avoids circular deps between api.ts and auth-context).
 */

type AuthRefreshHandler = () => Promise<void>;

let refreshHandler: AuthRefreshHandler | null = null;
let lastRefreshAt = 0;
const REFRESH_THROTTLE_MS = 3_000;

export function setAuthRefreshHandler(handler: AuthRefreshHandler | null) {
  refreshHandler = handler;
}

export async function triggerAuthRefresh(): Promise<void> {
  if (!refreshHandler) return;

  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_THROTTLE_MS) return;
  lastRefreshAt = now;

  try {
    await refreshHandler();
  } catch {
    // Ignore transient refresh failures
  }
}
