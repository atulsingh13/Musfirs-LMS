import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  KeyRound,
  MoreHorizontal,
  ShieldAlert,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { NotificationSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/context/notification-context";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
  type NotificationFilter,
} from "@/services/notifications-api";

const glassCard =
  "rounded-2xl border border-white/40 bg-white/15 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5";

function notificationId(notification: ApiNotification): string {
  return notification.id || notification._id;
}

function mergeNotifications(
  primary: ApiNotification[],
  incoming: ApiNotification[]
): ApiNotification[] {
  const seen = new Set(primary.map(notificationId));
  const prepended = incoming.filter((item) => !seen.has(notificationId(item)));
  return [...prepended, ...primary];
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TypeIcon({ type }: { type: ApiNotification["type"] }) {
  if (type === "FollowUp_Reminder") {
    return <BellRing className="size-4 text-orange-600" />;
  }
  if (type === "Password_Reset") {
    return <KeyRound className="size-4 text-sky-600" />;
  }
  if (type === "New_Lead") {
    return <Target className="size-4 text-emerald-600" />;
  }
  return <ShieldAlert className="size-4 text-violet-600" />;
}

function getNotificationRoute(notification: ApiNotification): string | null {
  if (!notification.relatedId) return null;

  if (
    notification.type === "FollowUp_Reminder" ||
    notification.type === "New_Lead"
  ) {
    return `/leads?view=${notification.relatedId}`;
  }

  if (
    notification.type === "Password_Reset" ||
    notification.type === "SystemAlert"
  ) {
    return `/users/${notification.relatedId}`;
  }

  return null;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    unreadCount,
    setUnreadCount,
    latestNotifications,
    resetLatestNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, nextFilter: NotificationFilter, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (append) setIsLoadingMore(true);
      else setIsInitialLoading(true);

      try {
        const limit = nextPage === 1 ? 10 : 5;
        const response = await fetchNotifications({
          page: nextPage,
          limit,
          filter: nextFilter,
        });
        const batch = response.data.notifications ?? [];
        setNotifications((prev) =>
          append ? mergeNotifications(prev, batch) : batch
        );
        setUnreadCount(
          response.data.unreadCount ??
            response.data.totalUnread ??
            0
        );
        const pages = response.data.pagination?.pages ?? 1;
        const responseHasMore =
          response.data.hasMore ??
          nextPage * limit < (response.data.pagination?.total ?? 0);
        setHasMore(responseHasMore && nextPage < pages && batch.length > 0);
        setPage(nextPage);
      } catch {
        if (!append) {
          toast.error("Failed to load notifications.");
          setNotifications([]);
          setHasMore(false);
        }
      } finally {
        loadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [setUnreadCount]
  );

  useEffect(() => {
    if (latestNotifications.length > 0) {
      setNotifications((prev) => mergeNotifications(prev, latestNotifications));
      resetLatestNotifications();
    }
  }, [latestNotifications, resetLatestNotifications]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPage(1, filter, false);
  }, [filter, loadPage]);

  useEffect(() => {
    if (!hasMore || isInitialLoading) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          void loadPage(page + 1, filter, true);
        }
      },
      { rootMargin: "80px", threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isInitialLoading, page, filter, loadPage]);

  async function handleMarkRead(id: string) {
    try {
      const response = await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) =>
          notificationId(item) === id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount(response.data.unreadCount ?? Math.max(0, unreadCount - 1));
    } catch {
      toast.error("Failed to mark notification as read.");
    }
  }

  async function handleMarkAllRead() {
    try {
      const response = await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(response.data.unreadCount ?? 0);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  }

  async function handleNotificationClick(notification: ApiNotification) {
    const id = notificationId(notification);

    if (!notification.isRead) {
      await handleMarkRead(id);
    }

    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
    }
  }

  return (
    <PageShell
      title="Notifications"
      description="Stay on top of follow-ups, password resets, and system alerts."
      actions={
        unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleMarkAllRead()}
          >
            Mark all as read
          </Button>
        ) : null
      }
    >
      <div className={cn(glassCard, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-white/30 px-4 py-3 dark:border-white/10">
          <div className="flex gap-2">
            {(["all", "unread"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === value
                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {value === "all" ? "All Notifications" : "Unread Only"}
              </button>
            ))}
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-300">
              {unreadCount} unread
            </span>
          ) : null}
        </div>

        <div className="max-h-[calc(100vh-240px)] space-y-1 overflow-y-auto p-3">
          {isInitialLoading ? (
            <>
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-12 text-center text-sm text-muted-foreground">
              {filter === "unread"
                ? "No unread notifications."
                : "No notifications yet."}
            </p>
          ) : (
            <>
              {notifications.map((notification) => {
                const unread = !notification.isRead;
                const id = notificationId(notification);
                const route = getNotificationRoute(notification);

                return (
                  <div
                    key={id}
                    role={route ? "button" : undefined}
                    tabIndex={route ? 0 : undefined}
                    onClick={() => void handleNotificationClick(notification)}
                    onKeyDown={(event) => {
                      if (!route) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleNotificationClick(notification);
                      }
                    }}
                    className={cn(
                      "group relative flex gap-3 rounded-xl px-3 py-3 transition-colors",
                      route ? "cursor-pointer" : "cursor-default",
                      unread
                        ? "bg-blue-50/70 dark:bg-sky-950/40"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-white/10">
                      <TypeIcon type={notification.type} />
                    </div>
                    <div className="min-w-0 flex-1 pr-10">
                      <p className="text-sm font-semibold">{notification.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      {unread ? (
                        <span className="size-2 rounded-full bg-sky-500" />
                      ) : null}
                      {unread ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="size-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleMarkRead(id);
                              }}
                            >
                              Mark as read
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {isLoadingMore ? (
                <>
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </>
              ) : null}
              {hasMore ? <div ref={sentinelRef} className="h-6" /> : null}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
