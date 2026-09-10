import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Event, type EventKind, type IEvent } from "../models/Event.js";
import { Lead } from "../models/Lead.js";
import { Task, type ITask } from "../models/Task.js";
import { OWNER_ROLES } from "../types/user.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function isOwnerRole(role?: string): boolean {
  return !!role && OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number]);
}

/** Shape expected by frontend `ApiCalendarEvent`. */
function toCalendarEvent(doc: IEvent & { _id: Types.ObjectId }) {
  const start = new Date(doc.start);
  const end = doc.end ? new Date(doc.end) : new Date(start);
  const meetingType = doc.meetingType || doc.status || "Other";

  return {
    id: String(doc._id),
    title: doc.title,
    date: start.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    type: "event" as const,
    status: meetingType,
    isCompleted: false,
    rawData: {
      description: doc.description ?? "",
      meetingLink: doc.meetingLink ?? "",
      participants: doc.participants ?? [],
      type: meetingType,
      kind: doc.type,
      createdBy: String(doc.createdBy),
      entryType: "event",
    },
  };
}

function toCalendarTask(doc: ITask & { _id: Types.ObjectId }) {
  const deadline = new Date(doc.deadline);
  return {
    id: String(doc._id),
    title: doc.title,
    date: deadline.toISOString(),
    startDate: deadline.toISOString(),
    endDate: deadline.toISOString(),
    type: "task" as const,
    status: doc.isCompleted ? "Completed" : "Open",
    isCompleted: Boolean(doc.isCompleted),
    rawData: {
      description: doc.description ?? "",
      isCompleted: Boolean(doc.isCompleted),
      createdBy: String(doc.createdBy),
      entryType: "task",
    },
  };
}

function toCalendarFollowUp(lead: {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  email?: string;
  nextFollowUpDate?: Date | null;
  nextFollowUp?: Date | null;
  isFollowUpCompleted?: boolean;
  status?: string;
  destination?: string;
  createdBy?: Types.ObjectId;
}) {
  const followUp =
    lead.nextFollowUpDate != null
      ? new Date(lead.nextFollowUpDate)
      : lead.nextFollowUp != null
        ? new Date(lead.nextFollowUp)
        : null;

  if (!followUp || Number.isNaN(followUp.getTime())) {
    return null;
  }

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  const title = name
    ? `Follow-up: ${name}`
    : "Follow-up: Lead";
  const isCompleted = Boolean(lead.isFollowUpCompleted);

  return {
    id: String(lead._id),
    title,
    date: followUp.toISOString(),
    startDate: followUp.toISOString(),
    endDate: followUp.toISOString(),
    type: "follow-up" as const,
    status: lead.status ?? "Follow-up",
    isCompleted,
    rawData: {
      description: lead.destination
        ? `Destination: ${lead.destination}`
        : "",
      leadName: name,
      leadId: String(lead._id),
      contactNumber: lead.contactNumber ?? "",
      email: lead.email ?? "",
      isFollowUpCompleted: isCompleted,
      createdBy: lead.createdBy ? String(lead.createdBy) : undefined,
      entryType: "follow-up",
    },
  };
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickEventPayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const meetingLink = String(body.meetingLink ?? "").trim();
  const meetingType = String(
    body.eventType ?? body.type ?? body.meetingType ?? "Internal Sync"
  ).trim();

  const start =
    parseDate(body.startTime) ??
    parseDate(body.startDate) ??
    parseDate(body.start) ??
    parseDate(body.date);

  const end =
    parseDate(body.endTime) ??
    parseDate(body.endDate) ??
    parseDate(body.end) ??
    null;

  let kind: EventKind = "meeting";
  const rawKind = String(body.eventKind ?? body.kind ?? "").toLowerCase();
  if (rawKind === "task" || rawKind === "deadline") {
    kind = rawKind;
  }

  const participants = Array.isArray(body.participants)
    ? body.participants.map((p) => String(p))
    : [];

  return {
    title,
    description,
    meetingLink,
    meetingType,
    start,
    end,
    type: kind,
    status: meetingType,
    participants,
  };
}

/** GET /api/calendar/events */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const events = await Event.find({ createdBy: userId })
    .sort({ start: 1 })
    .lean()
    .exec();
  const mapped = events.map((event) =>
    toCalendarEvent(event as IEvent & { _id: Types.ObjectId })
  );

  res.status(200).json({
    success: true,
    count: mapped.length,
    data: { events: mapped },
  });
});

/**
 * GET /api/calendar/all
 * Combined events + personal tasks + lead follow-ups for the calendar grid.
 */
