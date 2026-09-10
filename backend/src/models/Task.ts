import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export interface ITask {
  title: string;
  deadline: Date;
  description?: string;
  isCompleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isCompleted: {
      type: Boolean,
      default: false,
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
    collection: "tasks",
  }
);

export type TaskDocument = HydratedDocument<ITask>;
export type TaskModel = Model<ITask>;

export const Task: TaskModel =
  (mongoose.models.Task as TaskModel | undefined) ??
  mongoose.model<ITask>("Task", taskSchema);

export default Task;
