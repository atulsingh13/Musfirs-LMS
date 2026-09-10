import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Booking, type IBooking } from "../models/Booking.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type LeanBooking = IBooking;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Map Mongo booking → stable API shape. */
export function toApiBooking(booking: LeanBooking) {
  return {
    _id: String(booking._id),
    id: String(booking._id),
    reference: booking.reference ?? "",
    status: booking.status ?? "",
    payment_status: booking.payment_status ?? "",
    paymentStatus: booking.payment_status ?? "",
    name: booking.name ?? "",
    age: booking.age ?? null,
    gender: booking.gender ?? "",
    contact_number: booking.contact_number ?? "",
    contactNumber: booking.contact_number ?? "",
    email: booking.email ?? "",
    email_lower: booking.email_lower ?? "",
    city: booking.city ?? "",
    trip_package_slug: booking.trip_package_slug ?? "",
    package_title: booking.package_title ?? "",
    packageTitle: booking.package_title ?? "",
    destination: booking.destination ?? "",
    travel_date: booking.travel_date ?? "",
    travelDate: booking.travel_date ?? "",
    number_of_pax: booking.number_of_pax ?? 1,
    numberOfPax: booking.number_of_pax ?? 1,
    currency: booking.currency ?? "INR",
    price_per_person_inr: booking.price_per_person_inr ?? 0,
    total_amount_inr: booking.total_amount_inr ?? 0,
    totalAmountInr: booking.total_amount_inr ?? 0,
    advance_amount_inr: booking.advance_amount_inr ?? 0,
    balance_amount_inr: booking.balance_amount_inr ?? 0,
    notes: booking.notes ?? "",
    source: booking.source ?? "",
    razorpay_order_id: booking.razorpay_order_id ?? "",
    razorpay_payment_id: booking.razorpay_payment_id ?? "",
    idempotency_key: booking.idempotency_key ?? "",
    request_fingerprint: booking.request_fingerprint ?? "",
    amount_captured_paise: booking.amount_captured_paise ?? 0,
    refunded_amount_paise: booking.refunded_amount_paise ?? 0,
    confirmed_at: toIso(booking.confirmed_at),
    cancelled_at: toIso(booking.cancelled_at),
    reconciled_at: toIso(booking.reconciled_at),
    fulfilled_at: toIso(booking.fulfilled_at),
    created_at: toIso(booking.created_at),
    updated_at: toIso(booking.updated_at),
    createdAt: toIso(booking.created_at),
    updatedAt: toIso(booking.updated_at),
  };
}

function pickBookingPayload(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim();
  const emailLower =
    String(body.email_lower ?? "").trim().toLowerCase() ||
    email.toLowerCase();

  return {
    reference: String(body.reference ?? "").trim() || undefined,
    status: String(body.status ?? "").trim() || undefined,
    payment_status:
      String(body.payment_status ?? body.paymentStatus ?? "").trim() ||
      undefined,
    name: String(body.name ?? "").trim() || undefined,
    age: parseOptionalNumber(body.age),
    gender: String(body.gender ?? "").trim() || undefined,
    contact_number:
      String(body.contact_number ?? body.contactNumber ?? "").trim() ||
      undefined,
    email: email || undefined,
    email_lower: emailLower || undefined,
    city: String(body.city ?? "").trim() || undefined,
    trip_package_slug:
      String(body.trip_package_slug ?? body.tripPackageSlug ?? "").trim() ||
      undefined,
    package_title:
      String(body.package_title ?? body.packageTitle ?? "").trim() || undefined,
    destination: String(body.destination ?? "").trim() || undefined,
    travel_date:
      String(body.travel_date ?? body.travelDate ?? "").trim() || undefined,
    number_of_pax: parseOptionalNumber(
      body.number_of_pax ?? body.numberOfPax
    ),
    currency: String(body.currency ?? "").trim() || undefined,
    price_per_person_inr: parseOptionalNumber(
      body.price_per_person_inr ?? body.pricePerPersonInr
    ),
    total_amount_inr: parseOptionalNumber(
      body.total_amount_inr ?? body.totalAmountInr
    ),
    advance_amount_inr: parseOptionalNumber(
      body.advance_amount_inr ?? body.advanceAmountInr
    ),
    balance_amount_inr: parseOptionalNumber(
      body.balance_amount_inr ?? body.balanceAmountInr
    ),
    notes: String(body.notes ?? "").trim() || undefined,
    source: String(body.source ?? "").trim() || undefined,
    razorpay_order_id:
      String(body.razorpay_order_id ?? body.razorpayOrderId ?? "").trim() ||
      undefined,
    razorpay_payment_id:
      String(body.razorpay_payment_id ?? body.razorpayPaymentId ?? "").trim() ||
      undefined,
    idempotency_key:
      String(body.idempotency_key ?? body.idempotencyKey ?? "").trim() ||
      undefined,
    request_fingerprint:
      String(body.request_fingerprint ?? body.requestFingerprint ?? "").trim() ||
      undefined,
    amount_captured_paise: parseOptionalNumber(
      body.amount_captured_paise ?? body.amountCapturedPaise
    ),
    refunded_amount_paise: parseOptionalNumber(
      body.refunded_amount_paise ?? body.refundedAmountPaise
    ),
    confirmed_at: parseOptionalDate(body.confirmed_at ?? body.confirmedAt),
    cancelled_at: parseOptionalDate(body.cancelled_at ?? body.cancelledAt),
    reconciled_at: parseOptionalDate(body.reconciled_at ?? body.reconciledAt),
    fulfilled_at: parseOptionalDate(body.fulfilled_at ?? body.fulfilledAt),
  };
}

