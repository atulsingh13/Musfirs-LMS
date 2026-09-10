import { Router } from "express";
import { getLeadQuotation } from "../controllers/documentController.js";
import {
  addLeadNote,
  assignLead,
  bulkAssignLeads,
  bulkImportLeads,
  bulkUpdateLeadStatus,
  createLead,
  createLeadFromWebsite,
  deleteLead,
  getLeadActivities,
  getLeadById,
  getLeads,
  getLeadStats,
  updateLead,
  updateLeadStatus,
} from "../controllers/leadController.js";
import {
  checkPermission,
  requireAuth,
} from "../middleware/authMiddleware.js";
import { requireOwner } from "../middleware/requireOwner.js";
import { requireWebsiteApiKey } from "../middleware/requireWebsiteApiKey.js";
import { websiteLeadLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  checkPermission("Leads", "view"),
  getLeads
);

router.get(
  "/stats",
  requireAuth,
  checkPermission("Leads", "view"),
  getLeadStats
);

router.post(
  "/",
  requireAuth,
  checkPermission("Leads", "create"),
  createLead
);

router.post(
  "/website",
  websiteLeadLimiter,
  requireWebsiteApiKey,
  createLeadFromWebsite
);

router.put(
  "/bulk/status",
  requireAuth,
  checkPermission("Leads", "edit"),
  bulkUpdateLeadStatus
);

router.put(
  "/bulk/assign",
  ...requireOwner,
  bulkAssignLeads
);

router.post(
  "/bulk-import",
  requireAuth,
  checkPermission("Leads", "import"),
  bulkImportLeads
);

router.get(
  "/:id/activities",
  requireAuth,
  checkPermission("Leads", "view"),
  getLeadActivities
);

router.post(
  "/:id/notes",
  requireAuth,
  checkPermission("Leads", "edit"),
  addLeadNote
);

router.get(
  "/:id/quotation",
  requireAuth,
  checkPermission("Leads", "view"),
  getLeadQuotation
);

router.get(
  "/:id",
  requireAuth,
  checkPermission("Leads", "view"),
  getLeadById
);

router.put(
  "/:id",
  requireAuth,
  checkPermission("Leads", "edit"),
  updateLead
);

router.put(
  "/:id/status",
  requireAuth,
  checkPermission("Leads", "edit"),
  updateLeadStatus
);

router.put(
  "/:id/assign",
  ...requireOwner,
  assignLead
);

router.delete(
  "/:id",
  requireAuth,
  checkPermission("Leads", "delete"),
  deleteLead
);

export default router;
