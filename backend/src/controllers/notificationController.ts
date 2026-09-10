import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Notification } from "../models/Notification.js";
import { toApiNotification } from "../services/notification.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new AppError("Unauthorized", 401);
  return id;
}

/** GET /api/notifications */
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const filter = String(req.query.filter ?? "all").trim().toLowerCase();
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      recipient: userId,
    };
    if (filter === "unread") {
      query.isRead = false;
    }

    const [rows, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Notification.countDocuments(query).exec(),
      Notification.countDocuments({ recipient: userId, isRead: false }).exec(),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));
    const hasMore = page * limit < total;

    res.status(200).json({
      success: true,
      data: {
        notifications: rows.map((row) => toApiNotification(row)),
        pagination: {
          page,
          limit,
          total,
          pages,
          currentPage: page,
        },
        unreadCount,
        totalUnread: unreadCount,
        hasMore,
      },
    });
  }
);

/** PUT /api/notifications/read-all */
export const markAllNotificationsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    ).exec();

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        modifiedCount: result.modifiedCount,
        unreadCount: 0,
      },
    });
  }
);

/** PUT /api/notifications/:id/read */
export const markNotificationRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const id = String(req.params.id ?? "");

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Notification not found", 404);
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true } },
      { new: true }
    )
      .lean()
      .exec();

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    }).exec();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        notification: toApiNotification(notification),
        unreadCount,
      },
    });
  }
);
