import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getNotifications);
router.put("/read-all", requireAuth, markAllNotificationsRead);
router.put("/:id/read", requireAuth, markNotificationRead);

export default router;
