import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  Lead,
  LEAD_STATUSES,
  type ILead,
  type LeadStatus,
} from "../models/Lead.js";
import { LeadActivity } from "../models/LeadActivity.js";
import { User } from "../models/User.js";
import { OWNER_ROLES } from "../types/user.js";
import { getNextAvailableStaff } from "../services/assignment.service.js";
import {
  logLeadActivity,
  logLeadActivitySafe,
  toApiLeadActivity,
} from "../services/leadActivity.service.js";
import { createAndEmitNotification } from "../services/notification.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const IN_PROGRESS_STATUSES = [
  "Qualification Pending",
  "Qualified",
  "Plan Shared",
  "Follow-up Later",
  "Payment Pending",
  "Hot / Payment Pending",
];

const BOOKED_STATUSES = ["Advance Paid", "Booked"];

const CLOSED_STATUSES = ["Not Qualified", "Closed", "Not Interested"];

type LeanLead = ILead & { _id: Types.ObjectId };

type PopulatedUser = {
  _id: Types.ObjectId;
  first_name?: string;
  last_name?: string;
};

function populateLeadQuery<T>(query: T): T {
  return (query as ReturnType<typeof Lead.find>)
    .populate("assignedTo", "first_name last_name")
    .populate("createdBy", "first_name last_name")
    .populate("statusUpdatedBy", "first_name last_name") as T;
}

export async function findLeadForUser(
  id: string,
  req: Request,
  populate = false
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Lead not found", 404);
  }

  const filter = combineFilters({ _id: id }, buildScopeFilter(req));
  let query = Lead.findOne(filter);
  if (populate) {
    query = populateLeadQuery(query);
  }

  const lead = await query.lean().exec();
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  return lead as LeanLead;
}

function oidString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Types.ObjectId) return String(value);
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id ?? "");
  }
  return String(value);
}

function dateIso(value: unknown): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

async function resolveUserDisplayName(
  userId: string | Types.ObjectId | null | undefined
): Promise<string> {
  if (!userId || !Types.ObjectId.isValid(String(userId))) return "Unassigned";
  const user = await User.findById(userId)
    .select("first_name last_name")
    .lean()
    .exec();
  if (!user) return "Unknown user";
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Unknown user";
}

function formatFollowUpLabel(value: Date | null | undefined): string {
  if (!value) return "cleared";
  return value.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isOwnerRole(role?: string): boolean {
  return !!role && OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number]);
}

function isStaffRole(role?: string): boolean {
  return role === "Staff" || role === "Employee";
}

function buildScopeFilter(req: Request): Record<string, unknown> {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || isOwnerRole(role)) {
    return {};
  }

  if (isStaffRole(role)) {
    const oid = new Types.ObjectId(userId);
    return {
      $or: [{ assignedTo: oid }, { createdBy: oid }],
    };
  }

  return {};
}

function combineFilters(
  ...parts: Record<string, unknown>[]
): Record<string, unknown> {
  const active = parts.filter((part) => Object.keys(part).length > 0);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}

function toApiUserRef(user: unknown) {
  if (!user || typeof user !== "object") return null;
  const doc = user as PopulatedUser | Types.ObjectId | string;

  if (doc instanceof Types.ObjectId || typeof doc === "string") {
    return { _id: String(doc), first_name: "", last_name: "", name: "" };
  }

  if (!("_id" in doc) || !doc._id) return null;

  const firstName = String(doc.first_name ?? "");
  const lastName = String(doc.last_name ?? "");
  return {
    _id: String(doc._id),
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim() || "—",
  };
}

function userDisplayName(user: ReturnType<typeof toApiUserRef>): string {
  if (!user) return "—";
  return user.name || "—";
}

