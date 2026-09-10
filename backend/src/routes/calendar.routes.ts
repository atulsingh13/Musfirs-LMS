import { Router } from "express";
import {
  completeTask,
  createEvent,
  createTask,
  deleteEvent,
  getAllCalendarItems,
  getEvents,
  updateEvent,
} from "../controllers/calendarController.js";
import {
  checkPermission,
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/all",
  requireAuth,
  checkPermission("Calendar", "view"),
  getAllCalendarItems
);

router.get(
  "/events",
  requireAuth,
  checkPermission("Calendar", "view"),
  getEvents
);

router.post(
  "/events",
  requireAuth,
  checkPermission("Calendar", "create"),
  createEvent
);

router.put(
  "/events/:id",
  requireAuth,
  checkPermission("Calendar", "edit"),
  updateEvent
);

router.delete(
  "/events/:id",
  requireAuth,
  checkPermission("Calendar", "delete"),
  deleteEvent
);

router.post(
  "/tasks",
  requireAuth,
  checkPermission("Calendar", "create"),
  createTask
);

router.put(
  "/tasks/:id/complete",
  requireAuth,
  checkPermission("Calendar", "edit"),
  completeTask
);

export default router;
