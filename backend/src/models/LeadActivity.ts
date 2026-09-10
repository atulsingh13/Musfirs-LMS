import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const LEAD_ACTIVITY_TYPES = [
  "Status_Changed",
  "Note_Added",
  "Call_Scheduled",
  "Call_Completed",
  "Assigned",
  "Lead_Created",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export interface ILeadActivity {
  leadId: Types.ObjectId;
  /** System-generated activities (e.g. website capture) have no user actor. */
  performedBy?: Types.ObjectId | null;
  actionType: LeadActivityType;
  details: string;
  createdAt: Date;
}

const leadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    actionType: {
      type: String,
      enum: LEAD_ACTIVITY_TYPES,
      required: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "lead_activities",
    versionKey: false,
  }
);

leadActivitySchema.index({ leadId: 1, createdAt: -1 });

export type LeadActivityDocument = HydratedDocument<ILeadActivity>;
export type LeadActivityModel = Model<ILeadActivity>;

export const LeadActivity: LeadActivityModel =
  (mongoose.models.LeadActivity as LeadActivityModel | undefined) ??
  mongoose.model<ILeadActivity>("LeadActivity", leadActivitySchema);

export default LeadActivity;
