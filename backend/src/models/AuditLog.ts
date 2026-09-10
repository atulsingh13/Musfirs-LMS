import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const AUDIT_CHANGE_TYPES = ["Granted", "Restricted"] as const;
export type AuditChangeType = (typeof AUDIT_CHANGE_TYPES)[number];

export interface IAuditLog {
  targetUser: Types.ObjectId;
  changedBy: Types.ObjectId;
  moduleName: string;
  action: string;
  changeType: AuditChangeType;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    changeType: {
      type: String,
      enum: AUDIT_CHANGE_TYPES,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "audit_logs",
    versionKey: false,
  }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });

export type AuditLogDocument = HydratedDocument<IAuditLog>;
export type AuditLogModel = Model<IAuditLog>;

export const AuditLog: AuditLogModel =
  (mongoose.models.AuditLog as AuditLogModel | undefined) ??
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
