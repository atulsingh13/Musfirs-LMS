import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import calendarRoutes from "./calendar.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import leadRoutes from "./lead.routes.js";
import bookingRoutes from "./booking.routes.js";
import notificationRoutes from "./notification.routes.js";
import searchRoutes from "./search.routes.js";
import webhookRoutes from "./webhook.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/calendar", calendarRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/leads", leadRoutes);
router.use("/bookings", bookingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/search", searchRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
