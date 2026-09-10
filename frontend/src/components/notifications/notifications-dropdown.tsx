import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellRing,
  KeyRound,
  MoreHorizontal,
  ShieldAlert,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/context/notification-context";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
  type NotificationFilter,
} from "@/services/notifications-api";

const glassPanel = "glass-popover";

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
  });
}

function NotificationTypeIcon({ type }: { type: ApiNotification["type"] }) {
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

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: ApiNotification;
  onMarkRead: (id: string) => void;
}) {
  const unread = !notification.isRead;

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-xl px-3 py-2.5 transition-colors",
        unread
          ? "bg-blue-50/70 dark:bg-sky-950/40"
          : "bg-transparent hover:bg-muted/40"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
        )}
      >
        <NotificationTypeIcon type={notification.type} />
      </div>

      <div className="min-w-0 flex-1 pr-8">
        <p className="text-sm font-semibold text-foreground">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        {unread ? (
          <span className="size-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]" />
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
                  aria-label="Notification actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className={cn("w-40", glassPanel)}>
              <DropdownMenuItem
                onClick={() => onMarkRead(notificationId(notification))}
              >
                Mark as read
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

export function NotificationsDropdown() {
  const {
    unreadCount,
    setUnreadCount,
    latestNotifications,
    resetLatestNotifications,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const hasInitialFetchedRef = useRef(false);

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
          response.data.hasMore ?? nextPage * limit < (response.data.pagination?.total ?? 0);
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

  const previousFilterRef = useRef<NotificationFilter | null>(null);

  useEffect(() => {
    if (!open) return;

    if (latestNotifications.length > 0) {
      setNotifications((prev) => mergeNotifications(prev, latestNotifications));
      resetLatestNotifications();
    }
  }, [open, latestNotifications, resetLatestNotifications]);

  useEffect(() => {
    if (!open) return;

    if (!hasInitialFetchedRef.current) {
      hasInitialFetchedRef.current = true;
      previousFilterRef.current = filter;
      setPage(1);
      setHasMore(true);
      void loadPage(1, filter, false);
      return;
    }

    if (previousFilterRef.current !== filter) {
      previousFilterRef.current = filter;
      setPage(1);
      setHasMore(true);
      void loadPage(1, filter, false);
    }
  }, [open, filter, loadPage]);

  useEffect(() => {
    if (!open || !hasMore || isInitialLoading) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          void loadPage(page + 1, filter, true);
        }
      },
      { root: node.parentElement, rootMargin: "40px", threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [open, hasMore, isInitialLoading, page, filter, loadPage]);

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

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] leading-none font-semibold text-white shadow-sm">
                {badgeLabel}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn("w-96 p-0", glassPanel)}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/30 px-4 py-3 dark:border-white/10">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                onClick={() => void handleMarkAllRead()}
              >
                Mark all
              </button>
            ) : null}
            <Link
              to="/notifications"
              className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
              onClick={() => setOpen(false)}
            >
              See all
            </Link>
          </div>
        </div>

        <div className="flex gap-2 border-b border-white/30 px-4 py-2 dark:border-white/10">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === value
                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {value === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
          {isInitialLoading ? (
            <>
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {filter === "unread"
                ? "No unread notifications."
                : "You're all caught up."}
            </p>
          ) : (
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notificationId(notification)}
                  notification={notification}
                  onMarkRead={(id) => void handleMarkRead(id)}
                />
              ))}
              {isLoadingMore ? (
                <>
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </>
              ) : null}
              {hasMore ? <div ref={sentinelRef} className="h-4" /> : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
