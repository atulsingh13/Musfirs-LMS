import { Types } from "mongoose";
import {
  LeadActivity,
  type LeadActivityType,
} from "../models/LeadActivity.js";

export interface LogLeadActivityInput {
  leadId: string | Types.ObjectId;
  performedBy?: string | Types.ObjectId | null;
  actionType: LeadActivityType;
  details: string;
}

export async function logLeadActivity(input: LogLeadActivityInput) {
  return LeadActivity.create({
    leadId: input.leadId,
    performedBy: input.performedBy ?? null,
    actionType: input.actionType,
    details: input.details.trim(),
  });
}

/** Fire-and-forget activity log — never blocks lead mutations. */
export function logLeadActivitySafe(input: LogLeadActivityInput): void {
  void logLeadActivity(input).catch((error) => {
    console.error(
      "[lead-activity] Failed to log activity:",
      error instanceof Error ? error.message : error
    );
  });
}

export function toApiLeadActivity(doc: {
  _id: Types.ObjectId | string;
  leadId: Types.ObjectId | string | { _id?: Types.ObjectId | string };
  performedBy?:
    | Types.ObjectId
    | string
    | {
        _id?: Types.ObjectId | string;
        first_name?: string;
        last_name?: string;
      }
    | null;
  actionType: LeadActivityType;
  details: string;
  createdAt?: Date;
}) {
  const actor =
    doc.performedBy && typeof doc.performedBy === "object"
      ? doc.performedBy
      : null;

  const firstName =
    actor && "first_name" in actor ? String(actor.first_name ?? "") : "";
  const lastName =
    actor && "last_name" in actor ? String(actor.last_name ?? "") : "";
  const performedById =
    actor && "_id" in actor && actor._id
      ? String(actor._id)
      : doc.performedBy
        ? String(doc.performedBy)
        : "";

  const displayName = `${firstName} ${lastName}`.trim();

  return {
    id: String(doc._id),
    _id: String(doc._id),
    leadId: String(
      typeof doc.leadId === "object" && doc.leadId && "_id" in doc.leadId
        ? doc.leadId._id
        : doc.leadId
    ),
    actionType: doc.actionType,
    details: doc.details,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    performedBy: displayName
      ? {
          _id: performedById,
          first_name: firstName,
          last_name: lastName,
          name: displayName,
        }
      : {
          _id: "",
          first_name: "Website",
          last_name: "",
          name: "Website",
        },
  };
}

export default {
  logLeadActivity,
  logLeadActivitySafe,
  toApiLeadActivity,
};
