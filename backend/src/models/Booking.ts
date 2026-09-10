import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

/**
 * Existing website/checkout `bookings` collection.
 * Documents use string UUID `_id` and snake_case timestamps.
 */
export interface IBooking {
  _id: string;
  reference?: string;
  status?: string;
  payment_status?: string;
  name?: string;
  age?: number;
  gender?: string;
  contact_number?: string;
  email?: string;
  email_lower?: string;
  city?: string;
  trip_package_slug?: string;
  package_title?: string;
  destination?: string;
  /** Stored as string in the legacy collection (ISO / display date). */
  travel_date?: string;
  number_of_pax?: number;
  currency?: string;
  price_per_person_inr?: number;
  total_amount_inr?: number;
  advance_amount_inr?: number;
  balance_amount_inr?: number;
  notes?: string;
  source?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  idempotency_key?: string;
  request_fingerprint?: string;
  amount_captured_paise?: number;
  refunded_amount_paise?: number;
  confirmed_at?: Date | null;
  cancelled_at?: Date | null;
  reconciled_at?: Date | null;
  fulfilled_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    _id: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      trim: true,
      index: true,
    },
    payment_status: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      trim: true,
    },
    contact_number: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    email_lower: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    city: {
      type: String,
      trim: true,
    },
    trip_package_slug: {
      type: String,
      trim: true,
    },
    package_title: {
      type: String,
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
      index: true,
    },
    travel_date: {
      type: String,
      trim: true,
    },
    number_of_pax: {
      type: Number,
      min: 1,
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
    },
    price_per_person_inr: {
      type: Number,
      min: 0,
    },
    total_amount_inr: {
      type: Number,
      min: 0,
    },
    advance_amount_inr: {
      type: Number,
      min: 0,
    },
    balance_amount_inr: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      trim: true,
    },
    razorpay_order_id: {
      type: String,
      trim: true,
      index: true,
    },
    razorpay_payment_id: {
      type: String,
      trim: true,
    },
    idempotency_key: {
      type: String,
      trim: true,
    },
    request_fingerprint: {
      type: String,
      trim: true,
    },
    amount_captured_paise: {
      type: Number,
      min: 0,
    },
    refunded_amount_paise: {
      type: Number,
      min: 0,
      default: 0,
    },
    confirmed_at: {
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    reconciled_at: {
      type: Date,
      default: null,
    },
    fulfilled_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "bookings",
    versionKey: false,
    // Legacy collection uses snake_case timestamp fields
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

bookingSchema.index({ created_at: -1 });
bookingSchema.index({ status: 1, created_at: -1 });
bookingSchema.index({ payment_status: 1, created_at: -1 });
bookingSchema.index({
  name: "text",
  email: "text",
  contact_number: "text",
  reference: "text",
  destination: "text",
  package_title: "text",
});

export type BookingDocument = HydratedDocument<IBooking>;
export type BookingModel = Model<IBooking>;

export const Booking: BookingModel =
  (mongoose.models.Booking as BookingModel | undefined) ??
  mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
