import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const LEAD_SOURCES = [
  "Meta",
  "Website",
  "Referral",
  "Google",
  "Others",
  /** @deprecated Prefer "Meta" — kept so legacy documents remain writable. */
  "Meta Ads",
  /** @deprecated Prefer "Google" — kept so legacy documents remain writable. */
  "Google Ads",
] as const;

export type LeadSourcePreset = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "New Lead",
  "Qualification Pending",
  "Qualified",
  "Not Qualified",
  "Plan Shared",
  "Follow-up Later",
  "Payment Pending",
  "Hot / Payment Pending",
  "Advance Paid",
  "Booked",
  "Closed",
  "Not Interested",
  "Travel Completed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_GENDERS = ["Male", "Female", "Other"] as const;
export type LeadGender = (typeof LEAD_GENDERS)[number];

export interface ILead {
  firstName: string;
  lastName?: string;
  city?: string;
  age?: number;
  gender?: LeadGender | string;
  destination: string;
  pax: number;
  contactNumber: string;
  dateOfTravel?: Date | null;
  leadSource: LeadSourcePreset | string;
  status: LeadStatus | string;
  email?: string;
  campaign?: string;
  nextFollowUp?: Date | null;
  /** Alias used by calendar follow-up aggregation (kept in sync with nextFollowUp). */
  nextFollowUpDate?: Date | null;
  /** Whether the current scheduled follow-up has been marked done. */
  isFollowUpCompleted: boolean;
  totalAmount?: number;
  advancePaid?: number;
  assignedTo?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  statusUpdatedBy?: Types.ObjectId | null;
  statusUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
      default: null,
    },
    gender: {
      type: String,
      enum: LEAD_GENDERS,
      default: "Other",
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    pax: {
      type: Number,
      default: 1,
      min: 1,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfTravel: {
      type: Date,
      default: null,
    },
    leadSource: {
      type: String,
      enum: LEAD_SOURCES,
      default: "Website",
      trim: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New Lead",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    campaign: {
      type: String,
      trim: true,
      default: "",
    },
    nextFollowUp: {
      type: Date,
      default: null,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
      index: true,
    },
    isFollowUpCompleted: {
      type: Boolean,
      default: false,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    statusUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "leads",
  }
);

leadSchema.pre("save", function syncFollowUpDates(next) {
  const followUpChanged =
    this.isModified("nextFollowUp") || this.isModified("nextFollowUpDate");

  if (this.nextFollowUp && !this.nextFollowUpDate) {
    this.nextFollowUpDate = this.nextFollowUp;
  } else if (this.nextFollowUpDate && !this.nextFollowUp) {
    this.nextFollowUp = this.nextFollowUpDate;
  } else if (this.isModified("nextFollowUp")) {
    this.nextFollowUpDate = this.nextFollowUp ?? null;
  } else if (this.isModified("nextFollowUpDate")) {
    this.nextFollowUp = this.nextFollowUpDate ?? null;
  }

  // New or changed follow-up date always reopens the follow-up as pending.
  if (followUpChanged) {
    this.isFollowUpCompleted = false;
  }
  next();
});

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ dateOfTravel: 1 });
leadSchema.index({
  firstName: "text",
  lastName: "text",
  destination: "text",
  city: "text",
  contactNumber: "text",
});

export type LeadDocument = HydratedDocument<ILead>;
export type LeadModel = Model<ILead>;

export const Lead: LeadModel =
  (mongoose.models.Lead as LeadModel | undefined) ??
  mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
