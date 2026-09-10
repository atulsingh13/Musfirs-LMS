import type { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import axios from "axios";
import { Lead } from "../models/Lead.js";
import { logLeadActivity } from "../services/leadActivity.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type MetaFieldDatum = {
  name?: string;
  values?: string[];
};

type GoogleColumnDatum = {
  column_id?: string;
  column_name?: string;
  string_value?: string;
};

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

/** Flatten Meta `field_data` into `{ fieldName: firstValue }`. */
export function mapMetaFieldData(
  fieldData: MetaFieldDatum[] | undefined
): Record<string, string> {
  const mapped: Record<string, string> = {};
  if (!Array.isArray(fieldData)) return mapped;

  for (const field of fieldData) {
    const key = String(field?.name ?? "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const value = Array.isArray(field.values)
      ? String(field.values[0] ?? "").trim()
      : "";
    if (value) mapped[key] = value;
  }

  return mapped;
}

/** Flatten Google `user_column_data` into a normalized key → value map. */
export function mapGoogleColumnData(
  columns: GoogleColumnDatum[] | undefined
): Record<string, string> {
  const mapped: Record<string, string> = {};
  if (!Array.isArray(columns)) return mapped;

  for (const col of columns) {
    const rawName = String(col?.column_name ?? col?.column_id ?? "")
      .trim()
      .toLowerCase();
    const value = String(col?.string_value ?? "").trim();
    if (!rawName || !value) continue;
    mapped[rawName] = value;
    mapped[rawName.replace(/\s+/g, "_")] = value;
  }

  return mapped;
}

function pickFromMap(
  map: Record<string, string>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = map[key];
    if (value?.trim()) return value.trim();
  }
  return "";
}

function resolveNameParts(fields: Record<string, string>): {
  firstName: string;
  lastName: string;
} {
  const fullName = pickFromMap(fields, [
    "full_name",
    "fullname",
    "full name",
    "customer_name",
    "customer name",
  ]);
  if (fullName) return splitName(fullName);

  const firstName = pickFromMap(fields, [
    "first_name",
    "firstname",
    "first name",
  ]);
  const lastName = pickFromMap(fields, [
    "last_name",
    "lastname",
    "last name",
  ]);
  return { firstName, lastName };
}

function resolveContactNumber(fields: Record<string, string>): string {
  return pickFromMap(fields, [
    "phone_number",
    "phone",
    "mobile",
    "mobile_number",
    "contact_number",
    "user phone",
    "user_phone",
    "phone number",
  ]);
}

function resolveEmail(fields: Record<string, string>): string {
  return pickFromMap(fields, [
    "email",
    "email_address",
    "user email",
    "user_email",
    "work_email",
  ]).toLowerCase();
}

function resolveCity(fields: Record<string, string>): string {
  return pickFromMap(fields, ["city", "town", "location"]);
}

function resolveDestination(fields: Record<string, string>): string {
  return (
    pickFromMap(fields, [
      "destination",
      "travel_destination",
      "preferred_destination",
      "trip_destination",
      "where_do_you_want_to_go",
    ]) || "Not specified"
  );
}

function resolvePax(fields: Record<string, string>): number {
  const raw = pickFromMap(fields, [
    "pax",
    "number_of_pax",
    "number of pax",
    "travellers",
    "travelers",
    "no_of_travellers",
  ]);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

async function createSystemLead(input: {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  city: string;
  destination: string;
  pax: number;
  campaign: string;
  leadSource: "Meta" | "Google";
  activityDetails: string;
}) {
  if (!input.firstName) {
    throw new AppError("Name is required to create lead", 400);
  }
  if (!input.contactNumber) {
    throw new AppError("Contact number is required to create lead", 400);
  }

  const lead = await Lead.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    contactNumber: input.contactNumber,
    city: input.city,
    destination: input.destination,
    pax: input.pax,
    campaign: input.campaign,
    leadSource: input.leadSource,
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
    details: input.activityDetails,
  });

  return lead;
}

/**
 * GET /api/webhooks/meta
 * Facebook webhook verification handshake.
 */
export const verifyMetaWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const mode = String(req.query["hub.mode"] ?? "");
    const token = String(req.query["hub.verify_token"] ?? "");
    const challenge = String(req.query["hub.challenge"] ?? "");
    const expected = process.env.META_VERIFY_TOKEN ?? "";

    if (mode === "subscribe" && expected && safeEqual(token, expected)) {
      res.status(200).send(challenge);
      return;
    }

    throw new AppError("Forbidden", 403);
  }
);

