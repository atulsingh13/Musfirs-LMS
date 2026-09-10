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
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { getAccessToken } from "@/lib/auth-token";
import { createNotificationSocket } from "@/lib/socket";
import {
  fetchNotifications,
  type ApiNotification,
} from "@/services/notifications-api";
import type { Socket } from "socket.io-client";

const MAX_CACHED_NOTIFICATIONS = 20;

interface NotificationContextValue {
  unreadCount: number;
  latestNotifications: ApiNotification[];
  socketConnected: boolean;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: (by?: number) => void;
  prependNotification: (notification: ApiNotification) => void;
  resetLatestNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [unreadCount, setUnreadCountState] = useState(0);
  const [latestNotifications, setLatestNotifications] = useState<
    ApiNotification[]
  >([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, count));
  }, []);

  const decrementUnreadCount = useCallback((by = 1) => {
    setUnreadCountState((current) => Math.max(0, current - by));
  }, []);

  const prependNotification = useCallback((notification: ApiNotification) => {
    setLatestNotifications((prev) => {
      const id = notification.id || notification._id;
      if (prev.some((item) => (item.id || item._id) === id)) {
        return prev;
      }
      return [notification, ...prev].slice(0, MAX_CACHED_NOTIFICATIONS);
    });
  }, []);

  const resetLatestNotifications = useCallback(() => {
    setLatestNotifications([]);
  }, []);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      setUnreadCountState(0);
      setLatestNotifications([]);
      return;
    }

    let cancelled = false;

    async function bootstrapNotifications() {
      try {
        const response = await fetchNotifications({
          page: 1,
          limit: 1,
          filter: "all",
        });
        if (!cancelled) {
          setUnreadCountState(response.data.unreadCount ?? 0);
        }
      } catch {
        // Badge can still update via socket events
      }
    }

    void bootstrapNotifications();

    const socket = createNotificationSocket();
    socketRef.current = socket;
    socket.auth = { token: getAccessToken() ?? "" };

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("new_notification", (notification: ApiNotification) => {
      prependNotification(notification);
      setUnreadCountState((current) => current + 1);
      if (notification.title) {
        toast.info(notification.title, {
          description: notification.message,
        });
      }
    });

    socket.connect();

    return () => {
      cancelled = true;
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new_notification");
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [isAuthenticated, isAuthLoading, prependNotification]);

  const value = useMemo(
    () => ({
      unreadCount,
      latestNotifications,
      socketConnected,
      setUnreadCount,
      decrementUnreadCount,
      prependNotification,
      resetLatestNotifications,
    }),
    [
      unreadCount,
      latestNotifications,
      socketConnected,
      setUnreadCount,
      decrementUnreadCount,
      prependNotification,
      resetLatestNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