function buildBookingFilter(query: Request["query"]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const status = String(query.status ?? "").trim();
  if (status && status !== "all") {
    filter.status = status;
  }

  const paymentStatus = String(
    query.payment_status ?? query.paymentStatus ?? ""
  ).trim();
  if (paymentStatus && paymentStatus !== "all") {
    filter.payment_status = paymentStatus;
  }

  const destination = String(query.destination ?? "").trim();
  if (destination && destination !== "all") {
    filter.destination = destination;
  }

  const search = String(query.search ?? query.q ?? "").trim();
  if (search) {
    const escaped = escapeRegex(search);
    const fieldRegex = { $regex: escaped, $options: "i" };
    filter.$or = [
      { name: fieldRegex },
      { reference: fieldRegex },
      { email: fieldRegex },
      { email_lower: fieldRegex },
      { contact_number: fieldRegex },
    ];
  }

  return filter;
}

async function findBookingOrThrow(id: string): Promise<LeanBooking> {
  const bookingId = String(id ?? "").trim();
  if (!bookingId) {
    throw new AppError("Booking not found", 404);
  }

  const booking = await Booking.findById(bookingId).lean().exec();
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  return booking as LeanBooking;
}

/** GET /api/bookings — paginated list, newest first, searchable. */
export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = buildBookingFilter(req.query);

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Booking.countDocuments(filter).exec(),
  ]);

  const mapped = (bookings as LeanBooking[]).map(toApiBooking);
  const pages = Math.max(1, Math.ceil(total / limit) || 1);

  res.status(200).json({
    success: true,
    count: mapped.length,
    total,
    pages,
    currentPage: page,
    data: {
      bookings: mapped,
      pagination: {
        total,
        pages,
        currentPage: page,
        limit,
      },
    },
  });
});

/** GET /api/bookings/:id */
export const getBookingById = asyncHandler(
  async (req: Request, res: Response) => {
    const booking = await findBookingOrThrow(String(req.params.id ?? ""));

    res.status(200).json({
      success: true,
      data: { booking: toApiBooking(booking) },
    });
  }
);

/** POST /api/bookings */
export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = pickBookingPayload(body);

    if (!payload.name) {
      throw new AppError("Name is required", 400);
    }
    if (!payload.contact_number && !payload.email) {
      throw new AppError("Contact number or email is required", 400);
    }

    const customId = String(body._id ?? body.id ?? "").trim() || randomUUID();

    const booking = await Booking.create({
      _id: customId,
      ...payload,
      currency: payload.currency || "INR",
    });

    res.status(201).json({
      success: true,
      message: "Booking created",
      data: { booking: toApiBooking(booking.toObject() as LeanBooking) },
    });
  }
);

/** PUT /api/bookings/:id */
export const updateBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    await findBookingOrThrow(id);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = pickBookingPayload(body);
    const $set: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        $set[key] = value;
      }
    }

    if (Object.keys($set).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    if (!updated) {
      throw new AppError("Booking not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Booking updated",
      data: { booking: toApiBooking(updated as LeanBooking) },
    });
  }
);

/** DELETE /api/bookings/:id */
export const deleteBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    const deleted = await Booking.findByIdAndDelete(id).lean().exec();

    if (!deleted) {
      throw new AppError("Booking not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Booking deleted",
      data: { booking: toApiBooking(deleted as LeanBooking) },
    });
  }
);

export default {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
};
