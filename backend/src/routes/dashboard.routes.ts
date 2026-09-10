import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import {
  checkPermission,
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  checkPermission("Dashboard", "view"),
  getDashboardSummary
);

export default router;
