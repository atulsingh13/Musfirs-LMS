import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth-token";

function resolveSocketUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return explicit;

  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, "");

  return "http://localhost:5000";
}

export function createNotificationSocket(): Socket {
  const socket = io(resolveSocketUrl(), {
    withCredentials: true,
    autoConnect: false,
  });
  // Read token at connect time so refreshed access tokens are used.
  socket.auth = { token: getAccessToken() ?? "" };
  return socket;
}

export function getSocketUrl(): string {
  return resolveSocketUrl();
}
