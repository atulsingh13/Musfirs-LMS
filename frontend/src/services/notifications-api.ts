import { api } from "@/services/api";

export type NotificationType =
  | "FollowUp_Reminder"
  | "Password_Reset"
  | "SystemAlert"
  | "New_Lead";

export type NotificationFilter = "all" | "unread";

export interface ApiNotification {
  id: string;
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationsListResponse {
  success: boolean;
  data: {
    notifications: ApiNotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      currentPage?: number;
    };
    unreadCount: number;
    totalUnread?: number;
    hasMore?: boolean;
  };
}

export interface NotificationMutationResponse {
  success: boolean;
  message?: string;
  data: {
    notification?: ApiNotification;
    modifiedCount?: number;
    unreadCount: number;
  };
}

export async function fetchNotifications(params: {
  page?: number;
  limit?: number;
  filter?: NotificationFilter;
}): Promise<NotificationsListResponse> {
  const { data } = await api.get<NotificationsListResponse>("/notifications", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      filter: params.filter ?? "all",
    },
  });
  return data;
}

export async function markNotificationRead(
  id: string
): Promise<NotificationMutationResponse> {
  const { data } = await api.put<NotificationMutationResponse>(
    `/notifications/${id}/read`
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<NotificationMutationResponse> {
  const { data } = await api.put<NotificationMutationResponse>(
    "/notifications/read-all"
  );
  return data;
}