function displayName(lead: Pick<ILead, "firstName" | "lastName">): string {
  return `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim();
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/** Map Mongo lead → frontend ApiLead shape. */
export function toApiLead(lead: LeanLead & Record<string, unknown>) {
  const name = displayName(lead);
  const source = String(lead.leadSource || "Website");
  const assignedTo = toApiUserRef(lead.assignedTo);
  const createdBy = toApiUserRef(lead.createdBy);
  const statusUpdatedBy = toApiUserRef(lead.statusUpdatedBy);

  return {
    _id: String(lead._id),
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    name,
    age: lead.age ?? 0,
    gender: lead.gender ?? "Other",
    destination: lead.destination,
    pax: lead.pax ?? 1,
    numberOfPax: lead.pax ?? 1,
    contactNumber: lead.contactNumber,
    dateOfTravel: lead.dateOfTravel
      ? new Date(lead.dateOfTravel).toISOString()
      : "",
    email: lead.email ?? "",
    city: lead.city ?? "",
    leadSource: source,
    source,
    campaign: lead.campaign ?? "",
    status: lead.status,
    nextFollowUp: lead.nextFollowUp
      ? new Date(lead.nextFollowUp).toISOString()
      : lead.nextFollowUpDate
        ? new Date(lead.nextFollowUpDate).toISOString()
        : null,
    nextFollowUpDate: lead.nextFollowUpDate
      ? new Date(lead.nextFollowUpDate).toISOString()
      : lead.nextFollowUp
        ? new Date(lead.nextFollowUp).toISOString()
        : null,
    isFollowUpCompleted: Boolean(lead.isFollowUpCompleted),
    createdAt: lead.createdAt
      ? new Date(lead.createdAt).toISOString()
      : undefined,
    updatedAt: lead.updatedAt
      ? new Date(lead.updatedAt).toISOString()
      : undefined,
    totalAmount: Number(lead.totalAmount ?? 0),
    advancePaid: Number(lead.advancePaid ?? 0),
    assignedTo,
    assignedToName: userDisplayName(assignedTo),
    createdBy,
    statusUpdatedBy,
    statusUpdatedAt: lead.statusUpdatedAt
      ? new Date(lead.statusUpdatedAt).toISOString()
      : null,
    statusUpdatedByName: userDisplayName(statusUpdatedBy),
  };
}

function parseDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickLeadPayload(body: Record<string, unknown>) {
  let firstName = String(body.firstName ?? body.first_name ?? "").trim();
  let lastName = String(body.lastName ?? body.last_name ?? "").trim();

  if (!firstName && body.name) {
    const split = splitName(String(body.name));
    firstName = split.firstName;
    lastName = split.lastName;
  }

  const leadSourceRaw = String(
    body.leadSource ?? body.source ?? "Website"
  ).trim();
  const statusRaw = String(body.status ?? "New Lead").trim();

  const paxRaw = body.pax ?? body.numberOfPax;
  const pax = Math.max(1, Number(paxRaw) || 1);

  const ageRaw = body.age;
  const age =
    ageRaw === undefined || ageRaw === null || ageRaw === ""
      ? undefined
      : Number(ageRaw);

  return {
    firstName,
    lastName,
    city: String(body.city ?? "").trim(),
    age: Number.isFinite(age) ? age : undefined,
    gender: String(body.gender ?? "Other").trim() || "Other",
    destination: String(body.destination ?? "").trim(),
    pax,
    contactNumber: String(body.contactNumber ?? "").trim(),
    dateOfTravel: parseDate(body.dateOfTravel),
    leadSource: leadSourceRaw || "Website",
    status: (LEAD_STATUSES.includes(statusRaw as LeadStatus)
      ? statusRaw
      : "New Lead") as LeadStatus,
    email: String(body.email ?? "").trim().toLowerCase(),
    campaign: String(body.campaign ?? "").trim(),
    nextFollowUp: parseDate(body.nextFollowUp ?? body.nextFollowUpDate),
    nextFollowUpDate: parseDate(body.nextFollowUpDate ?? body.nextFollowUp),
    totalAmount: parseMoney(body.totalAmount),
    advancePaid: parseMoney(body.advancePaid),
  };
}

function parseMoney(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function buildLeadFilter(query: Request["query"]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const status = String(query.status ?? "").trim();
  if (status && status !== "all") {
    filter.status = status;
  }

  const leadSource = String(
    query.leadSource ?? query.source ?? ""
  ).trim();
  if (leadSource && leadSource !== "all") {
    filter.leadSource = leadSource;
  }

  const destination = String(query.destination ?? "").trim();
  if (destination) {
    filter.destination = { $regex: escapeRegex(destination), $options: "i" };
  }

  const numberOfPax = String(query.numberOfPax ?? query.pax ?? "").trim();
  if (numberOfPax && numberOfPax !== "all") {
    if (numberOfPax.endsWith("+")) {
      const min = Number(numberOfPax.replace("+", ""));
      if (Number.isFinite(min)) filter.pax = { $gte: min };
    } else {
      const exact = Number(numberOfPax);
      if (Number.isFinite(exact)) filter.pax = exact;
    }
  }

  const travelDate = String(query.travelDate ?? "").trim();
  const startDate = String(query.startDate ?? "").trim();
  const endDate = String(query.endDate ?? "").trim();

  if (travelDate) {
    const day = parseDate(travelDate);
    if (day) {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      filter.dateOfTravel = { $gte: dayStart, $lte: dayEnd };
    }
  } else if (startDate || endDate) {
    const range: Record<string, Date> = {};
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (start) {
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    if (Object.keys(range).length > 0) {
      filter.dateOfTravel = range;
    }
  }

  if (
    String(query.followUpsDueToday ?? "") === "true" ||
    String(query.followUp ?? "").trim() === "today"
  ) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const followUpClause = {
      $or: [
        { nextFollowUpDate: { $gte: dayStart, $lte: dayEnd } },
        { nextFollowUp: { $gte: dayStart, $lte: dayEnd } },
      ],
    };
    const existingAnd = Array.isArray(filter.$and)
      ? (filter.$and as Record<string, unknown>[])
      : [];
    filter.$and = [...existingAnd, followUpClause];
  }

  if (String(query.created ?? "").trim() === "today") {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: dayStart, $lte: dayEnd };
  }

  const search = String(query.search ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (search) {
    const escaped = escapeRegex(search);
    const fieldRegex = { $regex: escaped, $options: "i" };

    // firstName + lastName are separate fields — concat before matching full names
    // like "aman kumar". Also keep single-field matches for partial first/last.
    const searchClause = {
      $or: [
        {
          $expr: {
            $regexMatch: {
              input: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$firstName", ""] },
                      " ",
                      { $ifNull: ["$lastName", ""] },
                    ],
                  },
                },
              },
              regex: escaped,
              options: "i",
            },
          },
        },
        { firstName: fieldRegex },
        { lastName: fieldRegex },
        { email: fieldRegex },
        { contactNumber: fieldRegex },
        { destination: fieldRegex },
        { city: fieldRegex },
      ],
    };
    const existingAnd = Array.isArray(filter.$and)
      ? (filter.$and as Record<string, unknown>[])
      : [];
    filter.$and = [...existingAnd, searchClause];
  }

  return filter;
}

/** GET /api/leads */
export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = combineFilters(
    buildLeadFilter(req.query),
    buildScopeFilter(req)
  );

  const [leads, total] = await Promise.all([
    populateLeadQuery(
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    )
      .lean()
      .exec(),
    Lead.countDocuments(filter).exec(),
  ]);

  const mapped = (leads as Array<LeanLead & Record<string, unknown>>).map(
    toApiLead
  );
  const pages = Math.max(1, Math.ceil(total / limit));

  res.status(200).json({
    success: true,
    count: mapped.length,
    total,
    pages,
    currentPage: page,
    data: {
      leads: mapped,
      pagination: {
        total,
        pages,
        currentPage: page,
        limit,
      },
    },
  });
});

/** GET /api/leads/stats */
export const getLeadStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const scope = buildScopeFilter(req);

  const [totalLeads, newThisMonth, inProgress, booked, closedLeads] =
    await Promise.all([
      Lead.countDocuments(scope).exec(),
      Lead.countDocuments(
        combineFilters(scope, {
          createdAt: { $gte: monthStart, $lt: nextMonth },
        })
      ).exec(),
      Lead.countDocuments(
        combineFilters(scope, { status: { $in: IN_PROGRESS_STATUSES } })
      ).exec(),
      Lead.countDocuments(
        combineFilters(scope, { status: { $in: BOOKED_STATUSES } })
      ).exec(),
      Lead.countDocuments(
        combineFilters(scope, { status: { $in: CLOSED_STATUSES } })
      ).exec(),
    ]);

  const stats = {
    totalLeads,
    newThisMonth,
    newLeadsThisMonth: newThisMonth,
    inProgress,
    booked,
    dealWon: booked,
    closedLeads,
    lostLeads: closedLeads,
  };

  res.status(200).json({
    success: true,
    data: { stats },
  });
});

/** GET /api/leads/:id */
export const getLeadById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  const lead = await findLeadForUser(id, req, true);

  res.status(200).json({
    success: true,
    data: { lead: toApiLead(lead as LeanLead & Record<string, unknown>) },
  });
});

/** POST /api/leads */
export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const payload = pickLeadPayload(body);

  if (!payload.firstName) {
    throw new AppError("Name is required", 400);
  }
  if (!payload.destination) {
    throw new AppError("Destination is required", 400);
  }
  if (!payload.contactNumber) {
    throw new AppError("Contact number is required", 400);
  }

  const assignedToRaw = String(
    body.assignedTo ?? body.assigned_to ?? ""
  ).trim();
  let assignedTo: Types.ObjectId | null = null;
  let didAutoAssign = false;

  if (assignedToRaw && Types.ObjectId.isValid(assignedToRaw)) {
    assignedTo = new Types.ObjectId(assignedToRaw);
  } else if (isStaffRole(req.user?.role)) {
    assignedTo = new Types.ObjectId(userId);
  } else {
    assignedTo = await getNextAvailableStaff();
    didAutoAssign = Boolean(assignedTo);
  }

  const lead = await Lead.create({
    ...payload,
    createdBy: userId,
    assignedTo,
    statusUpdatedBy: userId,
    statusUpdatedAt: new Date(),
  });

  logLeadActivitySafe({
    leadId: lead._id,
    performedBy: userId,
    actionType: "Lead_Created",
    details: "Lead created",
  });

  if (didAutoAssign && assignedTo) {
    const leadName = displayName(lead);
    void createAndEmitNotification({
      recipient: assignedTo,
      type: "New_Lead",
      title: "New lead assigned",
      message: `You were assigned lead ${leadName}.`,
      relatedId: lead._id,
    }).catch((error) => {
      console.error(
        "[leads] Failed to notify assignee of new lead:",
        error instanceof Error ? error.message : error
      );
    });

    void resolveUserDisplayName(assignedTo).then((assigneeName) => {
      logLeadActivitySafe({
        leadId: lead._id,
        performedBy: userId,
        actionType: "Assigned",
        details: `Lead assigned to ${assigneeName}`,
      });
    });
  }

  const populated = await populateLeadQuery(Lead.findById(lead._id))
    .lean()
    .exec();

  res.status(201).json({
    success: true,
    message: "Lead created successfully",
    data: {
      lead: toApiLead(
        (populated ?? lead.toObject()) as unknown as LeanLead &
          Record<string, unknown>
      ),
    },
  });
});

/**
 * POST /api/leads/website
 * Public website capture — no JWT. Authenticated via `x-api-key`.
 * System Actor: createdBy and activity performer are null.
 */
export const createLeadFromWebsite = asyncHandler(
  async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = pickLeadPayload(body);

    if (!payload.firstName) {
      throw new AppError("Name is required", 400);
    }
    if (!payload.destination) {
      throw new AppError("Destination is required", 400);
    }
    if (!payload.contactNumber) {
      throw new AppError("Contact number is required", 400);
    }

    const lead = await Lead.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      city: payload.city,
      age: payload.age,
      gender: payload.gender,
      destination: payload.destination,
      pax: payload.pax,
      contactNumber: payload.contactNumber,
      dateOfTravel: payload.dateOfTravel,
      email: payload.email,
      campaign: payload.campaign,
      leadSource: "Website",
      status: "New Lead",
      createdBy: null,
      assignedTo: null,
      statusUpdatedBy: null,
      statusUpdatedAt: new Date(),
    });

    await logLeadActivity({
      leadId: lead._id,
      performedBy: null,
      actionType: "Lead_Created",
      details: "Lead captured automatically from the website form.",
    });

    const populated = await populateLeadQuery(Lead.findById(lead._id))
      .lean()
      .exec();

    res.status(201).json({
      success: true,
      message: "Lead captured from website",
      data: {
        lead: toApiLead(
          (populated ?? lead.toObject()) as unknown as LeanLead &
            Record<string, unknown>
        ),
      },
    });
  }
);

/** PUT /api/leads/:id */
export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  const existing = await findLeadForUser(id, req);
  const userId = req.user?.id;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const $set: Record<string, unknown> = {};

  // Full form update when name / destination fields are present
  const hasProfileFields =
    body.name !== undefined ||
    body.firstName !== undefined ||
    body.destination !== undefined ||
    body.contactNumber !== undefined;

  if (hasProfileFields) {
    const payload = pickLeadPayload(body);
    if (!payload.firstName) {
      throw new AppError("Name is required", 400);
    }
    if (!payload.destination) {
      throw new AppError("Destination is required", 400);
    }
    if (!payload.contactNumber) {
      throw new AppError("Contact number is required", 400);
    }
    Object.assign($set, payload);
  }

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!LEAD_STATUSES.includes(status as LeadStatus)) {
      throw new AppError("Invalid lead status", 400);
    }
    $set.status = status;
    if (userId) {
      $set.statusUpdatedBy = userId;
      $set.statusUpdatedAt = new Date();
    }
  }

  if (body.nextFollowUp !== undefined || body.nextFollowUpDate !== undefined) {
    const followUp = parseDate(body.nextFollowUpDate ?? body.nextFollowUp);
    $set.nextFollowUp = followUp;
    $set.nextFollowUpDate = followUp;
    // findByIdAndUpdate bypasses pre-save; reset completion when date changes.
    if (
      dateIso(followUp) !==
      dateIso(existing.nextFollowUp ?? existing.nextFollowUpDate)
    ) {
      $set.isFollowUpCompleted = false;
    }
  } else if (body.isFollowUpCompleted !== undefined) {
    $set.isFollowUpCompleted = Boolean(body.isFollowUpCompleted);
  }

  const assignedToRaw = String(
    body.assignedTo ?? body.assigned_to ?? ""
  ).trim();
  if (assignedToRaw) {
    if (!Types.ObjectId.isValid(assignedToRaw)) {
      throw new AppError("Valid assignedTo user id is required", 400);
    }
    $set.assignedTo = new Types.ObjectId(assignedToRaw);
  }

  if (Object.keys($set).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  const lead = await populateLeadQuery(
    Lead.findByIdAndUpdate(id, { $set }, { new: true })
  )
    .lean()
    .exec();

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  if (userId) {
    if (
      $set.status !== undefined &&
      String($set.status) !== String(existing.status ?? "")
    ) {
      logLeadActivitySafe({
        leadId: id,
        performedBy: userId,
        actionType: "Status_Changed",
        details: `Status updated from ${existing.status ?? "Unknown"} to ${String($set.status)}`,
      });
    }

    if (
      ($set.nextFollowUp !== undefined || $set.nextFollowUpDate !== undefined) &&
      dateIso($set.nextFollowUp ?? $set.nextFollowUpDate) !==
        dateIso(existing.nextFollowUp ?? existing.nextFollowUpDate)
    ) {
      const next = ($set.nextFollowUp ?? $set.nextFollowUpDate) as Date | null;
      logLeadActivitySafe({
        leadId: id,
        performedBy: userId,
        actionType: "Call_Scheduled",
        details: `Follow-up scheduled for ${formatFollowUpLabel(next)}`,
      });
    }

    if (
      $set.isFollowUpCompleted === true &&
      !Boolean(existing.isFollowUpCompleted)
    ) {
      logLeadActivitySafe({
        leadId: id,
        performedBy: userId,
        actionType: "Call_Completed",
        details: "Follow-up marked as completed.",
      });
    }

    if (
      $set.assignedTo !== undefined &&
      oidString($set.assignedTo) !== oidString(existing.assignedTo)
    ) {
      void resolveUserDisplayName($set.assignedTo as Types.ObjectId).then(
        (assigneeName) => {
          logLeadActivitySafe({
            leadId: id,
            performedBy: userId,
            actionType: "Assigned",
            details: `Lead assigned to ${assigneeName}`,
          });
        }
      );
    }
  }

  res.status(200).json({
    success: true,
    message: "Lead updated successfully",
    data: { lead: toApiLead(lead as LeanLead & Record<string, unknown>) },
  });
});

/** PUT /api/leads/:id/status */
export const updateLeadStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const id = String(req.params.id ?? "");
    const existing = await findLeadForUser(id, req);

    const status = String(req.body?.status ?? "").trim();
    if (!status) {
      throw new AppError("Status is required", 400);
    }
    if (!LEAD_STATUSES.includes(status as LeadStatus)) {
      throw new AppError("Invalid lead status", 400);
    }

    const lead = await populateLeadQuery(
      Lead.findByIdAndUpdate(
        id,
        {
          $set: {
            status,
            statusUpdatedBy: userId,
            statusUpdatedAt: new Date(),
          },
        },
        { new: true }
      )
    )
      .lean()
      .exec();

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    if (status !== String(existing.status ?? "")) {
      logLeadActivitySafe({
        leadId: id,
        performedBy: userId,
        actionType: "Status_Changed",
        details: `Status updated from ${existing.status ?? "Unknown"} to ${status}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Lead status updated to ${status}`,
      data: { lead: toApiLead(lead as LeanLead & Record<string, unknown>) },
    });
  }
);

/** PUT /api/leads/:id/assign — Owner / Administrator only */
export const assignLead = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  await findLeadForUser(id, req);
  const userId = req.user?.id;

  const assignedTo = String(
    req.body?.assignedTo ?? req.body?.userId ?? ""
  ).trim();

  if (!assignedTo || !Types.ObjectId.isValid(assignedTo)) {
    throw new AppError("Valid assignedTo user id is required", 400);
  }

  const lead = await populateLeadQuery(
    Lead.findByIdAndUpdate(
      id,
      { $set: { assignedTo: new Types.ObjectId(assignedTo) } },
      { new: true }
    )
  )
    .lean()
    .exec();

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  if (userId) {
    const assigneeName = await resolveUserDisplayName(assignedTo);
    logLeadActivitySafe({
      leadId: id,
      performedBy: userId,
      actionType: "Assigned",
      details: `Lead assigned to ${assigneeName}`,
    });
  }

  res.status(200).json({
    success: true,
    message: "Lead assigned successfully",
    data: { lead: toApiLead(lead as LeanLead & Record<string, unknown>) },
  });
});

function parseLeadIdList(raw: unknown): Types.ObjectId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError("leadIds must be a non-empty array", 400);
  }

  const ids = raw
    .map((id) => String(id ?? "").trim())
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (ids.length === 0) {
    throw new AppError("No valid lead ids provided", 400);
  }

  return ids;
}

/** PUT /api/leads/bulk/status */
export const bulkUpdateLeadStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const status = String(req.body?.status ?? "").trim();
    if (!status) {
      throw new AppError("Status is required", 400);
    }
    if (!LEAD_STATUSES.includes(status as LeadStatus)) {
      throw new AppError("Invalid lead status", 400);
    }

    const leadIds = parseLeadIdList(req.body?.leadIds);
    const filter = combineFilters(
      { _id: { $in: leadIds } },
      buildScopeFilter(req)
    );

    const result = await Lead.updateMany(filter, {
      $set: {
        status,
        statusUpdatedBy: userId,
        statusUpdatedAt: new Date(),
      },
    }).exec();

    res.status(200).json({
      success: true,
      message: `Updated status to ${status} for ${result.modifiedCount} lead(s)`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        status,
      },
    });
  }
);

/** PUT /api/leads/bulk/assign — Owner / Administrator only */
export const bulkAssignLeads = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const assignedTo = String(
      req.body?.assignedTo ?? req.body?.userId ?? ""
    ).trim();

    if (!assignedTo || !Types.ObjectId.isValid(assignedTo)) {
      throw new AppError("Valid assignedTo user id is required", 400);
    }

    const leadIds = parseLeadIdList(req.body?.leadIds);
    const filter = combineFilters(
      { _id: { $in: leadIds } },
      buildScopeFilter(req)
    );

    const matchedLeads = await Lead.find(filter).select("_id").lean().exec();
    const result = await Lead.updateMany(filter, {
      $set: { assignedTo: new Types.ObjectId(assignedTo) },
    }).exec();

    if (userId && matchedLeads.length > 0) {
      const assigneeName = await resolveUserDisplayName(assignedTo);
      for (const matched of matchedLeads) {
        logLeadActivitySafe({
          leadId: matched._id,
          performedBy: userId,
          actionType: "Assigned",
          details: `Lead assigned to ${assigneeName}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Assigned ${result.modifiedCount} lead(s) successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        assignedTo,
      },
    });
  }
);

