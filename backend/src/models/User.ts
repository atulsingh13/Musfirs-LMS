import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from "../types/user.js";
import {
  defaultPermissionsForRole,
  modulePermissionSchemaDefinition,
  type UserPermissions,
} from "../types/permissions.js";

export interface IUser {
  employee_id?: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_email?: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: Date | null;
  gender?: string;
  blood_group?: string;
  marital_status?: string;
  languages?: string[];
  address?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  role: UserRole | string;
  status: UserStatus | string;
  failedLoginAttempts: number;
  resetRequestCount: number;
  firstResetRequestDate: Date | null;
  lastLeadAssignedAt: Date | null;
  date_of_joining?: Date | null;
  permissions: UserPermissions;
  password_hash: string;
  must_change_password: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const modulePermissionSchema = new Schema(modulePermissionSchemaDefinition, {
  _id: false,
});

const permissionsSchema = new Schema(
  {
    Dashboard: { type: modulePermissionSchema, default: () => ({}) },
    Leads: { type: modulePermissionSchema, default: () => ({}) },
    Bookings: { type: modulePermissionSchema, default: () => ({}) },
    Calendar: { type: modulePermissionSchema, default: () => ({}) },
    Users: { type: modulePermissionSchema, default: () => ({}) },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    employee_id: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    work_email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    personal_email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 255,
      unique: true,
      sparse: true,
    },
    phone: { type: String, trim: true },
    alternate_phone: { type: String, trim: true },
    date_of_birth: { type: Date, default: null },
    gender: { type: String, trim: true },
    blood_group: { type: String, trim: true },
    marital_status: { type: String, trim: true },
    languages: {
      type: [String],
      default: undefined,
    },
    address: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyPhone: { type: String, trim: true },
    role: {
      type: String,
      required: true,
      enum: USER_ROLES,
      default: "Staff",
    },
    status: {
      type: String,
      required: true,
      enum: USER_STATUSES,
      default: "Active",
      trim: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    resetRequestCount: {
      type: Number,
      default: 0,
    },
    firstResetRequestDate: {
      type: Date,
      default: null,
    },
    lastLeadAssignedAt: {
      type: Date,
      default: null,
      index: true,
    },
    date_of_joining: { type: Date, default: null },
    permissions: {
      type: permissionsSchema,
      default() {
        const role =
          typeof (this as { role?: string }).role === "string"
            ? (this as { role: string }).role
            : "Staff";
        return defaultPermissionsForRole(role);
      },
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    must_change_password: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("name").get(function (this: IUser) {
  return `${this.first_name} ${this.last_name}`.trim();
});

userSchema.index({ role: 1, status: 1, lastLeadAssignedAt: 1 });

/**
 * Drop legacy unique indexes from the previous schema (e.g. `email_1`)
 * that cause false 11000 errors when new docs omit those fields.
 */
export async function syncUserIndexes(): Promise<void> {
  const collection = mongoose.connection.collection("users");
  const indexes = await collection.indexes();
  const legacyNames = ["email_1", "passwordHash_1", "name_1"];

  for (const index of indexes) {
    const name = index.name;
    if (!name || name === "_id_") continue;

    const keys = Object.keys(index.key ?? {});
    const isLegacy =
      legacyNames.includes(name) ||
      keys.includes("email") ||
      keys.includes("passwordHash");

    if (isLegacy) {
      console.warn(`Dropping legacy users index: ${name}`);
      await collection.dropIndex(name);
    }
  }

  await User.syncIndexes();
  console.log("Users collection indexes synced");
}

export type UserDocument = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;

export const User: UserModel =
  (mongoose.models.User as UserModel | undefined) ??
  mongoose.model<IUser>("User", userSchema);

export default User;
