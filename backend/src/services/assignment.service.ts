import { Types } from "mongoose";
import { User } from "../models/User.js";

/**
 * Atomic round-robin: pick Active Staff/Employee with oldest (or null)
 * lastLeadAssignedAt, stamp them as just assigned, return their id.
 */
export async function getNextAvailableStaff(): Promise<Types.ObjectId | null> {
  const staff = await User.findOneAndUpdate(
    { role: { $in: ["Staff", "Employee"] }, status: "Active" },
    { $set: { lastLeadAssignedAt: new Date() } },
    { sort: { lastLeadAssignedAt: 1 }, new: true }
  ).exec();

  return staff?._id ?? null;
}

export default { getNextAvailableStaff };