const BULK_IMPORT_MAX_ROWS = 2000;

/** POST /api/leads/bulk-import */
export const bulkImportLeads = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const rawLeads = req.body?.leads;
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      throw new AppError("leads must be a non-empty array", 400);
    }
    if (rawLeads.length > BULK_IMPORT_MAX_ROWS) {
      throw new AppError(
        `Cannot import more than ${BULK_IMPORT_MAX_ROWS} leads at once`,
        400
      );
    }

    let skippedInvalid = 0;
    const normalized: ReturnType<typeof pickLeadPayload>[] = [];

    for (const row of rawLeads) {
      const body =
        row && typeof row === "object"
          ? (row as Record<string, unknown>)
          : {};
      const payload = pickLeadPayload(body);
      if (!payload.firstName || !payload.destination || !payload.contactNumber) {
        skippedInvalid += 1;
        continue;
      }
      normalized.push(payload);
    }

    // Within-batch dedupe by contactNumber (first occurrence wins)
    const seenInBatch = new Set<string>();
    let skippedBatchDupes = 0;
    const uniqueInBatch = normalized.filter((lead) => {
      const key = lead.contactNumber;
      if (seenInBatch.has(key)) {
        skippedBatchDupes += 1;
        return false;
      }
      seenInBatch.add(key);
      return true;
    });

    const incomingNumbers = uniqueInBatch.map((l) => l.contactNumber);
    const existingLeads =
      incomingNumbers.length > 0
        ? await Lead.find(
            { contactNumber: { $in: incomingNumbers } },
            { contactNumber: 1 }
          )
            .lean()
            .exec()
        : [];
    const existingNumbers = new Set(
      existingLeads.map((l) => String(l.contactNumber ?? ""))
    );

    const newLeads = uniqueInBatch.filter(
      (l) => !existingNumbers.has(l.contactNumber)
    );
    const skippedDbDupes = uniqueInBatch.length - newLeads.length;

    const assignedTo = isStaffRole(req.user?.role)
      ? new Types.ObjectId(userId)
      : null;
    const now = new Date();

    const docs = newLeads.map((lead) => ({
      ...lead,
      status: "New Lead" as const,
      createdBy: new Types.ObjectId(userId),
      assignedTo,
      statusUpdatedBy: new Types.ObjectId(userId),
      statusUpdatedAt: now,
      isFollowUpCompleted: false,
    }));

    let imported = 0;
    if (docs.length > 0) {
      const inserted = await Lead.insertMany(docs, { ordered: false });
      imported = inserted.length;
    }

    const skipped = skippedInvalid + skippedBatchDupes + skippedDbDupes;

    res.status(200).json({
      success: true,
      message: `Imported ${imported} lead(s). Skipped ${skipped}.`,
      data: {
        imported,
        skipped,
      },
    });
  }
);