/**
 * POST /api/webhooks/meta
 * Receives Leadgen events, fetches lead details from Graph API, saves Lead.
 */
export const handleMetaWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const accessToken = process.env.META_ACCESS_TOKEN ?? "";
    if (!accessToken) {
      throw new AppError("META_ACCESS_TOKEN is not configured", 500);
    }

    const body = (req.body ?? {}) as {
      object?: string;
      entry?: Array<{
        changes?: Array<{
          field?: string;
          value?: { leadgen_id?: string; form_id?: string; page_id?: string };
        }>;
      }>;
    };

    const leadgenIds = new Set<string>();
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const id = String(change?.value?.leadgen_id ?? "").trim();
        if (id) leadgenIds.add(id);
      }
    }

    // Fallback for the common single-event shape described in the brief
    if (leadgenIds.size === 0) {
      const nestedId = String(
        body?.entry?.[0]?.changes?.[0]?.value?.leadgen_id ?? ""
      ).trim();
      if (nestedId) leadgenIds.add(nestedId);
    }

    if (leadgenIds.size === 0) {
      // Acknowledge empty/noise payloads so Meta does not retry forever
      res.status(200).json({ success: true, message: "No leadgen_id found" });
      return;
    }

    const created: string[] = [];

    for (const leadgenId of leadgenIds) {
      const { data } = await axios.get<{
        id?: string;
        field_data?: MetaFieldDatum[];
        created_time?: string;
      }>(`https://graph.facebook.com/v18.0/${leadgenId}`, {
        params: { access_token: accessToken },
        timeout: 15_000,
      });

      const fields = mapMetaFieldData(data.field_data);
      const { firstName, lastName } = resolveNameParts(fields);
      const contactNumber = resolveContactNumber(fields);
      const email = resolveEmail(fields);
      const city = resolveCity(fields);
      const destination = resolveDestination(fields);
      const pax = resolvePax(fields);

      const formId = String(
        body?.entry?.[0]?.changes?.[0]?.value?.form_id ?? ""
      ).trim();

      const lead = await createSystemLead({
        firstName,
        lastName,
        email,
        contactNumber,
        city,
        destination,
        pax,
        campaign: formId ? `Meta Form ${formId}` : "Meta Lead Ads",
        leadSource: "Meta",
        activityDetails: `Lead captured automatically from Meta Ads (leadgen_id: ${leadgenId}).`,
      });

      created.push(String(lead._id));
    }

    res.status(200).json({
      success: true,
      message: "Meta leads processed",
      data: { leadIds: created },
    });
  }
);

/**
 * POST /api/webhooks/google
 * Google Ads Lead Form Extension webhook.
 */
export const handleGoogleWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const expected = process.env.GOOGLE_WEBHOOK_KEY ?? "";
    const provided = String(req.headers["google-key"] ?? "");

    if (!expected || !safeEqual(provided, expected)) {
      throw new AppError("Unauthorized", 403);
    }

    const body = (req.body ?? {}) as {
      lead_id?: string;
      campaign_id?: string;
      form_id?: string;
      google_key?: string;
      user_column_data?: GoogleColumnDatum[];
    };

    const fields = mapGoogleColumnData(body.user_column_data);
    const { firstName, lastName } = resolveNameParts(fields);
    const contactNumber = resolveContactNumber(fields);
    const email = resolveEmail(fields);
    const city = resolveCity(fields);
    const destination = resolveDestination(fields);
    const pax = resolvePax(fields);

    const campaignParts = [
      body.campaign_id ? `Campaign ${body.campaign_id}` : "",
      body.form_id ? `Form ${body.form_id}` : "",
    ].filter(Boolean);

    const lead = await createSystemLead({
      firstName,
      lastName,
      email,
      contactNumber,
      city,
      destination,
      pax,
      campaign: campaignParts.join(" · ") || "Google Lead Form",
      leadSource: "Google",
      activityDetails: body.lead_id
        ? `Lead captured automatically from Google Ads (lead_id: ${body.lead_id}).`
        : "Lead captured automatically from Google Ads Lead Form.",
    });

    res.status(201).json({
      success: true,
      message: "Google lead captured",
      data: { leadId: String(lead._id) },
    });
  }
);

export default {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleGoogleWebhook,
};
