import axios from "axios";
import { api } from "@/services/api";

export interface ApiBooking {
  _id: string;
  id?: string;
  reference: string;
  status: string;
  payment_status: string;
  paymentStatus?: string;
  name: string;
  age?: number | null;
  gender?: string;
  contact_number: string;
  contactNumber?: string;
  email: string;
  email_lower?: string;
  city?: string;
  trip_package_slug?: string;
  package_title: string;
  packageTitle?: string;
  destination: string;
  travel_date: string;
  travelDate?: string;
  number_of_pax: number;
  numberOfPax?: number;
  currency?: string;
  price_per_person_inr?: number;
  total_amount_inr: number;
  totalAmountInr?: number;
  advance_amount_inr?: number;
  balance_amount_inr?: number;
  notes?: string;
  source?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount_captured_paise?: number;
  refunded_amount_paise?: number;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BookingPagination {
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

export interface BookingsResponse {
  success: boolean;
  count: number;
  total?: number;
  pages?: number;
  currentPage?: number;
  data: {
    bookings: ApiBooking[];
    pagination?: BookingPagination;
  };
}

export interface BookingMutationResponse {
  success: boolean;
  message?: string;
  data: { booking: ApiBooking };
}

export interface GetBookingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  paymentStatus?: string;
  destination?: string;
}

export const BOOKING_STATUS_OPTIONS = [
  "all",
  "completed",
  "confirmed",
  "pending",
  "cancelled",
  "refunded",
] as const;

export const BOOKING_PAYMENT_STATUS_OPTIONS = [
  "all",
  "captured",
  "pending",
  "failed",
  "refunded",
  "authorized",
] as const;

export function normalizeBooking(booking: ApiBooking): ApiBooking {
  return {
    ...booking,
    _id: booking._id || booking.id || "",
    reference: booking.reference ?? "",
    status: booking.status ?? "",
    payment_status: booking.payment_status || booking.paymentStatus || "",
    paymentStatus: booking.payment_status || booking.paymentStatus || "",
    name: booking.name ?? "",
    contact_number: booking.contact_number || booking.contactNumber || "",
    contactNumber: booking.contact_number || booking.contactNumber || "",
    email: booking.email ?? "",
    package_title: booking.package_title || booking.packageTitle || "",
    packageTitle: booking.package_title || booking.packageTitle || "",
    destination: booking.destination ?? "",
    travel_date: booking.travel_date || booking.travelDate || "",
    travelDate: booking.travel_date || booking.travelDate || "",
    number_of_pax: booking.number_of_pax ?? booking.numberOfPax ?? 1,
    numberOfPax: booking.number_of_pax ?? booking.numberOfPax ?? 1,
    total_amount_inr: booking.total_amount_inr ?? booking.totalAmountInr ?? 0,
    totalAmountInr: booking.total_amount_inr ?? booking.totalAmountInr ?? 0,
  };
}

export function formatInr(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatTravelDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getBookingErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function getBookings(
  params: GetBookingsParams = {}
): Promise<BookingsResponse> {
  const search = params.search?.trim().replace(/\s+/g, " ") || undefined;
  const paymentStatus =
    params.payment_status || params.paymentStatus || undefined;

  const { data } = await api.get<BookingsResponse>("/bookings", {
    params: {
      page: params.page,
      limit: params.limit,
      search,
      status: params.status === "all" ? undefined : params.status,
      payment_status:
        paymentStatus === "all" ? undefined : paymentStatus,
      destination: params.destination,
    },
  });

  const bookings = (data.data?.bookings ?? []).map(normalizeBooking);

  return {
    ...data,
    data: {
      ...data.data,
      bookings,
      pagination: data.data?.pagination,
    },
  };
}

export async function getBookingById(
  id: string
): Promise<BookingMutationResponse> {
  const { data } = await api.get<BookingMutationResponse>(`/bookings/${id}`);
  return {
    ...data,
    data: { booking: normalizeBooking(data.data.booking) },
  };
}

export default {
  getBookings,
  getBookingById,
};
