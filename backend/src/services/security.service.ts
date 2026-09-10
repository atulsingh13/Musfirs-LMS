import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { createAndEmitNotification } from "./notification.service.js";
import { OWNER_ROLES } from "../types/user.js";

export async function notifyAdmins(input: {
  type: "SystemAlert" | "Password_Reset";
  title: string;
  message: string;
  relatedId?: string | Types.ObjectId;
}) {
  const admins = await User.find({ role: { $in: [...OWNER_ROLES] } })
    .select("_id")
    .lean()
    .exec();

  await Promise.all(
    admins.map((admin) =>
      createAndEmitNotification({
        recipient: admin._id,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedId: input.relatedId ?? null,
      }).catch((error) => {
        console.error(
          "[security] Failed to notify admin:",
          error instanceof Error ? error.message : error
        );
      })
    )
  );
}

export async function notifyAdminsSystemAlert(
  message: string,
  relatedUserId: string | Types.ObjectId
) {
  await notifyAdmins({
    type: "SystemAlert",
    title: "Account suspended",
    message,
    relatedId: relatedUserId,
  });
}

export async function notifyAdminsPasswordResetRequest(user: {
  _id: Types.ObjectId | string;
  first_name?: string;
  last_name?: string;
  work_email?: string;
}) {
  const name =
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
    user.work_email ||
    "A user";
  const email = user.work_email ?? "unknown";

  await notifyAdmins({
    type: "Password_Reset",
    title: "Password reset requested",
    message: `User ${name} (${email}) has requested a password reset.`,
    relatedId: user._id,
  });
}

/** Automated security events use the affected user as both target and actor. */
export async function createSecurityAuditLog(
  targetUserId: string | Types.ObjectId,
  action: string
) {
  const userId = new Types.ObjectId(String(targetUserId));
  await AuditLog.create({
    targetUser: userId,
    changedBy: userId,
    moduleName: "Security",
    action,
    changeType: "Restricted",
  });
}

export async function notifyOwnersOfPasswordReset(targetUser: {
  _id: Types.ObjectId | string;
  first_name?: string;
  last_name?: string;
  work_email?: string;
}) {
  const targetName =
    `${targetUser.first_name ?? ""} ${targetUser.last_name ?? ""}`.trim() ||
    targetUser.work_email ||
    "a user";

  await notifyAdmins({
    type: "Password_Reset",
    title: "Password reset issued",
    message: `A temporary password was set for ${targetName}.`,
    relatedId: targetUser._id,
  });
}
