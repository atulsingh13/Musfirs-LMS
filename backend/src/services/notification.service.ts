import { Types } from "mongoose";
import {
  Notification,
  type NotificationType,
} from "../models/Notification.js";
import { getNotificationIo } from "../socket/index.js";

export interface CreateNotificationInput {
  recipient: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | Types.ObjectId | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return Notification.create({
    recipient: input.recipient,
    type: input.type,
    title: input.title,
    message: input.message,
    relatedId: input.relatedId ?? null,
    isRead: false,
  });
}

export async function createAndEmitNotification(input: CreateNotificationInput) {
  const doc = await createNotification(input);
  const payload = toApiNotification(doc);
  getNotificationIo()
    ?.to(String(doc.recipient))
    .emit("new_notification", payload);
  return doc;
}

/** Skip if a similar reminder was already created recently (cron dedupe). */
export async function hasRecentFollowUpReminder(
  recipientId: string | Types.ObjectId,
  leadId: string | Types.ObjectId,
  withinMinutes = 25
): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000);
  const existing = await Notification.exists({
    recipient: recipientId,
    type: "FollowUp_Reminder",
    relatedId: leadId,
    createdAt: { $gte: since },
  }).exec();
  return Boolean(existing);
}

export function toApiNotification(doc: {
  _id: Types.ObjectId | string;
  recipient: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(doc._id),
    _id: String(doc._id),
    recipient: String(doc.recipient),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    isRead: Boolean(doc.isRead),
    relatedId: doc.relatedId ? String(doc.relatedId) : null,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : undefined,
  };
}
