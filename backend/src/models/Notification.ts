import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "FollowUp_Reminder",
  "Password_Reset",
  "SystemAlert",
  "New_Lead",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1, relatedId: 1, createdAt: -1 });

export type NotificationDocument = HydratedDocument<INotification>;
export type NotificationModel = Model<INotification>;

export const Notification: NotificationModel =
  (mongoose.models.Notification as NotificationModel | undefined) ??
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