/** DELETE /api/leads/:id */
export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  await findLeadForUser(id, req);

  const lead = await Lead.findByIdAndDelete(id).lean().exec();
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Lead deleted successfully",
    data: { lead: toApiLead(lead as LeanLead & Record<string, unknown>) },
  });
});

/** GET /api/leads/:id/activities */
export const getLeadActivities = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    await findLeadForUser(id, req);

    const activities = await LeadActivity.find({ leadId: id })
      .sort({ createdAt: -1 })
      .populate("performedBy", "first_name last_name")
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      data: {
        activities: activities.map((activity) =>
          toApiLeadActivity(
            activity as Parameters<typeof toApiLeadActivity>[0]
          )
        ),
      },
    });
  }
);

/** POST /api/leads/:id/notes */
export const addLeadNote = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const id = String(req.params.id ?? "");
  await findLeadForUser(id, req);

  const note = String(req.body?.note ?? "").trim();
  if (!note) {
    throw new AppError("Note is required", 400);
  }

  const created = await logLeadActivity({
    leadId: id,
    performedBy: userId,
    actionType: "Note_Added",
    details: note,
  });

  const populated = await LeadActivity.findById(created._id)
    .populate("performedBy", "first_name last_name")
    .lean()
    .exec();

  res.status(201).json({
    success: true,
    message: "Note added successfully",
    data: {
      activity: toApiLeadActivity(
        (populated ?? created.toObject()) as Parameters<
          typeof toApiLeadActivity
        >[0]
      ),
    },
  });
});

export default {
  getLeads,
  getLeadStats,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  assignLead,
  bulkUpdateLeadStatus,
  bulkAssignLeads,
  bulkImportLeads,
  deleteLead,
  getLeadActivities,
  addLeadNote,
};