export const getAllCalendarItems = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const owner = isOwnerRole(req.user?.role);
    const userObjectId = new Types.ObjectId(userId);

    const eventFilter = { createdBy: userObjectId };
    const taskFilter = { createdBy: userObjectId };

    const followUpDateClause = {
      $or: [
        { nextFollowUpDate: { $exists: true, $ne: null } },
        { nextFollowUp: { $exists: true, $ne: null } },
      ],
    };

    // Owners see all scheduled follow-ups; staff see created OR assigned leads.
    const leadFilter: Record<string, unknown> = owner
      ? followUpDateClause
      : {
          $and: [
            {
              $or: [
                { createdBy: userObjectId },
                { assignedTo: userObjectId },
              ],
            },
            followUpDateClause,
          ],
        };

    const [events, tasks, leads] = await Promise.all([
      Event.find(eventFilter).sort({ start: 1 }).lean().exec(),
      Task.find(taskFilter).sort({ deadline: 1 }).lean().exec(),
      Lead.find(leadFilter).lean().exec(),
    ]);

    const mappedEvents = events.map((event) =>
      toCalendarEvent(event as IEvent & { _id: Types.ObjectId })
    );
    const mappedTasks = tasks.map((task) =>
      toCalendarTask(task as ITask & { _id: Types.ObjectId })
    );
    const mappedFollowUps = leads
      .map((lead) =>
        toCalendarFollowUp(
          lead as {
            _id: Types.ObjectId;
            firstName?: string;
            lastName?: string;
            contactNumber?: string;
            email?: string;
            nextFollowUpDate?: Date | null;
            nextFollowUp?: Date | null;
            isFollowUpCompleted?: boolean;
            status?: string;
            destination?: string;
            createdBy?: Types.ObjectId;
          }
        )
      )
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const items = [...mappedEvents, ...mappedTasks, ...mappedFollowUps].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    res.status(200).json({
      success: true,
      count: items.length,
      data: { events: items },
    });
  }
);

/** POST /api/calendar/tasks */
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const deadline =
    parseDate(body.deadline) ??
    parseDate(body.date) ??
    parseDate(body.startTime) ??
    null;

  if (!title) {
    throw new AppError("Title is required", 400);
  }
  if (!deadline) {
    throw new AppError("Deadline is required", 400);
  }

  const task = await Task.create({
    title,
    deadline,
    description,
    isCompleted: false,
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: {
      event: toCalendarTask(task.toObject() as ITask & { _id: Types.ObjectId }),
    },
  });
});

/** PUT /api/calendar/tasks/:id/complete — toggles isCompleted */
export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const id = String(req.params.id ?? "");
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("Task not found", 404);
  }

  const existing = await Task.findById(id).exec();
  if (!existing) {
    throw new AppError("Task not found", 404);
  }

  if (
    String(existing.createdBy) !== userId &&
    !isOwnerRole(req.user?.role)
  ) {
    throw new AppError("Forbidden", 403);
  }

  existing.isCompleted = !existing.isCompleted;
  await existing.save();

  res.status(200).json({
    success: true,
    message: existing.isCompleted
      ? "Task marked as completed"
      : "Task marked as incomplete",
    data: {
      event: toCalendarTask(
        existing.toObject() as ITask & { _id: Types.ObjectId }
      ),
    },
  });
});

/** POST /api/calendar/events */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const payload = pickEventPayload((req.body ?? {}) as Record<string, unknown>);

  if (!payload.title) {
    throw new AppError("Title is required", 400);
  }
  if (!payload.start) {
    throw new AppError("Start date/time is required", 400);
  }

  const event = await Event.create({
    title: payload.title,
    start: payload.start,
    end: payload.end,
    description: payload.description,
    type: payload.type,
    meetingType: payload.meetingType,
    status: payload.status,
    meetingLink: payload.meetingLink,
    participants: payload.participants,
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    data: {
      event: toCalendarEvent(event.toObject() as IEvent & { _id: Types.ObjectId }),
    },
  });
});

/** PUT /api/calendar/events/:id */
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("Event not found", 404);
  }

  const payload = pickEventPayload((req.body ?? {}) as Record<string, unknown>);
  if (!payload.title) {
    throw new AppError("Title is required", 400);
  }
  if (!payload.start) {
    throw new AppError("Start date/time is required", 400);
  }

  const event = await Event.findByIdAndUpdate(
    id,
    {
      $set: {
        title: payload.title,
        start: payload.start,
        end: payload.end,
        description: payload.description,
        type: payload.type,
        meetingType: payload.meetingType,
        status: payload.status,
        meetingLink: payload.meetingLink,
        participants: payload.participants,
      },
    },
    { new: true }
  )
    .lean()
    .exec();

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Event updated successfully",
    data: {
      event: toCalendarEvent(event as IEvent & { _id: Types.ObjectId }),
    },
  });
});

/** DELETE /api/calendar/events/:id */
export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError("Event not found", 404);
  }

  const event = await Event.findByIdAndDelete(id).lean().exec();
  if (!event) {
    throw new AppError("Event not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});

export default {
  getEvents,
  getAllCalendarItems,
  createEvent,
  updateEvent,
  deleteEvent,
  createTask,
  completeTask,
};
