import { Router } from "express";
import {
  createBooking,
  deleteBooking,
  getBookingById,
  getBookings,
  updateBooking,
} from "../controllers/bookingController.js";
import {
  checkPermission,
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  checkPermission("Bookings", "view"),
  getBookings
);

router.post(
  "/",
  requireAuth,
  checkPermission("Bookings", "create"),
  createBooking
);

router.get(
  "/:id",
  requireAuth,
  checkPermission("Bookings", "view"),
  getBookingById
);

router.put(
  "/:id",
  requireAuth,
  checkPermission("Bookings", "edit"),
  updateBooking
);

router.delete(
  "/:id",
  requireAuth,
  checkPermission("Bookings", "delete"),
  deleteBooking
);

export default router;
