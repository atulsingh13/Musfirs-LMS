import cron from "node-cron";
import { Lead } from "../models/Lead.js";
import {
  createAndEmitNotification,
  hasRecentFollowUpReminder,
} from "./notification.service.js";

function leadDisplayName(lead: {
  firstName?: string;
  lastName?: string;
}): string {
  return `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "a lead";
}

/**
 * Every minute: find leads whose follow-up is ~30 minutes away
 * (window [now+29m, now+30m]) and notify assignedTo || createdBy.
 */
async function processFollowUpReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 29 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const leads = await Lead.find({
    $or: [
      { nextFollowUpDate: { $gte: windowStart, $lte: windowEnd } },
      { nextFollowUp: { $gte: windowStart, $lte: windowEnd } },
    ],
  })
    .select("_id firstName lastName assignedTo createdBy")
    .lean()
    .exec();

  for (const lead of leads) {
    const recipientId = lead.assignedTo ?? lead.createdBy;
    if (!recipientId) continue;

    const alreadySent = await hasRecentFollowUpReminder(
      recipientId,
      lead._id
    );
    if (alreadySent) continue;

    const name = leadDisplayName(lead);
    try {
      await createAndEmitNotification({
        recipient: recipientId,
        type: "FollowUp_Reminder",
        title: "Follow-up reminder",
        message: `Follow-up with ${name} is due in 30 minutes.`,
        relatedId: lead._id,
      });
    } catch (error) {
      console.error(
        "[cron] Failed to create follow-up notification:",
        error instanceof Error ? error.message : error
      );
    }
  }
}

export function startCronJobs(): void {
  cron.schedule("* * * * *", () => {
    void processFollowUpReminders().catch((error) => {
      console.error(
        "[cron] Follow-up reminder job failed:",
        error instanceof Error ? error.message : error
      );
    });
  });

  console.log("[cron] Follow-up reminder job scheduled (* * * * *)");
}
