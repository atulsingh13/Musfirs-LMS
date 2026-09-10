import jwt from "jsonwebtoken";
import type { Server, Socket } from "socket.io";
import { env } from "../config/env.js";
import type { AuthJwtPayload } from "../controllers/authController.js";
import { User } from "../models/User.js";
import { OWNER_ROLES } from "../types/user.js";

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: string;
  };
}

let notificationIo: Server | null = null;

export function setNotificationIo(io: Server): void {
  notificationIo = io;
}

export function getNotificationIo(): Server | null {
  return notificationIo;
}

function extractHandshakeAccessToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string") {
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
      return token.trim();
    }
  }

  return undefined;
}

export function initSocketAuth(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const token = extractHandshakeAccessToken(socket);
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }

      const decoded = jwt.verify(token, env.jwtSecret) as AuthJwtPayload;
      if (decoded.type !== "access" || !decoded.id) {
        next(new Error("Unauthorized"));
        return;
      }

      const dbUser = await User.findById(decoded.id)
        .select("_id role status")
        .lean()
        .exec();

      if (!dbUser) {
        next(new Error("Unauthorized"));
        return;
      }

      if (String(dbUser.status).toLowerCase() === "suspended") {
        next(new Error("Account suspended"));
        return;
      }

      socket.data.userId = String(dbUser._id);
      socket.data.role = String(dbUser.role);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;

    void socket.join(userId);

    if (OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number])) {
      void socket.join("admin_room");
    }

    socket.on("disconnect", () => {
      // Room cleanup is handled automatically by Socket.io
    });
  });
}
