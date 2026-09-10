import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Lead } from "../models/Lead.js";
import { User } from "../models/User.js";
import { hasPermission } from "../middleware/authMiddleware.js";
import { OWNER_ROLES } from "../types/user.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isOwnerRole(role?: string): boolean {
  return !!role && OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number]);
}

function isStaffRole(role?: string): boolean {
  return role === "Staff" || role === "Employee";
}

/** Same scoping rules as leadController.buildScopeFilter */
function buildLeadScopeFilter(req: Request): Record<string, unknown> {
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

function queryParamString(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }
  return String(value ?? "");
}

function containsSearchTerm(
  haystack: string,
  searchTerm: string
): boolean {
  return haystack.toLowerCase().includes(searchTerm.toLowerCase());
}

/** GET /api/search?q= (also accepts ?search=) */
export const globalSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const raw = req.query.q ?? req.query.search ?? "";
    const searchTerm = queryParamString(raw).trim().replace(/\s+/g, " ");

    if (searchTerm.length < 2) {
      res.status(200).json({
        success: true,
        data: { leads: [], users: [] },
      });
      return;
    }

    const regex = { $regex: escapeRegex(searchTerm), $options: "i" };
    const canViewLeads = hasPermission(req, "Leads", "view");
    const canViewUsers = hasPermission(req, "Users", "view");

    const leadsPromise = canViewLeads
      ? Lead.find(
          combineFilters(buildLeadScopeFilter(req), {
            $or: [
              { firstName: regex },
              { lastName: regex },
              { contactNumber: regex },
              { email: regex },
            ],
          })
        )
          .select("firstName lastName contactNumber email")
          .limit(5)
          .lean()
          .exec()
      : Promise.resolve([]);

    const usersPromise = canViewUsers
      ? User.find({
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ["$first_name", ""] },
                          " ",
                          { $ifNull: ["$last_name", ""] },
                        ],
                      },
                    },
                  },
                  regex: escapeRegex(searchTerm),
                  options: "i",
                },
              },
            },
            { first_name: regex },
            { last_name: regex },
            { work_email: regex },
            { phone: regex },
          ],
        })
          .select("first_name last_name work_email")
          .limit(5)
          .lean()
          .exec()
      : Promise.resolve([]);

    const [leads, users] = await Promise.all([leadsPromise, usersPromise]);

    const mappedLeads = leads
      .map((lead) => {
        const name =
          `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "—";
        const contact = String(lead.contactNumber ?? "");
        const email = String(lead.email ?? "");
        return {
          _id: String(lead._id),
          name,
          contact,
          email,
          type: "Lead" as const,
        };
      })
      .filter(
        (lead) =>
          containsSearchTerm(lead.name, searchTerm) ||
          containsSearchTerm(lead.contact, searchTerm) ||
          containsSearchTerm(lead.email, searchTerm)
      );

    res.status(200).json({
      success: true,
      data: {
        leads: mappedLeads,
        users: users.map((user) => ({
          _id: String(user._id),
          first_name: String(user.first_name ?? ""),
          last_name: String(user.last_name ?? ""),
          email: String(user.work_email ?? ""),
          type: "User" as const,
        })),
      },
    });
  }
);

export default { globalSearch };
