import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const EVENT_KINDS = ["meeting", "task", "deadline"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface IEvent {
  title: string;
  start: Date;
  end?: Date | null;
  description?: string;
  /** UI event kind: meeting | task | deadline */
  type: EventKind;
  /** Meeting category used for calendar colors (e.g. "Internal Sync") */
  meetingType?: string;
  status?: string;
  meetingLink?: string;
  participants?: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: EVENT_KINDS,
      default: "meeting",
      trim: true,
    },
    meetingType: {
      type: String,
      trim: true,
      default: "Internal Sync",
    },
    status: {
      type: String,
      trim: true,
      default: "scheduled",
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    participants: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "events",
  }
);

eventSchema.index({ start: 1, end: 1 });

export type EventDocument = HydratedDocument<IEvent>;
export type EventModel = Model<IEvent>;

export const Event: EventModel =
  (mongoose.models.Event as EventModel | undefined) ??
  mongoose.model<IEvent>("Event", eventSchema);

export default Event;
